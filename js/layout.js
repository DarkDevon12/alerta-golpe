// Comportamento comum das páginas logadas: exige login, liga o botão
// "Sair" e mostra o nome do usuário na barra de navegação.
import { auth, signOut } from "./firebase.js";
import { protegerRota } from "./route-guard.js";

export const usuarioPronto = protegerRota();

usuarioPronto.then((user) => {
  if (!user) return;
  const nomeEl = document.getElementById("nav-usuario");
  if (nomeEl) nomeEl.textContent = user.displayName || user.email || "";
});

document.getElementById("btn-sair")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    alert("Erro ao sair: " + error.message);
  }
});
