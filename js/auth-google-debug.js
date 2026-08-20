import { 
  auth, 
  db,
  signInWithPopup, 
  googleProvider,
  setDoc,
  doc,
  getDoc
} from "./firebase.js";

async function fazerLoginGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Verifica se o usuário já existe
    const usuarioDoc = await getDoc(doc(db, "usuarios", user.uid));

    if (!usuarioDoc.exists()) {
      await setDoc(doc(db, "usuarios", user.uid), {
        nome: user.displayName || "Usuário",
        email: user.email,
        cpf: "",
        xp: 0,
        cuponsGanhos: [],
        dataCriacaoConta: new Date(),
        uid: user.uid,
        loginGoogle: true
      });
    }

    window.location.href = "index.html";

  } catch (error) {
    // Ignora erros de popup fechado (não são erros reais)
    if (
      error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      return;
    }

    // Mostra apenas erros reais
    if (error.code === "auth/popup-blocked") {
      alert(
        "Pop-ups estão bloqueados.\n\n" +
        "Desbloqueia: Clica no 🔒 na barra de endereço"
      );
      
    } else if (error.code === "auth/unauthorized-domain") {
      alert(
        "Domínio não autorizado.\n\n" +
        "Firebase Console → Authentication → Settings → Authorized domains → Adicione 127.0.0.1"
      );
      
    } else if (error.code === "auth/operation-not-supported-in-this-environment") {
      alert("Use HTTPS ou http://localhost para testes");
      
    } else if (error.message) {
      alert("Erro: " + error.message);
    }
  }
}

// Conecta o botão quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Para CADASTRO: sempre mostra seletor de contas
      if (window.location.pathname.includes("cadastro")) {
        googleProvider.setCustomParameters({
          prompt: 'select_account'
        });
      }
      
      fazerLoginGoogle();
    });
  }
});

// Fallback se o DOM já estiver carregado
if (document.readyState !== "loading") {
  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Para CADASTRO: sempre mostra seletor de contas
      if (window.location.pathname.includes("cadastro")) {
        googleProvider.setCustomParameters({
          prompt: 'select_account'
        });
      }
      
      fazerLoginGoogle();
    });
  }
}