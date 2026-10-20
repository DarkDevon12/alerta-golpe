import {
  auth,
  signInWithEmailAndPassword
} from "./firebase.js";
import { sincronizarRanking } from "./usuarios.js";

async function fazerLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Preencha todos os campos");
    return;
  }

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, senha);

    // Contas criadas antes do ranking público passam a aparecer nele
    await sincronizarRanking(user.uid).catch((e) => console.warn("Ranking:", e.message));

    window.location.href = "index.html";

  } catch (error) {
    console.error("Erro ao fazer login:", error.code);

    // Desde o Firebase v10 email inexistente e senha errada
    // retornam o mesmo código (auth/invalid-credential)
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      alert("Email ou senha incorretos.");
    } else if (error.code === "auth/invalid-email") {
      alert("Email inválido.");
    } else if (error.code === "auth/too-many-requests") {
      alert("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    } else {
      alert("Erro ao fazer login: " + error.message);
    }
  }
}

document.getElementById("form-login").addEventListener("submit", fazerLogin);
