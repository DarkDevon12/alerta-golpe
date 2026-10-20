import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "./firebase.js";
import { usuarioPronto } from "./layout.js";
import { sincronizarRanking } from "./usuarios.js";
import { escapeHtml, iniciais, nivelPorXp } from "./util.js";

const TOP = 100;

const lista = document.getElementById("ranking-lista");
const podio = document.getElementById("podio");
const meuCard = document.getElementById("meu-card");

// Cor do avatar derivada do nome, para cada pessoa ter sempre a mesma
function hue(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function avatar(nome) {
  return `<span class="avatar" style="--hue:${hue(nome)}">${escapeHtml(iniciais(nome))}</span>`;
}

function formatarNumero(n) {
  return n.toLocaleString("pt-BR");
}

function renderPodio(top3) {
  if (top3.length < 3) return;

  // Ordem visual: 2º, 1º, 3º
  podio.innerHTML = [top3[1], top3[0], top3[2]].map((m) => `
    <div class="card podio-item p${m.posicao}">
      ${avatar(m.nome)}
      <div class="podio-nome" title="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</div>
      <div class="podio-xp">${formatarNumero(m.xp)} XP · ${nivelPorXp(m.xp).nome}</div>
      <div class="podio-base">${m.posicao}</div>
    </div>
  `).join("");
  podio.hidden = false;
}

function renderLista(membros, meuUid) {
  if (membros.length === 0) {
    lista.innerHTML = `<li class="placar-msg">Ninguém pontuou ainda. Faça a primeira denúncia e abra o ranking.</li>`;
    return;
  }

  const maiorXp = Math.max(membros[0].xp, 1);

  lista.innerHTML = membros.map((m) => `
    <li class="placar-linha${m.uid === meuUid ? " eu" : ""}">
      <span class="placar-pos">${m.posicao}</span>
      <div class="placar-membro">
        ${avatar(m.nome)}
        <div>
          <strong>${escapeHtml(m.nome)}${m.uid === meuUid ? "<small>você</small>" : ""}</strong>
          <span class="nivel">${nivelPorXp(m.xp).nome}</span>
        </div>
      </div>
      <span class="placar-num">${formatarNumero(m.denuncias)}</span>
      <div class="placar-xp">
        <div class="progresso-barra"><span style="width:${(m.xp / maiorXp) * 100}%"></span></div>
        <b>${formatarNumero(m.xp)}</b>
      </div>
    </li>
  `).join("");
}

function renderMeuCard(eu, posicao) {
  const nivel = nivelPorXp(eu.xp);
  const progresso = nivel.proximo
    ? ((eu.xp - nivel.min) / (nivel.proximo.min - nivel.min)) * 100
    : 100;
  const textoProgresso = nivel.proximo
    ? `Faltam ${nivel.proximo.min - eu.xp} XP para ${nivel.proximo.nome}`
    : "Nível máximo alcançado";

  meuCard.innerHTML = `
    ${avatar(eu.nome)}
    <div>
      <div class="meu-pos">${posicao ? `Sua posição: <b>#${posicao}</b>` : `Fora do top ${TOP}`}</div>
      <div class="meu-nome">${escapeHtml(eu.nome)} <span class="nivel">${nivel.nome}</span></div>
      <div class="progresso">
        <div class="progresso-barra"><span style="width:${progresso}%"></span></div>
        <small>${textoProgresso}</small>
      </div>
    </div>
    <div class="meu-xp">
      <div><b>${formatarNumero(eu.xp)}</b><span>XP · ${formatarNumero(eu.denuncias)} denúncias</span></div>
      <a href="denunciar.html" class="btn btn-primary">Denunciar golpe</a>
    </div>
  `;
  meuCard.hidden = false;
}

async function carregarRanking() {
  const user = await usuarioPronto;
  if (!user) return;

  try {
    // Garante que o usuário atual aparece (contas anteriores ao ranking público)
    const minhaEntrada = await sincronizarRanking(user.uid).catch(() => null);

    const snapshot = await getDocs(
      query(collection(db, "ranking"), orderBy("xp", "desc"), limit(TOP))
    );

    const membros = snapshot.docs.map((d, i) => ({
      uid: d.id,
      posicao: i + 1,
      nome: d.data().nome || "Usuário",
      xp: d.data().xp || 0,
      denuncias: d.data().denuncias || 0
    }));

    document.getElementById("stat-membros").textContent = formatarNumero(membros.length);
    document.getElementById("stat-denuncias").textContent =
      formatarNumero(membros.reduce((soma, m) => soma + m.denuncias, 0));

    const eu = membros.find((m) => m.uid === user.uid);
    if (eu) {
      renderMeuCard(eu, eu.posicao);
    } else if (minhaEntrada) {
      renderMeuCard({ ...minhaEntrada, uid: user.uid }, null);
    }

    renderPodio(membros.slice(0, 3));
    renderLista(membros, user.uid);

  } catch (erro) {
    console.error("Erro ao carregar ranking:", erro);
    lista.innerHTML = `<li class="placar-msg">Não foi possível carregar o ranking. ${
      erro.code === "permission-denied" ? "Verifique as regras do Firestore (firestore.rules)." : ""
    }</li>`;
  }
}

carregarRanking();
