import { auth, onAuthStateChanged } from "./firebase.js";

/**
 * Verifica se o usuário está autenticado
 * Se não estiver, redireciona para login
 * Deve ser importado nos arquivos que exigem autenticação
 */
export function protegerRota() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Não está logado, redireciona
        window.location.href = "login.html";
        resolve(null);
      } else {
        // Está logado, retorna o usuário
        resolve(user);
      }
    });
  });
}

/**
 * Retorna o usuário logado atualmente
 */
export function obterUsuarioAtual() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(user);
    });
  });
}
