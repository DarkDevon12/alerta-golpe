import { db, collection, getDocs } from "./firebase.js";
import { usuarioPronto } from "./layout.js";

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

// Verifica se dois telefones batem (considera com/sem DDD e +55)
function telefonesBatem(tel1, tel2) {
  const norm1 = normalizarTelefone(tel1);
  const norm2 = normalizarTelefone(tel2);

  // Menos de 8 dígitos não identifica um número
  if (norm1.length < 8 || norm2.length < 8) return false;

  return norm1.endsWith(norm2) || norm2.endsWith(norm1);
}

const ICONES = {
  baixo: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  alerta: '<svg class="icon" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
};

function formatarData(data) {
  const d = data?.toDate ? data.toDate() : null;
  return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

async function carregarResultados() {
  const valorBuscado = new URLSearchParams(window.location.search).get("busca")?.trim();

  if (!valorBuscado) {
    window.location.replace("index.html");
    return;
  }

  const user = await usuarioPronto;
  if (!user) return;

  // Detecta se é link ou telefone
  const ehLink = /[a-z]/i.test(valorBuscado) || valorBuscado.includes("/");

  document.getElementById("numero").textContent = valorBuscado;
  document.getElementById("tipo-busca").textContent = ehLink ? "Consulta de link" : "Consulta de telefone";

  const riscoEl = document.getElementById("risco");
  const relatosEl = document.getElementById("relatos");

  let filtradas;
  try {
    const snapshot = await getDocs(collection(db, "denuncias"));
    const todas = snapshot.docs.map((d) => d.data());

    if (ehLink) {
      const linkNormalizado = normalizarLink(valorBuscado);
      filtradas = todas.filter((d) => d.link && normalizarLink(d.link) === linkNormalizado);
    } else {
      filtradas = todas.filter((d) => d.telefone && telefonesBatem(d.telefone, valorBuscado));
    }
  } catch (erro) {
    console.error("Erro ao consultar denúncias:", erro);
    riscoEl.textContent = "Erro na consulta";
    riscoEl.className = "risco alto";
    return;
  }

  const qtd = filtradas.length;
  document.getElementById("denuncias").textContent =
    qtd === 1 ? "1 denúncia registrada" : `${qtd} denúncias registradas`;

  if (qtd === 0) {
    riscoEl.innerHTML = `${ICONES.baixo} Risco baixo`;
    riscoEl.className = "risco baixo";
  } else if (qtd <= 3) {
    riscoEl.innerHTML = `${ICONES.alerta} Risco médio`;
    riscoEl.className = "risco medio";
  } else {
    riscoEl.innerHTML = `${ICONES.alerta} Risco alto`;
    riscoEl.className = "risco alto";
  }

  const titulo = document.createElement("h2");
  titulo.textContent = "Relatos da comunidade";
  relatosEl.replaceChildren(titulo);

  if (qtd === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Ninguém denunciou este contato ainda. Isso não garante que seja seguro: na dúvida, não envie dinheiro nem códigos.";
    relatosEl.appendChild(vazio);
    return;
  }

  filtradas
    .sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0))
    .forEach((d) => {
      const div = document.createElement("article");
      div.className = "relato";
      div.textContent = d.descricao || "Sem descrição informada.";

      const data = formatarData(d.data);
      if (data) {
        const time = document.createElement("time");
        time.textContent = data;
        div.appendChild(time);
      }
      relatosEl.appendChild(div);
    });
}

carregarResultados();
