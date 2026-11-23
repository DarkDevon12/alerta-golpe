import {
  auth,
  createUserWithEmailAndPassword
} from "./firebase.js";
import { criarPerfil } from "./usuarios.js";
import { validarCPF, formatarCPF } from "./cpf.js";
import { ativarOlhoSenha } from "./olho-senha.js";
import { enviarEmailVerificacao } from "./verificacao-email.js";

ativarOlhoSenha();

// Validações de senha
function validarSenha(senha) {
  const requisitos = {
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero: /[0-9]/.test(senha),
    simbolo: /[!@#$%^&*()_\-+=\[\]{};:'",.<>?/\|`~]/.test(senha),
    tamanho: senha.length >= 8
  };

  return requisitos;
}

const campo = (id) => document.getElementById(id);

campo("cpf").addEventListener("input", function(e) {
  e.target.value = formatarCPF(e.target.value);
});

// Atualiza visual dos requisitos conforme digita
function atualizarRequisitos() {
  const senha = campo("senha").value;
  const requisitos = validarSenha(senha);

  campo("req-maiuscula").classList.toggle("ok", requisitos.maiuscula);
  campo("req-minuscula").classList.toggle("ok", requisitos.minuscula);
  campo("req-numero").classList.toggle("ok", requisitos.numero);
  campo("req-simbolo").classList.toggle("ok", requisitos.simbolo);
  campo("req-tamanho").classList.toggle("ok", requisitos.tamanho);
  campo("req-iguais").classList.toggle("ok", senha.length > 0 && senha === campo("confirmar-senha").value);
}

campo("senha").addEventListener("input", atualizarRequisitos);
campo("confirmar-senha").addEventListener("input", atualizarRequisitos);

// ── Etapas ───────────────────────────────────────────────
// Cada etapa devolve uma mensagem de erro, ou null se estiver tudo certo.

const VALIDACOES = [
  () => campo("nome").value.trim().length < 3 ? "Digite seu nome completo." : null,

  () => validarCPF(campo("cpf").value) ? null : "CPF inválido. Confira os números.",

  () => {
    const email = campo("email");
    return email.value.trim() && email.checkValidity() ? null : "Digite um email válido.";
  },

  () => {
    const senha = campo("senha").value;
    if (!Object.values(validarSenha(senha)).every(r => r)) return "A senha não atende a todos os requisitos.";
    if (senha !== campo("confirmar-senha").value) return "As senhas não coincidem.";
    if (!campo("aceite-termos").checked) return "Marque que leu e aceita os Termos de Uso e a Política de Privacidade.";
    return null;
  }
];

const etapas = [...document.querySelectorAll(".etapa")];
const erroEtapa = campo("erro-etapa");
const btnVoltar = campo("btn-voltar");
const btnAvancar = campo("btn-avancar");
let etapaAtual = 0;

function mostrarErro(mensagem) {
  erroEtapa.textContent = mensagem || "";
  erroEtapa.hidden = !mensagem;
}

function irParaEtapa(indice) {
  etapaAtual = indice;
  etapas.forEach((etapa, i) => { etapa.hidden = i !== indice; });

  const ultima = indice === etapas.length - 1;
  campo("etapa-contador").textContent = `Etapa ${indice + 1} de ${etapas.length}`;
  campo("etapa-barra").style.width = `${((indice + 1) / etapas.length) * 100}%`;
  campo("cadastro-google").hidden = indice !== 0;
  btnVoltar.hidden = indice === 0;
  btnAvancar.textContent = ultima ? "Criar conta" : "Continuar";
  campo("aceite-bloco").hidden = !ultima;
  atualizarBotao();

  mostrarErro(null);
  etapas[indice].querySelector("input")?.focus();
}

// Na última etapa, "Criar conta" só fica ativo depois do aceite
function atualizarBotao() {
  btnAvancar.disabled = etapaAtual === etapas.length - 1 && !campo("aceite-termos").checked;
}
campo("aceite-termos").addEventListener("change", atualizarBotao);

btnVoltar.addEventListener("click", () => irParaEtapa(etapaAtual - 1));

async function avancar(event) {
  event.preventDefault();

  const erro = VALIDACOES[etapaAtual]();
  if (erro) {
    mostrarErro(erro);
    etapas[etapaAtual].querySelector("input")?.focus();
    return;
  }

  if (etapaAtual < etapas.length - 1) {
    irParaEtapa(etapaAtual + 1);
    return;
  }

  await fazerCadastro();
}

async function fazerCadastro() {
  const nome = campo("nome").value.trim();
  const cpf = campo("cpf").value.replace(/\D/g, "");
  const email = campo("email").value.trim();
  const senha = campo("senha").value;

  btnAvancar.disabled = true;
  btnVoltar.disabled = true;

  try {
    // Cria usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const uid = userCredential.user.uid;

    try {
      // O servidor guarda só um HMAC do CPF (uma conta por CPF); o CPF não é gravado
      await registrarCpf(userCredential.user, cpf);

      // Salva dados do usuário no Firestore, com o aceite dos termos
      await criarPerfil(uid, { nome, email });
    } catch (erro) {
      // Sem desfazer, ficaria uma conta sem perfil: remove o login recém-criado
      await userCredential.user.delete().catch(() => {});
      throw erro;
    }

    // A conta só funciona depois de confirmar o email
    await enviarEmailVerificacao(userCredential.user)
      .catch((e) => console.warn("Email de confirmação:", e.code)); // dá para reenviar no login

    mostrarConcluido(email);
    return;

  } catch (error) {
    console.error("Erro ao criar conta:", error.code);

    if (error.codigo === "cpf-duplicado") {
      irParaEtapa(1);
      mostrarErro(error.message);
    } else if (error.code === "auth/email-already-in-use") {
      irParaEtapa(2);
      mostrarErro("Este email já está registrado. Use outro ou faça login.");
    } else if (error.code === "auth/invalid-email") {
      irParaEtapa(2);
      mostrarErro("Email inválido.");
    } else if (error.code === "auth/weak-password") {
      mostrarErro("Senha muito fraca.");
    } else {
      mostrarErro("Erro ao criar conta: " + error.message);
    }
  } finally {
    btnVoltar.disabled = false;
    atualizarBotao();
  }
}

async function registrarCpf(user, cpf) {
  const resposta = await fetch("/api/registrar-cpf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`
    },
    body: JSON.stringify({ cpf })
  });
  if (resposta.ok) return;

  const corpo = await resposta.json().catch(() => ({}));
  const erro = new Error(corpo.erro || "Não foi possível validar o CPF. Tente novamente.");
  if (resposta.status === 409) erro.codigo = "cpf-duplicado";
  throw erro;
}

function mostrarConcluido(email) {
  ["form-cadastro", "etapas-progresso", "cadastro-google", "cadastro-alternativa"]
    .forEach((id) => { campo(id).hidden = true; });
  campo("email-enviado").textContent = email;
  campo("cadastro-concluido").hidden = false;
}

campo("form-cadastro").addEventListener("submit", avancar);

irParaEtapa(0);
