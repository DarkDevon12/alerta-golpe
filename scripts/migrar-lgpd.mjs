// Migração LGPD — rode UMA vez, depois de publicar as novas regras e antes
// de abrir o site novo para os usuários.
//
//   node --env-file=.env scripts/migrar-lgpd.mjs            (simulação: só mostra o que faria)
//   node --env-file=.env scripts/migrar-lgpd.mjs --aplicar  (grava as mudanças)
//
// Precisa no .env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY e CPF_PEPPER
// (o mesmo valor que estará na Vercel; se for diferente, os CPFs não vão bater).
//
// O que faz:
//  1. usuarios: converte o CPF em texto puro para o HMAC em cpfs/{hmac} e apaga o campo
//     `cpf` (e os campos xp/denuncias/cuponsGanhos, que agora vivem só no ranking).
//  2. ranking: apaga o nome real (`nome`) e `perfilPublico`, cria `apelido` e `anonimo`,
//     e completa entradas anteriores à loja.
//  3. denuncias: cria o relato público anônimo (coleção relatos) de cada denúncia, liga os
//     dois por `relatoId` e apaga `usuario_nome` da denúncia privada.
// É seguro rodar de novo: o que já foi migrado é pulado.
import { FieldValue } from "firebase-admin/firestore";
import { obterAdmin } from "../server/admin.js";
import { hmacCpf } from "../server/registrar-cpf.js";
import { validarCPF, somenteDigitos } from "../js/cpf.js";
import { chaveAlvo, valorPublico } from "../js/alvos.js";

const aplicar = process.argv.includes("--aplicar");
const { db } = obterAdmin(process.env);

if (!process.env.CPF_PEPPER || process.env.CPF_PEPPER.length < 16) {
  console.error("CPF_PEPPER ausente ou curto demais (mínimo 16 caracteres).");
  process.exit(1);
}

const resumo = {
  cpfConvertidos: 0, cpfInvalidos: 0, cpfDuplicados: [],
  usuariosLimpos: 0, rankingAjustados: 0, denunciasMigradas: 0, denunciasIgnoradas: 0
};

// Grava em lotes de até 400 operações
const operacoes = [];
const agendar = (fn) => operacoes.push(fn);

async function executar() {
  if (!aplicar) return;
  for (let i = 0; i < operacoes.length; i += 400) {
    const lote = db.batch();
    operacoes.slice(i, i + 400).forEach((fn) => fn(lote));
    await lote.commit();
  }
}

// ── 1. usuarios ───────────────────────────────────────────
const usuarios = await db.collection("usuarios").get();
for (const d of usuarios.docs) {
  const dados = d.data();
  const remover = {};
  for (const campo of ["cpf", "xp", "denuncias", "cuponsGanhos"]) {
    if (campo in dados) remover[campo] = FieldValue.delete();
  }
  if (!Object.keys(remover).length) continue;

  const cpf = somenteDigitos(dados.cpf);
  if (cpf) {
    if (!validarCPF(cpf)) {
      resumo.cpfInvalidos++;
      console.warn(`CPF inválido em usuarios/${d.id} (campo apagado, sem registro em cpfs)`);
    } else {
      const ref = db.collection("cpfs").doc(hmacCpf(cpf, process.env.CPF_PEPPER));
      const existente = await ref.get();
      if (existente.exists && existente.data().uid !== d.id) {
        resumo.cpfDuplicados.push({ uid: d.id, jaRegistradoPara: existente.data().uid });
      } else if (!existente.exists) {
        agendar((lote) => lote.set(ref, { uid: d.id, criadoEm: new Date() }));
        resumo.cpfConvertidos++;
      }
    }
  }

  agendar((lote) => lote.update(d.ref, remover));
  resumo.usuariosLimpos++;
}

// ── 2. ranking ────────────────────────────────────────────
const ranking = await db.collection("ranking").get();
for (const d of ranking.docs) {
  const dados = d.data();
  const mudar = {};

  if ("nome" in dados) mudar.nome = FieldValue.delete();
  if ("perfilPublico" in dados) mudar.perfilPublico = FieldValue.delete();
  if (!("apelido" in dados)) mudar.apelido = "";
  if (!("anonimo" in dados)) mudar.anonimo = false;
  if (!("moedas" in dados)) {
    mudar.moedas = (dados.denuncias || 0) * 10;
    mudar.itens = [];
    mudar.avatar = "iniciais";
    mudar.borda = "sem-borda";
    mudar.tema = "escuro";
  }

  if (!Object.keys(mudar).length) continue;
  agendar((lote) => lote.update(d.ref, mudar));
  resumo.rankingAjustados++;
}

// ── 3. denuncias → relatos públicos anônimos ──────────────
const denuncias = await db.collection("denuncias").get();
for (const d of denuncias.docs) {
  const dados = d.data();
  if (dados.relatoId) {
    // já migrada; só garante que o nome saiu
    if ("usuario_nome" in dados) agendar((lote) => lote.update(d.ref, { usuario_nome: FieldValue.delete() }));
    continue;
  }

  const tipo = dados.tipo || (dados.telefone ? "telefone" : dados.link ? "link" : dados.email ? "email" : null);
  const original = tipo ? dados[tipo] : null;
  const chave = dados.chave || (tipo && original ? chaveAlvo(tipo, original) : null);
  if (!tipo || !chave || typeof dados.descricao !== "string") {
    resumo.denunciasIgnoradas++;
    console.warn(`denuncias/${d.id} ignorada (sem tipo/alvo/descrição válidos)`);
    continue;
  }

  const relato = db.collection("relatos").doc();
  agendar((lote) => lote.set(relato, {
    tipo,
    valor: valorPublico(tipo, original) || chave,
    chave,
    descricao: dados.descricao,
    data: dados.data || new Date()
  }));
  agendar((lote) => lote.update(d.ref, {
    tipo,
    chave,
    relatoId: relato.id,
    usuario_nome: FieldValue.delete()
  }));
  resumo.denunciasMigradas++;
}

await executar();

console.log(aplicar ? "\nMigração APLICADA." : "\nSIMULAÇÃO (nada foi gravado). Use --aplicar para gravar.");
console.log(JSON.stringify(resumo, null, 2));
if (resumo.cpfDuplicados.length) {
  console.log("\nCPFs repetidos entre contas (a segunda conta ficou sem registro de CPF):", resumo.cpfDuplicados);
}
