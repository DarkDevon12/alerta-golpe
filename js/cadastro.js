import { 
  auth, 
  db,
  createUserWithEmailAndPassword,
  setDoc,
  doc
} from "./firebase.js";

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

// Valida e formata CPF
function validarCPF(cpf) {
  // Remove caracteres especiais
  const cpfLimpo = cpf.replace(/\D/g, "");

  if (cpfLimpo.length !== 11) {
    return false;
  }

  // Validação básica (não é criptografia, só evita CPF óbvio)
  const sequencias = ["00000000000", "11111111111", "22222222222", "33333333333", 
                      "44444444444", "55555555555", "66666666666", "77777777777", 
                      "88888888888", "99999999999"];
  
  return !sequencias.includes(cpfLimpo);
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
    await setDoc(doc(db, "usuarios", uid), {
      nome,
      cpf,
      email,
      xp: 0,
      cuponsGanhos: [],
      dataCriacaoConta: new Date(),
      uid
    });

    alert("Conta criada com sucesso! 🎉");
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
