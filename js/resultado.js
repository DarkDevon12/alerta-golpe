import { db, collection, getDocs } from "./firebase.js";

// Normaliza links removendo protocolo, www, barra final
function normalizarLink(texto) {
  if (!texto) return "";
  
  return texto
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")      // remove http:// ou https://
    .replace(/^www\./, "")             // remove www.
    .replace(/\/$/, "");               // remove barra final
}

// Normaliza telefone deixando só números
function normalizarTelefone(texto) {
  if (!texto) return "";
  return texto.replace(/\D/g, "");     // remove tudo que não é número
}

// Verifica se dois telefones batem (considera com/sem DDD)
function telefonesBatem(tel1, tel2) {
  const norm1 = normalizarTelefone(tel1);
  const norm2 = normalizarTelefone(tel2);
  
  if (!norm1 || !norm2) return false;
  
  // Comparação exata
  if (norm1 === norm2) return true;
  
  // Pega últimos 8 ou 9 dígitos (número sem DDD)
  const ultimos1 = norm1.slice(-9);
  const ultimos2 = norm2.slice(-9);
  
  // Se um termina com o outro, considera match
  return norm1.endsWith(ultimos2) || norm2.endsWith(ultimos1);
}

async function carregarResultados() {
  const params = new URLSearchParams(window.location.search);
  const valorBuscado = params.get("busca");

  if (!valorBuscado) {
    alert("Nenhuma busca encontrada");
    return;
  }

  document.getElementById("numero").textContent = valorBuscado;

  const snapshot = await getDocs(collection(db, "denuncias"));
  const todas = snapshot.docs.map(doc => doc.data());

  // Detecta se é link ou telefone
  const ehLink = valorBuscado.includes(".") || valorBuscado.includes("/");

  let filtradas;

  if (ehLink) {
    // Busca por link normalizado
    const linkNormalizado = normalizarLink(valorBuscado);
    filtradas = todas.filter(d => 
      d.link && normalizarLink(d.link) === linkNormalizado
    );
  } else {
    // Busca por telefone com comparação flexível
    filtradas = todas.filter(d => 
      d.telefone && telefonesBatem(d.telefone, valorBuscado)
    );
  }

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