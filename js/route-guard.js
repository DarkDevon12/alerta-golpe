import { auth, onAuthStateChanged } from "./firebase.js";

/**
 * Espera o Firebase resolver a sessão e devolve o usuário (ou null).
 * Cancela o listener depois da primeira resposta.
 */
export function obterUsuarioAtual() {
  return new Promise((resolve) => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      cancelar();
      resolve(user);
    });
  });
}

/**
 * Visitante = sem sessão, com a sessão anônima usada na consulta grátis
 * ou com uma conta que ainda não confirmou o email.
 */
export function ehVisitante(user) {
  return !user || user.isAnonymous || !user.emailVerified;
}

/**
 * Exige login com conta de verdade e email confirmado. Sem isso,
 * redireciona para login.html (que mostra o aviso de confirmar o email).
 * @returns {Promise<import("firebase/auth").User | null>}
 */
export async function protegerRota() {
  const user = await obterUsuarioAtual();
  if (ehVisitante(user)) {
    window.location.replace("login.html");
    return null;
  }
  return user;
}
