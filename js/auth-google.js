import { auth, signInWithPopup, signOut, googleProvider } from "./firebase.js";
import { criarPerfil, obterPerfil, sincronizarRanking } from "./usuarios.js";

// Primeiro acesso com Google: pede o aceite dos Termos e da Política antes
// de criar qualquer dado. Resolve true (aceitou) ou false (recusou).
function pedirAceite() {
  return new Promise((resolve) => {
    const fundo = document.createElement("div");
    fundo.className = "modal-fundo";
    fundo.innerHTML = `
      <div class="modal card" role="dialog" aria-modal="true" aria-labelledby="modal-aceite-titulo">
        <h2 id="modal-aceite-titulo">Antes de criar sua conta</h2>
        <p>Para usar o AlertaGolpe com sua conta Google, precisamos do seu aceite. Vamos guardar seu nome e email e o que você fizer no site (denúncias, XP e moedas).</p>
        <label class="aceite-termos">
          <input type="checkbox" id="aceite-google">
          <span>Li e aceito os <a href="termos.html" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</span>
        </label>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="aceite-recusar">Recusar</button>
          <button type="button" class="btn btn-primary" id="aceite-ok" disabled>Aceitar e continuar</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);

    const marcar = fundo.querySelector("#aceite-google");
    const ok = fundo.querySelector("#aceite-ok");
    const fechar = (resposta) => { fundo.remove(); resolve(resposta); };

    marcar.addEventListener("change", () => { ok.disabled = !marcar.checked; });
    ok.addEventListener("click", () => fechar(true));
    fundo.querySelector("#aceite-recusar").addEventListener("click", () => fechar(false));
  });
}

async function fazerLoginGoogle() {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);

    // Primeiro acesso: cria o perfil; contas antigas: garante entrada no ranking.
    // Falha no ranking não impede o login (as páginas tentam de novo depois)
    if (await obterPerfil(user.uid)) {
      await sincronizarRanking(user.uid).catch((e) => console.warn("Ranking:", e.message));
    } else {
      if (!(await pedirAceite())) {
        // Recusou: não fica conta nem dado nenhum
        await user.delete().catch((e) => console.warn("Remover conta:", e.code));
        await signOut(auth).catch(() => {});
        return;
      }
      await criarPerfil(user.uid, {
        nome: (user.displayName || "").trim().length >= 2 ? user.displayName.trim() : "Usuário",
        email: user.email,
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
        "Firebase Console → Authentication → Settings → Authorized domains → adicione " + window.location.hostname
      );
    } else if (error.code === "auth/operation-not-supported-in-this-environment") {
      alert("Use HTTPS ou http://localhost para testes");
    } else if (error.code === "permission-denied") {
      console.error("Erro ao criar perfil:", error);
      alert("Não foi possível criar seu perfil. Publique o firestore.rules atualizado no Firebase Console (Firestore → Regras).");
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
