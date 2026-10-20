// Dados de usuário ficam em duas coleções:
//   usuarios/{uid} — privado (CPF, email…), só o próprio dono lê
//   ranking/{uid}  — público para usuários logados (nome, xp, denuncias)
// Assim o ranking não precisa baixar CPF e email de todo mundo.
import { db, doc, getDoc, setDoc, writeBatch } from "./firebase.js";

export const XP_POR_DENUNCIA = 3;

export async function criarPerfil(uid, dadosPrivados) {
  const batch = writeBatch(db);
  batch.set(doc(db, "usuarios", uid), {
    ...dadosPrivados,
    xp: 0,
    denuncias: 0,
    cuponsGanhos: [],
    dataCriacaoConta: new Date(),
    uid
  });
  batch.set(doc(db, "ranking", uid), {
    nome: dadosPrivados.nome,
    xp: 0,
    denuncias: 0
  });
  await batch.commit();
}

export async function obterPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Garante que o usuário tem entrada em ranking/{uid}
 * (contas criadas antes dessa coleção existir).
 */
export async function sincronizarRanking(uid) {
  const rankingSnap = await getDoc(doc(db, "ranking", uid));
  if (rankingSnap.exists()) return rankingSnap.data();

  const perfil = await obterPerfil(uid);
  if (!perfil) return null;

  const entrada = {
    nome: perfil.nome || "Usuário",
    xp: perfil.xp || 0,
    denuncias: perfil.denuncias || 0
  };
  await setDoc(doc(db, "ranking", uid), entrada);
  return entrada;
}
