import {
  auth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "./firebase.js";
import { sincronizarRanking } from "./usuarios.js";
import { ativarOlhoSenha } from "./olho-senha.js";
import { obterUsuarioAtual } from "./route-guard.js";
import { enviarEmailVerificacao } from "./verificacao-email.js";

ativarOlhoSenha();

// Um painel visível por vez: login, recuperar senha ou confirmar email
const paineis = {
  login: document.getElementById("painel-login"),
  recuperar: document.getElementById("painel-recuperar"),
  verificar: document.getElementById("painel-verificar")
};

function mostrarPainel(nome) {
  Object.entries(paineis).forEach(([chave, painel]) => { painel.hidden = chave !== nome; });
}

async function entrarNoSite(user) {
  // Contas criadas antes do ranking público passam a aparecer nele
  await sincronizarRanking(user.uid).catch((e) => console.warn("Ranking:", e.message));
  window.location.href = "index.html";
}

// Visitante que já usou a consulta grátis chega aqui com ?aviso=limite
if (new URLSearchParams(window.location.search).get("aviso") === "limite") {
  document.getElementById("aviso-login").hidden = false;
}

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

    if (!user.emailVerified) {
      mostrarVerificacao(user);
      return;
    }

    await entrarNoSite(user);

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

// ── Esqueceu a senha ─────────────────────────────────────

const emailRecuperar = document.getElementById("email-recuperar");
const msgRecuperar = document.getElementById("msg-recuperar");
const btnEnviarLink = document.getElementById("btn-enviar-link");

function mostrarRecuperacao(mostrar) {
  mostrarPainel(mostrar ? "recuperar" : "login");
  msgRecuperar.hidden = true;

  if (mostrar) {
    // Aproveita o email já digitado no login
    emailRecuperar.value = document.getElementById("email").value.trim();
    emailRecuperar.focus();
  } else {
    document.getElementById("email").focus();
  }
}

function mensagemRecuperar(texto, tipo) {
  msgRecuperar.textContent = texto;
  msgRecuperar.className = `auth-msg ${tipo}`;
  msgRecuperar.hidden = false;
}

async function enviarLinkRecuperacao(event) {
  event.preventDefault();

  const email = emailRecuperar.value.trim();
  if (!email || !emailRecuperar.checkValidity()) {
    mensagemRecuperar("Digite um email válido.", "erro");
    emailRecuperar.focus();
    return;
  }

  btnEnviarLink.disabled = true;
  try {
    await sendPasswordResetEmail(auth, email);

    // O Firebase não revela se o email tem conta (proteção contra
    // enumeração), então a mensagem é a mesma nos dois casos
    mensagemRecuperar(
      "Se existir uma conta com esse email, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.",
      "sucesso"
    );
  } catch (error) {
    console.error("Erro ao enviar link:", error.code);

    if (error.code === "auth/invalid-email") {
      mensagemRecuperar("Email inválido.", "erro");
    } else if (error.code === "auth/too-many-requests") {
      mensagemRecuperar("Muitas tentativas. Aguarde alguns minutos e tente novamente.", "erro");
    } else {
      mensagemRecuperar("Não foi possível enviar o link agora. Tente novamente.", "erro");
    }
  } finally {
    btnEnviarLink.disabled = false;
  }
}

document.getElementById("btn-esqueci").addEventListener("click", () => mostrarRecuperacao(true));
document.getElementById("btn-voltar-login").addEventListener("click", () => mostrarRecuperacao(false));
document.getElementById("form-recuperar").addEventListener("submit", enviarLinkRecuperacao);

// ── Confirmar email ──────────────────────────────────────

const msgVerificar = document.getElementById("msg-verificar");
const btnJaConfirmei = document.getElementById("btn-ja-confirmei");
const btnReenviar = document.getElementById("btn-reenviar");

function mensagemVerificar(texto, tipo) {
  msgVerificar.textContent = texto;
  msgVerificar.className = `auth-msg ${tipo}`;
  msgVerificar.hidden = false;
}

function mostrarVerificacao(user) {
  document.getElementById("email-verificar").textContent = user.email;
  msgVerificar.hidden = true;
  mostrarPainel("verificar");
}

btnJaConfirmei.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return mostrarPainel("login");

  btnJaConfirmei.disabled = true;
  try {
    await user.reload();
    if (!user.emailVerified) {
      mensagemVerificar("Seu email ainda não foi confirmado. Clique no link que enviamos e tente de novo.", "erro");
      return;
    }
    // Novo token já com email_verified = true, exigido pelas regras do Firestore
    await user.getIdToken(true);
    await entrarNoSite(user);
  } catch (error) {
    console.error("Erro ao verificar:", error.code);
    mensagemVerificar("Não foi possível conferir agora. Tente novamente.", "erro");
  } finally {
    btnJaConfirmei.disabled = false;
  }
});

btnReenviar.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return mostrarPainel("login");

  btnReenviar.disabled = true;
  try {
    await enviarEmailVerificacao(user);
    mensagemVerificar(`Enviamos um novo link para ${user.email}.`, "sucesso");
  } catch (error) {
    console.error("Erro ao reenviar:", error.code);
    mensagemVerificar(error.code === "auth/too-many-requests"
      ? "Você pediu muitos emails seguidos. Aguarde alguns minutos."
      : "Não foi possível reenviar agora. Tente novamente.", "erro");
  } finally {
    btnReenviar.disabled = false;
  }
});

document.getElementById("btn-outra-conta").addEventListener("click", async () => {
  await signOut(auth);
  mostrarPainel("login");
});

// Quem já está logado mas não confirmou o email (ex.: acabou de se cadastrar)
obterUsuarioAtual().then((user) => {
  if (user && !user.isAnonymous && !user.emailVerified) mostrarVerificacao(user);
});
