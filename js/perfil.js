// Página de perfil: o próprio (perfil.html) ou o de outra pessoa
// (perfil.html?uid=...). Abas: visão geral (nível, metas, conquistas),
// loja (só no próprio) e denúncias (no de outra pessoa, só se ela permitir).
import {
  db,
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
  increment,
  arrayUnion
} from "./firebase.js";
import { usuarioPronto, perfilPronto, atualizarMenuPerfil } from "./layout.js";
import { obterPerfilPublico, XP_POR_DENUNCIA, TAMANHO_MAX_NOME } from "./usuarios.js";
import {
  AVATARES,
  BORDAS,
  TEMAS,
  PERFIL_PADRAO,
  MOEDAS_POR_DENUNCIA,
  ICONE_MOEDA,
  renderAvatar,
  situacaoItem,
  obterItem,
  aplicarTema
} from "./personalizacao.js";
import { escapeHtml, nivelPorXp, NIVEIS } from "./util.js";

const ICONES = {
  editar: '<svg class="icon" viewBox="0 0 24 24"><path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/></svg>',
  medalha: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/></svg>',
  cadeado: '<svg class="icon" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  telefone: '<svg class="icon" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  link: '<svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  email: '<svg class="icon" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
};

const RISCOS_IA = {
  BAIXO: { classe: "baixo", texto: "IA: risco baixo" },
  MEDIO: { classe: "medio", texto: "IA: risco médio" },
  ALTO: { classe: "alto", texto: "IA: risco alto" }
};

// Metas de longo prazo. `valor` devolve null quando depende da lista de
// denúncias e ela não está disponível (perfil de outra pessoa, privado).
const CONQUISTAS = [
  { nome: "Primeira denúncia", descricao: "Fez a primeira denúncia", meta: 1, valor: (p) => p.denuncias },
  { nome: "Olho vivo", descricao: "5 denúncias enviadas", meta: 5, valor: (p) => p.denuncias },
  { nome: "Caçador de golpes", descricao: "10 denúncias enviadas", meta: 10, valor: (p) => p.denuncias },
  { nome: "Muralha", descricao: "25 denúncias enviadas", meta: 25, valor: (p) => p.denuncias },
  { nome: "Versátil", descricao: "Denunciou telefone, link e email", meta: 3, valor: (p, lista) => lista && new Set(lista.map((d) => d.tipo)).size },
  { nome: "Analista", descricao: "3 denúncias com análise da IA", meta: 3, valor: (p, lista) => lista && lista.filter((d) => d.analise_ia).length },
  { nome: "Colecionador", descricao: "Comprou 3 itens na loja", meta: 3, valor: (p) => p.itens.length }
];

const GRUPOS_LOJA = [
  { titulo: "Avatares", campo: "avatar", itens: AVATARES },
  { titulo: "Bordas", campo: "borda", itens: BORDAS },
  { titulo: "Temas da página", campo: "tema", itens: TEMAS }
];

const cabEl = document.getElementById("perfil-cab");
const abaGeral = document.getElementById("aba-geral");
const abaLoja = document.getElementById("aba-loja");
const abaDenuncias = document.getElementById("aba-denuncias");
const previaTema = document.getElementById("previa-tema");

let uid = null;
let ehMeu = false;
let perfil = null;
let denuncias = null; // null = não disponível (perfil privado)

function formatarNumero(n) {
  return (n || 0).toLocaleString("pt-BR");
}

function formatarData(data) {
  const d = data?.toDate ? data.toDate() : null;
  return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "Esta pessoa";
}

// ── ABAS ────────────────────────────────────────────────

function abrirAba(nome) {
  const botao = document.querySelector(`[data-aba="${nome}"]`);
  if (!botao || botao.hidden) nome = "geral";

  document.querySelectorAll("[data-aba]").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.aba === nome));
  });
  abaGeral.hidden = nome !== "geral";
  abaLoja.hidden = nome !== "loja";
  abaDenuncias.hidden = nome !== "denuncias";
}

document.querySelectorAll("[data-aba]").forEach((botao) => {
  botao.addEventListener("click", () => {
    history.replaceState(null, "", botao.dataset.aba === "geral" ? location.pathname + location.search : `#${botao.dataset.aba}`);
    abrirAba(botao.dataset.aba);
  });
});

// Links do menu do perfil (perfil.html#loja) na própria página
window.addEventListener("hashchange", () => abrirAba(location.hash.slice(1)));

// ── CABEÇALHO ───────────────────────────────────────────

function renderCabecalho() {
  const nivel = nivelPorXp(perfil.xp);

  cabEl.innerHTML = `
    <div class="perfil-avatar">${renderAvatar(perfil, "avatar-xl")}</div>
    <div class="perfil-info">
      <span class="eyebrow">${ehMeu ? "Meu perfil" : "Perfil da comunidade"}</span>
      <div class="perfil-nome-linha">
        <h1 id="perfil-nome"></h1>
        ${ehMeu ? `<button type="button" class="btn-icone" id="btn-editar-nome" aria-label="Editar nome">${ICONES.editar}</button>` : ""}
      </div>
      ${ehMeu ? `
      <form id="form-nome" class="perfil-nome-form" hidden>
        <input type="text" id="input-nome" class="input" maxlength="${TAMANHO_MAX_NOME}" aria-label="Seu nome" autocomplete="name">
        <button type="submit" class="btn btn-primary">Salvar</button>
        <button type="button" class="btn btn-secondary" id="btn-cancelar-nome">Cancelar</button>
      </form>` : ""}
      <span class="nivel nivel-destaque">${nivel.nome}</span>
    </div>
    <div class="perfil-stats">
      <div><b>${formatarNumero(perfil.xp)}</b><span>XP</span></div>
      <div><b>${formatarNumero(perfil.denuncias)}</b><span>denúncias</span></div>
      ${ehMeu ? `<div class="stat-moedas"><b>${ICONE_MOEDA}${formatarNumero(perfil.moedas)}</b><span>moedas</span></div>` : ""}
    </div>`;

  document.getElementById("perfil-nome").textContent = perfil.nome;
  if (ehMeu) ligarEdicaoNome();
}

function ligarEdicaoNome() {
  const form = document.getElementById("form-nome");
  const input = document.getElementById("input-nome");
  const linha = cabEl.querySelector(".perfil-nome-linha");

  const editar = (sim) => {
    form.hidden = !sim;
    linha.hidden = sim;
    if (sim) {
      input.value = perfil.nome;
      input.focus();
      input.select();
    }
  };

  document.getElementById("btn-editar-nome").addEventListener("click", () => editar(true));
  document.getElementById("btn-cancelar-nome").addEventListener("click", () => editar(false));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = input.value.trim().replace(/\s+/g, " ");
    if (nome.length < 2) {
      alert("O nome precisa ter pelo menos 2 letras.");
      return;
    }
    if (nome === perfil.nome) return editar(false);

    try {
      // Nome privado e público mudam juntos
      const batch = writeBatch(db);
      batch.update(doc(db, "usuarios", uid), { nome });
      batch.update(doc(db, "ranking", uid), { nome });
      await batch.commit();

      perfil.nome = nome;
      renderCabecalho();
      atualizarMenuPerfil(perfil);
    } catch (error) {
      console.error("Erro ao salvar nome:", error);
      alert("Não foi possível salvar o nome: " + error.message);
    }
  });
}

// ── VISÃO GERAL ─────────────────────────────────────────

// Recompensas liberadas ao chegar em cada nível
function recompensasDoNivel(min, proximoMin) {
  return [...AVATARES, ...BORDAS]
    .filter((item) => item.xpMinimo >= min && (proximoMin === undefined || item.xpMinimo < proximoMin))
    .map((item) => item.nome);
}

function renderGeral() {
  const nivel = nivelPorXp(perfil.xp);
  const faltaXp = nivel.proximo ? nivel.proximo.min - perfil.xp : 0;
  const progresso = nivel.proximo ? ((perfil.xp - nivel.min) / (nivel.proximo.min - nivel.min)) * 100 : 100;
  const denunciasFaltando = Math.ceil(faltaXp / XP_POR_DENUNCIA);

  const niveisCrescentes = [...NIVEIS].reverse();
  const trilha = niveisCrescentes.map((n, i) => {
    const alcancado = perfil.xp >= n.min;
    const atual = n.nome === nivel.nome;
    const recompensas = recompensasDoNivel(n.min, niveisCrescentes[i + 1]?.min);
    return `
      <li class="trilha-item${alcancado ? " alcancado" : ""}${atual ? " atual" : ""}">
        <span class="trilha-marca">${alcancado ? ICONES.check : ICONES.cadeado}</span>
        <div>
          <strong>${n.nome}</strong>
          <span>${n.min} XP${recompensas.length ? ` · libera ${recompensas.join(", ")}` : ""}</span>
        </div>
      </li>`;
  }).join("");

  const conquistas = CONQUISTAS.map((c) => {
    const valor = c.valor(perfil, denuncias);
    const desconhecido = valor === null || valor === undefined;
    const feita = !desconhecido && valor >= c.meta;
    return `
      <li class="conquista${feita ? " feita" : ""}">
        <span class="conquista-icone">${ICONES.medalha}</span>
        <div>
          <strong>${c.nome}</strong>
          <span>${c.descricao}</span>
          ${desconhecido ? "" : `<small>${Math.min(valor, c.meta)}/${c.meta}</small>`}
        </div>
      </li>`;
  }).join("");

  abaGeral.innerHTML = `
    <div class="perfil-grid">
      <section class="card perfil-bloco">
        <h2>Próximo nível</h2>
        <div class="meta-nivel">
          <div class="meta-nivel-topo">
            <span class="nivel nivel-destaque">${nivel.nome}</span>
            ${nivel.proximo ? `<span class="nivel">${nivel.proximo.nome}</span>` : ""}
          </div>
          <div class="progresso-barra progresso-grande"><span style="width:${progresso}%"></span></div>
          <p>${nivel.proximo
            ? `Faltam <b>${faltaXp} XP</b> (cerca de ${denunciasFaltando} ${denunciasFaltando === 1 ? "denúncia" : "denúncias"}) para chegar a <b>${nivel.proximo.nome}</b>.`
            : "Nível máximo alcançado. Lenda da comunidade!"}</p>
        </div>
        <ol class="trilha">${trilha}</ol>
        ${ehMeu ? `<a href="denunciar.html" class="btn btn-primary">Denunciar golpe · +${XP_POR_DENUNCIA} XP · +${MOEDAS_POR_DENUNCIA} moedas</a>` : ""}
      </section>

      <section class="card perfil-bloco">
        <h2>Conquistas</h2>
        <ul class="conquistas">${conquistas}</ul>
      </section>
    </div>

    ${ehMeu ? `
    <section class="card perfil-bloco privacidade">
      <div>
        <h2>Privacidade</h2>
        <p>Quando ativado, quem abrir seu perfil pelo ranking vê a lista das suas denúncias e os relatos. Seu email e CPF nunca aparecem.</p>
      </div>
      <label class="interruptor">
        <input type="checkbox" id="chk-publico" ${perfil.perfilPublico ? "checked" : ""}>
        <span class="interruptor-trilho" aria-hidden="true"></span>
        <span>Mostrar minhas denúncias no perfil</span>
      </label>
    </section>` : ""}`;

  document.getElementById("chk-publico")?.addEventListener("change", async (e) => {
    const marcado = e.target.checked;
    try {
      await updateDoc(doc(db, "ranking", uid), { perfilPublico: marcado });
      perfil.perfilPublico = marcado;
    } catch (error) {
      e.target.checked = !marcado;
      alert("Não foi possível salvar: " + error.message);
    }
  });
}

// ── LOJA ────────────────────────────────────────────────

function previaItem(item, campo) {
  if (campo === "avatar") return renderAvatar({ ...perfil, avatar: item.id, borda: "sem-borda" }, "avatar-lg");
  if (campo === "borda") return renderAvatar({ ...perfil, borda: item.id }, "avatar-lg");
  const [fundo, cartao, destaque] = item.amostra;
  return `<span class="amostra-tema" style="--a-fundo:${fundo};--a-cartao:${cartao};--a-destaque:${destaque}"><i></i><i></i><i></i></span>`;
}

function botaoItem(item, campo, situacao) {
  const dados = `data-campo="${campo}" data-id="${item.id}"`;
  if (situacao === "em-uso") return `<button type="button" class="btn btn-sm btn-em-uso" disabled>${ICONES.check}Em uso</button>`;
  if (situacao === "liberado") return `<button type="button" class="btn btn-sm btn-secondary" data-acao="usar" ${dados}>Usar</button>`;
  if (situacao === "nivel") {
    return `<button type="button" class="btn btn-sm btn-bloqueado" disabled>${ICONES.cadeado}Nível ${nivelPorXp(item.xpMinimo).nome}</button>`;
  }
  const falta = item.preco - perfil.moedas;
  return `<button type="button" class="btn btn-sm btn-comprar" data-acao="comprar" ${dados} ${falta > 0 ? `disabled title="Faltam ${falta} moedas"` : ""}>${ICONE_MOEDA}${item.preco}</button>`;
}

function renderLoja() {
  const grupos = GRUPOS_LOJA.map(({ titulo, campo, itens }) => `
    <section class="loja-grupo">
      <h2>${titulo}</h2>
      <div class="loja-grade">
        ${itens.map((item) => {
          const situacao = situacaoItem(item, perfil, campo);
          const especial = item.preco ? `<span class="selo-pro">Pro</span>` : item.xpMinimo ? `<span class="selo-nivel">Nível</span>` : "";
          const experimentar = campo === "tema" && (situacao === "comprar" || situacao === "nivel")
            ? `<button type="button" class="link-acao" data-acao="experimentar" data-id="${item.id}">Experimentar</button>` : "";
          return `
            <div class="loja-item${situacao === "em-uso" ? " em-uso" : ""}">
              ${especial}
              <div class="loja-previa">${previaItem(item, campo)}</div>
              <strong>${item.nome}</strong>
              ${botaoItem(item, campo, situacao)}
              ${experimentar}
            </div>`;
        }).join("")}
      </div>
    </section>`).join("");

  abaLoja.innerHTML = `
    <div class="card loja-saldo">
      <span class="loja-saldo-icone">${ICONE_MOEDA}</span>
      <div>
        <strong>${formatarNumero(perfil.moedas)} moedas</strong>
        <span>Cada denúncia rende +${MOEDAS_POR_DENUNCIA} moedas. Itens Pro são comprados; itens de nível liberam sozinhos conforme você ganha XP.</span>
      </div>
      <a href="denunciar.html" class="btn btn-primary">Ganhar moedas</a>
    </div>
    ${grupos}`;
}

async function usarItem(campo, id) {
  await updateDoc(doc(db, "ranking", uid), { [campo]: id });
  perfil[campo] = id;
  if (campo === "tema") {
    desfazerPrevia(false);
    aplicarTema(id);
  }
}

abaLoja.addEventListener("click", async (e) => {
  const botao = e.target.closest("[data-acao]");
  if (!botao) return;

  const { acao, campo, id } = botao.dataset;
  const item = obterItem(id);

  if (acao === "experimentar") {
    mostrarPrevia(item);
    return;
  }

  botao.disabled = true;
  try {
    if (acao === "comprar") {
      if (!confirm(`Comprar "${item.nome}" por ${item.preco} moedas?`)) {
        botao.disabled = false;
        return;
      }
      // As regras conferem o preço e o saldo
      await updateDoc(doc(db, "ranking", uid), {
        moedas: increment(-item.preco),
        itens: arrayUnion(id),
        ultimaCompra: id
      });
      perfil.moedas -= item.preco;
      perfil.itens = [...perfil.itens, id];
    }

    await usarItem(campo, id);
    renderCabecalho();
    renderLoja();
    renderGeral(); // conquista "Colecionador"
    atualizarMenuPerfil(perfil);

  } catch (error) {
    console.error("Erro na loja:", error);
    alert(error.code === "permission-denied"
      ? "Não foi possível concluir: saldo insuficiente ou item indisponível."
      : "Erro: " + error.message);
    botao.disabled = false;
  }
});

// Prévia de tema: aplica sem salvar até a pessoa desfazer ou recarregar
function mostrarPrevia(item) {
  aplicarTema(item.id, { salvar: false });
  previaTema.querySelector("span").textContent = `Prévia do tema ${item.nome}. Compre na loja para usar sempre.`;
  previaTema.hidden = false;
}

function desfazerPrevia(restaurar = true) {
  if (restaurar) aplicarTema(perfil.tema, { salvar: false });
  previaTema.hidden = true;
}

document.getElementById("btn-desfazer-previa").addEventListener("click", () => desfazerPrevia());

// ── DENÚNCIAS ───────────────────────────────────────────

async function carregarDenuncias() {
  const snap = await getDocs(query(collection(db, "denuncias"), where("usuario_uid", "==", uid)));
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));
}

function renderDenuncias() {
  if (denuncias === null) {
    abaDenuncias.innerHTML = `
      <div class="card vazio-perfil">
        ${ICONES.cadeado}
        <p>${escapeHtml(primeiroNome(perfil.nome))} mantém as denúncias privadas.</p>
      </div>`;
    return;
  }

  if (denuncias.length === 0) {
    abaDenuncias.innerHTML = `
      <div class="card vazio-perfil">
        <p>${ehMeu ? "Você ainda não fez nenhuma denúncia." : "Nenhuma denúncia ainda."}</p>
        ${ehMeu ? `<a href="denunciar.html" class="btn btn-primary">Fazer a primeira denúncia</a>` : ""}
      </div>`;
    return;
  }

  abaDenuncias.innerHTML = `
    <p class="denuncias-total">${denuncias.length === 1 ? "1 denúncia" : `${denuncias.length} denúncias`}</p>
    <div class="minhas-denuncias">
      ${denuncias.map((d) => {
        const valor = d[d.tipo] || "";
        const risco = RISCOS_IA[d.analise_ia?.risco];
        return `
          <article class="card minha-denuncia">
            <span class="md-icone">${ICONES[d.tipo] || ICONES.link}</span>
            <div class="md-corpo">
              <div class="md-topo">
                <strong>${escapeHtml(valor)}</strong>
                ${risco ? `<span class="risco ${risco.classe}">${risco.texto}</span>` : ""}
              </div>
              <p>${escapeHtml(d.descricao)}</p>
              <div class="md-rodape">
                <time>${formatarData(d.data)}</time>
                <a href="resultado.html?busca=${encodeURIComponent(valor)}">Ver consulta</a>
              </div>
            </div>
          </article>`;
      }).join("")}
    </div>`;
}

// ── INÍCIO ──────────────────────────────────────────────

async function iniciar() {
  const user = await usuarioPronto;
  if (!user) return;

  const uidParam = new URLSearchParams(location.search).get("uid");
  ehMeu = !uidParam || uidParam === user.uid;
  uid = ehMeu ? user.uid : uidParam;

  try {
    const dados = ehMeu ? await perfilPronto : await obterPerfilPublico(uid);
    if (!dados) {
      cabEl.innerHTML = `<p class="placar-msg">Perfil não encontrado.</p>`;
      return;
    }
    // Perfis ainda não migrados para a loja ficam com os valores padrão
    perfil = { moedas: 0, xp: 0, denuncias: 0, ...PERFIL_PADRAO, ...dados };

    document.title = `${ehMeu ? "Meu perfil" : perfil.nome} — AlertaGolpe`;
    document.getElementById("tab-loja").hidden = !ehMeu;
    if (ehMeu) document.getElementById("tab-denuncias").textContent = "Minhas denúncias";

    renderCabecalho();

    denuncias = ehMeu || perfil.perfilPublico ? await carregarDenuncias() : null;

    renderGeral();
    if (ehMeu) renderLoja();
    renderDenuncias();
    abrirAba(location.hash.slice(1));

  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    cabEl.innerHTML = `<p class="placar-msg">Não foi possível carregar o perfil. ${
      error.code === "permission-denied" ? "Verifique as regras do Firestore (firestore.rules)." : ""
    }</p>`;
  }
}

iniciar();
