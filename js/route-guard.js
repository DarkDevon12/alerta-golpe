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
 * Exige login: se não houver usuário, redireciona para login.html.
 * @returns {Promise<import("firebase/auth").User | null>}
 */
export async function protegerRota() {
  const user = await obterUsuarioAtual();
  if (!user) window.location.replace("login.html");
  return user;
}
