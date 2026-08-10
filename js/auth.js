import { 
  auth, 
  signInWithEmailAndPassword 
} from "./firebase.js";

async function fazerLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Preencha todos os campos");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    
    // Login bem-sucedido
    console.log("Usuário logado:", userCredential.user.uid);
    
    // Redireciona para o dashboard
    window.location.href = "index.html";

  } catch (error) {
    console.error("Erro ao fazer login:", error.code);
    
    if (error.code === "auth/user-not-found") {
      alert("Email não encontrado. Crie uma conta.");
    } else if (error.code === "auth/wrong-password") {
      alert("Senha incorreta.");
    } else if (error.code === "auth/invalid-email") {
      alert("Email inválido.");
    } else {
      alert("Erro ao fazer login: " + error.message);
    }
  }
}

document.getElementById("form-login").addEventListener("submit", fazerLogin);
