import { db, collection, addDoc } from "./firebase.js";

async function enviarDenuncia(event) {
  event.preventDefault();

  const telefone = document.getElementById("telefone").value.trim();
  const link = document.getElementById("link").value.trim();
  const descricao = document.getElementById("descricao").value.trim();

  // pelo menos telefone ou link deve ser preenchido
  if (!telefone && !link) {
    alert("Informe pelo menos um telefone ou link suspeito");
    return;
  }

  if (!descricao) {
    alert("Descreva o ocorrido");
    return;
  }

  try {
    await addDoc(collection(db, "denuncias"), {
      telefone: telefone || "",
      link: link || "",
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

document.getElementById("form-denuncia").addEventListener("submit", enviarDenuncia);