import { 
  auth, 
  db,
  signInWithPopup, 
  googleProvider,
  setDoc,
  doc,
  getDoc
} from "./firebase.js";

console.log("✅ auth-google.js carregado");
console.log("Auth disponível:", !!auth);
console.log("GoogleProvider disponível:", !!googleProvider);

async function fazerLoginGoogle() {
  console.log("🔵 Botão Google clicado");
  
  try {
    console.log("📱 Abrindo popup do Google...");
    
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    console.log("✅ Login Google bem-sucedido:", user.uid);
    console.log("Nome:", user.displayName);
    console.log("Email:", user.email);

    // Verifica se o usuário já existe no Firestore
    const usuarioDoc = await getDoc(doc(db, "usuarios", user.uid));

    if (!usuarioDoc.exists()) {
      console.log("👤 Novo usuário, criando no Firestore...");
      
      // Primeiro login com Google - cria o usuário no Firestore
      await setDoc(doc(db, "usuarios", user.uid), {
        nome: user.displayName || "Usuário Google",
        email: user.email,
        cpf: "", // Usuário pode preencher depois
        xp: 0,
        cuponsGanhos: [],
        dataCriacaoConta: new Date(),
        uid: user.uid,
        loginGoogle: true
      });

      console.log("✅ Usuário criado no Firestore");
    } else {
      console.log("✅ Usuário já existe no Firestore");
    }

    // Login bem-sucedido
    alert("Login com Google realizado com sucesso!");
    window.location.href = "index.html";

  } catch (error) {
    console.error("❌ Erro ao fazer login com Google:", error);
    console.error("Código do erro:", error.code);
    console.error("Mensagem:", error.message);

    if (error.code === "auth/popup-closed-by-user") {
      alert("Login cancelado por você");
    } else if (error.code === "auth/popup-blocked") {
      alert("Pop-up foi bloqueado. Verifique as configurações do navegador.");
    } else if (error.code === "auth/operation-not-supported-in-this-environment") {
      alert("Erro: Aplicação não está em ambiente seguro (HTTPS). Use http://localhost para testes.");
    } else {
      alert("Erro ao fazer login com Google: " + error.message);
    }
  }
}

// Espera o DOM carregar
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM carregado");
  
  const btnGoogle = document.getElementById("btn-google");
  
  if (btnGoogle) {
    console.log("✅ Botão Google encontrado, adicionando listener...");
    btnGoogle.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("🖱️ Clique detectado no botão Google");
      fazerLoginGoogle();
    });
  } else {
    console.error("❌ Botão Google NÃO encontrado na página");
    console.log("Elementos com ID 'btn-google':", document.querySelectorAll("#btn-google"));
  }
});

// Se o DOM já estiver carregado quando o script é importado
if (document.readyState === "loading") {
  console.log("📄 DOM ainda carregando...");
} else {
  console.log("📄 DOM já estava carregado, verificando botão...");
  const btnGoogle = document.getElementById("btn-google");
  if (btnGoogle) {
    console.log("✅ Botão Google encontrado após DOM");
    btnGoogle.addEventListener("click", (e) => {
      e.preventDefault();
      fazerLoginGoogle();
    });
  }
}
