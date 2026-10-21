import {
  auth,
  createUserWithEmailAndPassword
} from "./firebase.js";
import { criarPerfil } from "./usuarios.js";
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

// Valida CPF pelos dígitos verificadores
function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, "");

  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
    return false;
  }

  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

function formatarCPF(cpf) {
  const cpfLimpo = cpf.replace(/\D/g, "");
  if (cpfLimpo.length <= 11) {
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return cpf;
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

  mostrarErro(null);
  etapas[indice].querySelector("input")?.focus();
}

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

    // Salva dados do usuário no Firestore
    await criarPerfil(uid, { nome, cpf, email });

    // A conta só funciona depois de confirmar o email
    await enviarEmailVerificacao(userCredential.user)
      .catch((e) => console.warn("Email de confirmação:", e.code)); // dá para reenviar no login

    mostrarConcluido(email);
    return;

  } catch (error) {
    console.error("Erro ao criar conta:", error.code);

    // Erros de email voltam para a etapa do email
    if (error.code === "auth/email-already-in-use") {
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
    btnAvancar.disabled = false;
    btnVoltar.disabled = false;
  }
}

function mostrarConcluido(email) {
  ["form-cadastro", "etapas-progresso", "cadastro-google", "cadastro-alternativa"]
    .forEach((id) => { campo(id).hidden = true; });
  campo("email-enviado").textContent = email;
  campo("cadastro-concluido").hidden = false;
}

campo("form-cadastro").addEventListener("submit", avancar);

irParaEtapa(0);
