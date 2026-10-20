import { auth, signInWithPopup, googleProvider } from "./firebase.js";
import { criarPerfil, obterPerfil, sincronizarRanking } from "./usuarios.js";

async function fazerLoginGoogle() {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);

    // Primeiro acesso: cria o perfil; contas antigas: garante entrada no ranking
    if (await obterPerfil(user.uid)) {
      await sincronizarRanking(user.uid);
    } else {
      await criarPerfil(user.uid, {
        nome: user.displayName || "Usuário",
        email: user.email,
        cpf: "",
        loginGoogle: true
      });
    }

    window.location.href = "index.html";

  } catch (error) {
    // Popup fechado pelo usuário não é erro
    if (
      error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      return;
    }

    if (error.code === "auth/popup-blocked") {
      alert("Pop-ups estão bloqueados. Libere pelo ícone na barra de endereço.");
    } else if (error.code === "auth/unauthorized-domain") {
      alert(
        "Domínio não autorizado.\n\n" +
        "Firebase Console → Authentication → Settings → Authorized domains → adicione localhost"
      );
    } else if (error.code === "auth/operation-not-supported-in-this-environment") {
      alert("Use HTTPS ou http://localhost para testes");
    } else {
      alert("Erro: " + error.message);
    }
  }
}

// Módulos rodam depois do HTML ser lido, então o botão já existe aqui.
document.getElementById("btn-google")?.addEventListener("click", (e) => {
  e.preventDefault();

  // No cadastro, sempre mostra o seletor de contas
  if (window.location.pathname.includes("cadastro")) {
    googleProvider.setCustomParameters({ prompt: "select_account" });
  }

  fazerLoginGoogle();
});
