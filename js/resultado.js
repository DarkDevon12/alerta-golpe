import { db, collection, getDocs } from "./firebase.js";

function normalizar(texto) {
  if (!texto) return "";
  if (texto.includes(".") || texto.includes("/")) {
    return texto.toLowerCase().trim();
  }
  return texto.replace(/\D/g, "");
}

async function carregarResultados() {
  // lê o valor direto da URL
  const params = new URLSearchParams(window.location.search);
  const valorBuscado = params.get("busca");

  if (!valorBuscado) {
    alert("Nenhuma busca encontrada");
    return;
  }

  document.getElementById("numero").textContent = valorBuscado;

  // busca TODOS os documentos da coleção "denuncias" no Firestore
  const snapshot = await getDocs(collection(db, "denuncias"));
  const todas = snapshot.docs.map(doc => doc.data());

  // filtra os que batem com o valor buscado
  const filtradas = todas.filter(d =>
    (d.telefone && normalizar(d.telefone) === normalizar(valorBuscado)) ||
    (d.link && normalizar(d.link) === normalizar(valorBuscado))
  );

  const qtd = filtradas.length;
  document.getElementById("denuncias").textContent = `${qtd} denúncia(s) registrada(s)`;

  const riscoEl = document.getElementById("risco");
  if (qtd === 0) {
    riscoEl.textContent = "✅ Risco baixo";
    riscoEl.className = "risco baixo";
  } else if (qtd <= 3) {
    riscoEl.textContent = "⚠️ Risco médio";
    riscoEl.className = "risco medio";
  } else {
    riscoEl.textContent = "🚨 Risco alto";
    riscoEl.className = "risco alto";
  }

  const relatosContainer = document.querySelector(".relatos");
  relatosContainer.innerHTML = "<h3>Relatos:</h3>";

  if (qtd === 0) {
    relatosContainer.innerHTML += "<p>Nenhum relato encontrado para este número/link.</p>";
    return;
  }

  filtradas.forEach(d => {
    const div = document.createElement("div");
    div.className = "relato";
    div.textContent = d.descricao || "Sem descrição informada.";
    relatosContainer.appendChild(div);
  });
}

carregarResultados();