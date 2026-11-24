// Gestão dos cupons da loja Dr. Filamento (para o dono da loja).
//
//   node --env-file=.env scripts/cupom.mjs consultar DRF-ABCD-2345
//   node --env-file=.env scripts/cupom.mjs baixar    DRF-ABCD-2345
//   node --env-file=.env scripts/cupom.mjs listar [ativo|usado]
//
// Fluxo: o cliente manda o código no WhatsApp → você roda "consultar" para ver
// se é válido (e qual desconto vale) → aplica o desconto na venda → "baixar"
// marca o cupom como usado, e ele não vale mais. Precisa no .env as variáveis
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.
import { obterAdmin } from "../server/admin.js";

const [comando, argumento] = process.argv.slice(2);
const { db } = obterAdmin(process.env);

const data = (d) => (d?.toDate ? d.toDate().toLocaleString("pt-BR") : "—");

function descrever(c) {
  const limite = c.limiteDesconto ? ` (desconto máximo R$ ${c.limiteDesconto})` : " (em qualquer peça)";
  return [
    `Código:   ${c.codigo}`,
    `Desconto: ${c.percentual}%${limite}`,
    `Situação: ${c.status === "ativo" ? "ATIVO — pode usar" : "JÁ USADO em " + data(c.usadoEm)}`,
    `Emitido:  ${data(c.criadoEm)}`
  ].join("\n");
}

const normalizar = (s) => String(s || "").trim().toUpperCase();

if (comando === "consultar" || comando === "baixar") {
  const codigo = normalizar(argumento);
  if (!codigo) { console.error("Informe o código."); process.exit(1); }
  const ref = db.collection("cupons").doc(codigo);

  if (comando === "consultar") {
    const snap = await ref.get();
    if (!snap.exists) { console.error("Cupom NÃO encontrado (código inválido)."); process.exit(1); }
    console.log(descrever(snap.data()));
  } else {
    // Transação: dois "baixar" ao mesmo tempo não conseguem usar o cupom duas vezes
    const resultado = await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) return { erro: "Cupom NÃO encontrado (código inválido)." };
      if (snap.data().status !== "ativo") return { erro: "Este cupom já foi usado.\n" + descrever(snap.data()) };
      t.update(ref, { status: "usado", usadoEm: new Date() });
      return { ok: snap.data() };
    });
    if (resultado.erro) { console.error(resultado.erro); process.exit(1); }
    console.log("Baixa feita. Cupom usado:\n" + descrever({ ...resultado.ok, status: "usado", usadoEm: { toDate: () => new Date() } }));
  }
} else if (comando === "listar") {
  let consulta = db.collection("cupons");
  if (argumento) consulta = consulta.where("status", "==", argumento);
  const snap = await consulta.get();
  const cupons = snap.docs.map((d) => d.data()).sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis());
  if (!cupons.length) console.log("Nenhum cupom.");
  for (const c of cupons) console.log(`${c.codigo}  ${String(c.percentual).padStart(2)}%  ${c.status.padEnd(5)}  emitido ${data(c.criadoEm)}`);
} else {
  console.error("Uso: cupom.mjs consultar|baixar CODIGO   ou   cupom.mjs listar [ativo|usado]");
  process.exit(1);
}
