import {
  db,
  auth,
  collection,
  addDoc,
  doc,
  updateDoc,
  increment
} from "./firebase.js";


const XP_POR_DENUNCIA = 5;


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

    inputLink.value = "";

  } else if (tipo === "link") {

    campoLink.style.display = "block";

    inputLink.setAttribute("required", "required");

    inputTelefone.value = "";
  }
}


// Enviar denúncia
async function enviarDenuncia(event) {

  event.preventDefault();


  const tipo = document.getElementById("tipo-denuncia").value;

  const telefone =
    document.getElementById("telefone").value.trim();

  const link =
    document.getElementById("link").value.trim();

  const descricao =
    document.getElementById("descricao").value.trim();


  // Verifica se o usuário está logado
  const usuario = auth.currentUser;

  if (!usuario) {

    alert("Você precisa estar logado para enviar uma denúncia.");

    return;
  }


  // Validação
  if (!tipo) {

    alert("Selecione o tipo de denúncia.");

    return;
  }


  if (tipo === "telefone" && !telefone) {

    alert("Digite o número de telefone.");

    return;
  }


  if (tipo === "link" && !link) {

    alert("Digite o link suspeito.");

    return;
  }


  if (!descricao) {

    alert("Descreva o ocorrido.");

    return;
  }


  try {

    // Cria a denúncia
    await addDoc(collection(db, "denuncias"), {

      telefone: tipo === "telefone" ? telefone : "",

      link: tipo === "link" ? link : "",

      descricao,

      data: new Date(),

      // UID de quem fez a denúncia
      uidUsuario: usuario.uid

    });


    // Atualiza o XP do usuário
    const usuarioRef = doc(db, "usuarios", usuario.uid);


    await updateDoc(usuarioRef, {

      xp: increment(XP_POR_DENUNCIA),

      denuncias: increment(1)

    });


    alert(`Denúncia enviada com sucesso! Você ganhou ${XP_POR_DENUNCIA} XP.`);


    window.location.href = "index.html";


  } catch (error) {

    console.error("Erro ao enviar denúncia:", error);

    alert("Erro ao enviar denúncia. Tente novamente.");

  }

}


// Listeners
document
  .getElementById("tipo-denuncia")
  .addEventListener("change", alternarCampos);


document
  .getElementById("form-denuncia")
  .addEventListener("submit", enviarDenuncia);