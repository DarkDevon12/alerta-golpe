// Dados de usuário ficam em duas coleções:
//   usuarios/{uid} — privado (CPF, email…), só o próprio dono lê
//   ranking/{uid}  — perfil público para usuários logados: nome, xp,
//                    denuncias, moedas, itens comprados e o que está em uso
//                    (avatar, borda, tema, perfilPublico)
// Assim o ranking não precisa baixar CPF e email de todo mundo.
// As moedas ficam no ranking porque lá as regras validam cada mudança;
// em usuarios/{uid} o dono pode escrever qualquer coisa.
import { db, doc, getDoc, setDoc, updateDoc, writeBatch } from "./firebase.js";
import { PERFIL_PADRAO, MOEDAS_POR_DENUNCIA } from "./personalizacao.js";

export const XP_POR_DENUNCIA = 3;
export const TAMANHO_MAX_NOME = 60;

export async function criarPerfil(uid, dadosPrivados) {
  const nome = String(dadosPrivados.nome || "Usuário").slice(0, TAMANHO_MAX_NOME);

  const batch = writeBatch(db);
  batch.set(doc(db, "usuarios", uid), {
    ...dadosPrivados,
    nome,
    xp: 0,
    denuncias: 0,
    cuponsGanhos: [],
    dataCriacaoConta: new Date(),
    uid
  });
  batch.set(doc(db, "ranking", uid), {
    nome,
    xp: 0,
    denuncias: 0,
    moedas: 0,
    ...PERFIL_PADRAO
  });
  await batch.commit();
}

export async function obterPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data() : null;
}

export async function obterPerfilPublico(uid) {
  const snap = await getDoc(doc(db, "ranking", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Garante que o usuário tem um perfil público completo em ranking/{uid}
 * e o devolve:
 *  - contas criadas antes dessa coleção ganham a entrada (zerada);
 *  - entradas anteriores à loja ganham os campos novos e
 *    10 moedas por denúncia já feita.
 */
export async function sincronizarRanking(uid) {
  const ref = doc(db, "ranking", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const dados = snap.data();
    if ("moedas" in dados) return dados;

    const migracao = { moedas: (dados.denuncias || 0) * MOEDAS_POR_DENUNCIA, ...PERFIL_PADRAO };
    await updateDoc(ref, migracao);
    return { ...dados, ...migracao };
  }

  const perfil = await obterPerfil(uid);
  if (!perfil) return null;

  const entrada = {
    nome: String(perfil.nome || "Usuário").slice(0, TAMANHO_MAX_NOME),
    xp: 0,
    denuncias: 0,
    moedas: 0,
    ...PERFIL_PADRAO
  };
  await setDoc(ref, entrada);
  return entrada;
}
