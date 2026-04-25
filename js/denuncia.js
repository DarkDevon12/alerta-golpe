import { db, collection, addDoc } from "./firebase.js";

// Mostra/esconde campos baseado na seleção
function alternarCampos() {
  const tipo = document.getElementById("tipo-denuncia").value;
  const campoTelefone = document.getElementById("campo-telefone");
  const campoLink = document.getElementById("campo-link");
  const inputTelefone = document.getElementById("telefone");
  const inputLink = document.getElementById("link");

  // Esconde tudo primeiro
  campoTelefone.style.display = "none";
  campoLink.style.display = "none";
  inputTelefone.removeAttribute("required");
  inputLink.removeAttribute("required");

  // Mostra apenas o campo escolhido
  if (tipo === "telefone") {
    campoTelefone.style.display = "block";
    inputTelefone.setAttribute("required", "required");
    inputLink.value = ""; // limpa o outro campo
  } else if (tipo === "link") {
    campoLink.style.display = "block";
    inputLink.setAttribute("required", "required");
    inputTelefone.value = ""; // limpa o outro campo
  }
}

// Validação flexível de link
function validarLink(link) {
  if (!link) return false;
  
  // Aceita: teste.com, www.teste.com, https://teste.com, etc
  // Apenas verifica se tem pelo menos um ponto
  return link.includes(".");
}

async function enviarDenuncia(event) {
  event.preventDefault();

  const tipo = document.getElementById("tipo-denuncia").value;
  const telefone = document.getElementById("telefone").value.trim();
  const link = document.getElementById("link").value.trim();
  const descricao = document.getElementById("descricao").value.trim();

  // Validação: precisa ter escolhido um tipo
  if (!tipo) {
    alert("Selecione o tipo de denúncia (telefone ou link)");
    return;
  }

  // Validação: o campo escolhido precisa estar preenchido
  if (tipo === "telefone" && !telefone) {
    alert("Digite o número de telefone");
    return;
  }

  if (tipo === "link" && !link) {
    alert("Digite o link suspeito");
    return;
  }

  if (!descricao) {
    alert("Descreva o ocorrido");
    return;
  }

  try {
    await addDoc(collection(db, "denuncias"), {
      telefone: tipo === "telefone" ? telefone : "",
      link: tipo === "link" ? link : "",
      descricao,
      data: new Date()
    });

    alert("Denúncia enviada com sucesso!");
    window.location.href = "index.html";

  } catch (error) {
    console.error("Erro ao enviar denúncia:", error);
    alert("Erro ao enviar denúncia. Tente novamente.");
  }
}

// Listeners
document.getElementById("tipo-denuncia").addEventListener("change", alternarCampos);
document.getElementById("form-denuncia").addEventListener("submit", enviarDenuncia);