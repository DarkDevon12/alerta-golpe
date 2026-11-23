// Dados de usuário ficam em duas coleções:
//   usuarios/{uid} — privado (nome real, email, aceite dos termos…), só o dono lê.
//                    NÃO guarda CPF: ele vira só um HMAC em cpfs/{hash}, gravado
//                    pelo servidor (/api/registrar-cpf).
//   ranking/{uid}  — perfil público para usuários logados: apelido, xp,
//                    denuncias, moedas, itens comprados e o que está em uso
//                    (avatar, borda, tema). Sem nome real, email ou CPF.
// As moedas e o XP ficam no ranking porque lá as regras validam cada mudança.
import { db, doc, getDoc, setDoc, writeBatch, serverTimestamp } from "./firebase.js";
import { PERFIL_PADRAO } from "./personalizacao.js";

export const XP_POR_DENUNCIA = 3;
export const TAMANHO_MAX_NOME = 60;

// Versão do texto dos Termos/Política aceito pela pessoa (mude junto com a
// data de "Última atualização" das páginas termos.html e privacidade.html)
export const VERSAO_TERMOS = "2026-11";

const RANKING_NOVO = { apelido: "", anonimo: false, xp: 0, denuncias: 0, moedas: 0, ...PERFIL_PADRAO };

// Cria os dois documentos do usuário, registrando o aceite dos termos
export async function criarPerfil(uid, { nome, email, loginGoogle = false }) {
  const batch = writeBatch(db);
  batch.set(doc(db, "usuarios", uid), {
    uid,
    nome: String(nome || "Usuário").slice(0, TAMANHO_MAX_NOME),
    email,
    dataCriacaoConta: serverTimestamp(),
    aceiteTermosEm: serverTimestamp(),
    versaoTermos: VERSAO_TERMOS,
    ...(loginGoogle ? { loginGoogle: true } : {})
  });
  batch.set(doc(db, "ranking", uid), { ...RANKING_NOVO });
  await batch.commit();
}

export async function obterPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data() : null;
}

export async function obterPerfilPublico(uid) {
  const snap = await getDoc(doc(db, "ranking", uid));
  return snap.exists() ? { ...snap.data(), uid } : null;
}

/**
 * Garante que o usuário tem um perfil público em ranking/{uid} e o devolve
 * (com o `uid`): contas criadas antes dessa coleção ganham a entrada zerada.
 * Entradas antigas (com nome real) são convertidas pelo script
 * scripts/migrar-lgpd.mjs.
 */
export async function sincronizarRanking(uid) {
  const ref = doc(db, "ranking", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { ...snap.data(), uid };

  if (!(await obterPerfil(uid))) return null;

  await setDoc(ref, { ...RANKING_NOVO });
  return { ...RANKING_NOVO, uid };
}
