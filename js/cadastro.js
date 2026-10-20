import {
  auth,
  createUserWithEmailAndPassword
} from "./firebase.js";
import { criarPerfil } from "./usuarios.js";

// Validações de senha
function validarSenha(senha) {
  const requisitos = {
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero: /[0-9]/.test(senha),
    simbolo: /[!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~]/.test(senha),
    tamanho: senha.length >= 8
  };

  return requisitos;
}

// Atualiza visual dos requisitos conforme digita
document.getElementById("senha").addEventListener("input", function(e) {
  const senha = e.target.value;
  const requisitos = validarSenha(senha);

  document.getElementById("req-maiuscula").classList.toggle("ok", requisitos.maiuscula);
  document.getElementById("req-minuscula").classList.toggle("ok", requisitos.minuscula);
  document.getElementById("req-numero").classList.toggle("ok", requisitos.numero);
  document.getElementById("req-simbolo").classList.toggle("ok", requisitos.simbolo);
  document.getElementById("req-tamanho").classList.toggle("ok", requisitos.tamanho);

  // Habilita botão apenas se tudo OK
  const senhaConfirm = document.getElementById("confirmar-senha").value;
  const todosRequisitos = Object.values(requisitos).every(r => r);
  const senhasIguais = senha === senhaConfirm && senha.length > 0;

  document.getElementById("btn-cadastro").disabled = !(todosRequisitos && senhasIguais);
});

document.getElementById("confirmar-senha").addEventListener("input", function(e) {
  const senha = document.getElementById("senha").value;
  const confirm = e.target.value;
  const requisitos = validarSenha(senha);

  const todosRequisitos = Object.values(requisitos).every(r => r);
  const senhasIguais = senha === confirm && senha.length > 0;

  document.getElementById("btn-cadastro").disabled = !(todosRequisitos && senhasIguais);
});

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

document.getElementById("cpf").addEventListener("input", function(e) {
  e.target.value = formatarCPF(e.target.value);
});

async function fazerCadastro(event) {
  event.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const cpf = document.getElementById("cpf").value.replace(/\D/g, "");
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmar-senha").value;

  // Validações
  if (!nome || !cpf || !email || !senha) {
    alert("Preencha todos os campos");
    return;
  }

  if (!validarCPF(cpf)) {
    alert("CPF inválido");
    return;
  }

  if (senha !== confirmarSenha) {
    alert("As senhas não coincidem");
    return;
  }

  const requisitos = validarSenha(senha);
  if (!Object.values(requisitos).every(r => r)) {
    alert("Senha não atende aos requisitos");
    return;
  }

  try {
    // Cria usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const uid = userCredential.user.uid;

    // Salva dados do usuário no Firestore
    await criarPerfil(uid, { nome, cpf, email });

    alert("Conta criada com sucesso!");
    window.location.href = "login.html";

  } catch (error) {
    console.error("Erro ao criar conta:", error.code);

    if (error.code === "auth/email-already-in-use") {
      alert("Este email já está registrado");
    } else if (error.code === "auth/invalid-email") {
      alert("Email inválido");
    } else if (error.code === "auth/weak-password") {
      alert("Senha muito fraca");
    } else {
      alert("Erro ao criar conta: " + error.message);
    }
  }
}

document.getElementById("form-cadastro").addEventListener("submit", fazerCadastro);
