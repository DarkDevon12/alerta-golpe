import {
  db,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  increment
} from "./firebase.js";
import { usuarioPronto } from "./layout.js";
import { XP_POR_DENUNCIA, obterPerfil, sincronizarRanking } from "./usuarios.js";
import { MOEDAS_POR_DENUNCIA } from "./personalizacao.js";
import { escapeHtml } from "./util.js";
import { chaveAlvo, idDenuncia } from "./alvos.js";

const MIN_DESCRICAO = 20;

const form = document.getElementById("form-denuncia");
const radiosTipo = form.querySelectorAll('input[name="tipo"]');
const inputTelefone = document.getElementById("input-telefone");
const inputLink = document.getElementById("input-link");
const inputEmail = document.getElementById("input-email");
const inputDescricao = document.getElementById("input-descricao");
const campoTelefone = document.getElementById("campo-telefone");
const campoLink = document.getElementById("campo-link");
const campoEmail = document.getElementById("campo-email");
const avisoAlvo = document.getElementById("aviso-alvo");
const analiseContainer = document.getElementById("analise-container");
const btnAnalisar = document.getElementById("btn-analisar");
const btnEnviar = document.getElementById("btn-enviar");
const charCount = document.getElementById("char-count");

// Última análise válida para o conteúdo atual do formulário
let ultimaAnalise = null;

// "tipo:chave" de tudo que o usuário já denunciou (cada alvo só uma vez)
const minhasDenuncias = new Set();

const CAMPOS = {
  telefone: { input: inputTelefone, campo: campoTelefone },
  link: { input: inputLink, campo: campoLink },
  email: { input: inputEmail, campo: campoEmail }
};

const MENSAGENS_INVALIDO = {
  telefone: "Informe o número com DDD, ex.: (11) 98765-4321.",
  link: "Link inválido. Informe o endereço do site, ex.: site-falso.com/promo.",
  email: "Email inválido. Ex.: seguranca@banco-falso.com."
};

const MENSAGENS_REPETIDA = {
  telefone: "Você já denunciou este número. Cada pessoa pode denunciar o mesmo telefone uma única vez.",
  link: "Você já denunciou este site. Cada pessoa pode denunciar o mesmo link uma única vez.",
  email: "Você já denunciou este email. Cada pessoa pode denunciar o mesmo endereço uma única vez."
};

const ICONE_CHECK = '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
const ICONE_IA = '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17v4M17 19h4"/></svg>';

const RISCOS = {
  BAIXO: { classe: "baixo", texto: "Baixo" },
  MEDIO: { classe: "medio", texto: "Médio" },
  ALTO: { classe: "alto", texto: "Alto" }
};

// ── LEITURA DO FORMULÁRIO ───────────────────────────
function lerFormulario() {
  const tipo = form.querySelector('input[name="tipo"]:checked')?.value || "";
  const valor = CAMPOS[tipo]?.input.value.trim() || "";
  const descricao = inputDescricao.value.trim();
  return { tipo, valor, descricao };
}

// Mensagem de erro sobre o alvo (inválido ou já denunciado), ou null
function problemaAlvo({ tipo, valor }) {
  if (!tipo || !valor) return null;
  const chave = chaveAlvo(tipo, valor);
  if (!chave) return MENSAGENS_INVALIDO[tipo];
  if (minhasDenuncias.has(`${tipo}:${chave}`)) return MENSAGENS_REPETIDA[tipo];
  return null;
}

function formularioCompleto(dados) {
  return Boolean(dados.tipo && dados.valor && !problemaAlvo(dados) && dados.descricao.length >= MIN_DESCRICAO);
}

function mostrarAvisoAlvo(mensagem) {
  avisoAlvo.textContent = mensagem || "";
  avisoAlvo.hidden = !mensagem;
}

async function carregarMinhasDenuncias() {
  const user = await usuarioPronto;
  if (!user) return;

  try {
    const snap = await getDocs(query(collection(db, "denuncias"), where("usuario_uid", "==", user.uid)));
    snap.forEach((d) => {
      const { tipo } = d.data();
      const chave = chaveAlvo(tipo, d.data()[tipo]);
      if (chave) minhasDenuncias.add(`${tipo}:${chave}`);
    });
    atualizarEstado();
  } catch (error) {
    // As regras do Firestore continuam barrando a repetição
    console.warn("Não foi possível carregar suas denúncias:", error.message);
  }
}

// ── PAINEL DE ANÁLISE ───────────────────────────────
function mostrarVazio(desatualizada = false) {
  analiseContainer.innerHTML = `
    <div class="ia-vazio">
      ${ICONE_IA}
      <strong>${desatualizada ? "Os dados mudaram" : "Análise inteligente"}</strong>
      ${desatualizada
        ? "Clique em <b>Analisar com IA</b> de novo para avaliar o relato atualizado."
        : "Preencha o tipo, o telefone ou link e a descrição. Depois clique em <b>Analisar com IA</b> para ver o nível de risco e o que fazer."}
    </div>
  `;
}

function mostrarCarregando() {
  analiseContainer.innerHTML = `
    <div class="ia-carregando">
      <div class="spinner"></div>
      Analisando o relato com o Gemini…
    </div>
  `;
}

function mostrarErro(mensagem) {
  analiseContainer.innerHTML = `
    <div class="ia-erro">
      <strong>Não foi possível analisar</strong>
      ${escapeHtml(mensagem)}<br>
      Você ainda pode enviar a denúncia normalmente.
    </div>
  `;
}

function mostrarAnalise(analise) {
  const risco = RISCOS[analise.risco] || RISCOS.MEDIO;
  const lista = (itens) => itens.map((i) => `<li>${escapeHtml(i)}</li>`).join("");

  analiseContainer.innerHTML = `
    <div class="ia-risco ${risco.classe}">
      <div>
        <div class="ia-risco-label">Risco de golpe</div>
        <div class="ia-risco-valor">${risco.texto}</div>
      </div>
      <div class="ia-confianca">
        <b>${Math.round(analise.confianca * 100)}%</b>
        de confiança
      </div>
    </div>

    <div class="ia-secao">
      <h3>Análise</h3>
      <p>${escapeHtml(analise.analise)}</p>
    </div>

    ${analise.padroes.length ? `
    <div class="ia-secao">
      <h3>Sinais identificados</h3>
      <ul class="ia-tags">${lista(analise.padroes)}</ul>
    </div>` : ""}

    ${analise.conselhos.length ? `
    <div class="ia-secao">
      <h3>O que fazer agora</h3>
      <ul class="ia-conselhos">
        ${analise.conselhos.map((c) => `<li>${ICONE_CHECK}<span>${escapeHtml(c)}</span></li>`).join("")}
      </ul>
    </div>` : ""}

    <p class="ia-rodape">A análise é gerada por IA e pode errar. Ela será salva junto com a sua denúncia.</p>
  `;
}

// ── ANÁLISE COM IA (via servidor) ───────────────────
async function analisar() {
  const dados = lerFormulario();
  if (!formularioCompleto(dados)) return;

  const user = await usuarioPronto;
  if (!user) return;

  btnAnalisar.disabled = true;
  btnEnviar.disabled = true;
  mostrarCarregando();

  try {
    const resposta = await fetch("/api/analisar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`
      },
      body: JSON.stringify(dados)
    });

    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.erro || `Erro ${resposta.status} no servidor.`);

    // Só vale se o formulário não mudou enquanto a IA respondia
    if (JSON.stringify(lerFormulario()) !== JSON.stringify(dados)) {
      mostrarVazio(true);
      return;
    }

    ultimaAnalise = corpo;
    mostrarAnalise(corpo);

  } catch (error) {
    console.error("Erro na análise:", error);
    mostrarErro(error.message === "Failed to fetch"
      ? "Servidor indisponível. Rode o projeto com `npm run dev`."
      : error.message);

  } finally {
    btnEnviar.disabled = false;
    atualizarEstado();
  }
}

// ── ESTADO DO FORMULÁRIO ────────────────────────────
function atualizarEstado() {
  const dados = lerFormulario();
  const tamanho = dados.descricao.length;

  charCount.textContent = tamanho >= MIN_DESCRICAO ? `${tamanho} caracteres` : `${tamanho}/${MIN_DESCRICAO}`;
  charCount.classList.toggle("ok", tamanho >= MIN_DESCRICAO);

  btnAnalisar.disabled = !formularioCompleto(dados);

  // Repetida aparece na hora; formato inválido só ao sair do campo ou enviar
  const problema = problemaAlvo(dados);
  if (problema === MENSAGENS_REPETIDA[dados.tipo]) {
    mostrarAvisoAlvo(problema);
  } else if (!problema) {
    mostrarAvisoAlvo(null);
  }
}

function aoEditar() {
  if (ultimaAnalise) {
    ultimaAnalise = null;
    mostrarVazio(true);
  }
  atualizarEstado();
}

radiosTipo.forEach((radio) => {
  radio.addEventListener("change", () => {
    Object.entries(CAMPOS).forEach(([tipo, { campo }]) => { campo.hidden = radio.value !== tipo; });
    CAMPOS[radio.value].input.focus();
    mostrarAvisoAlvo(null);
    aoEditar();
  });
});

[inputTelefone, inputLink, inputEmail, inputDescricao].forEach((el) => el.addEventListener("input", aoEditar));
[inputTelefone, inputLink, inputEmail].forEach((el) => {
  el.addEventListener("blur", () => mostrarAvisoAlvo(problemaAlvo(lerFormulario())));
});
btnAnalisar.addEventListener("click", analisar);

// ── ENVIO ───────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = await usuarioPronto;
  if (!user) return;

  const { tipo, valor, descricao } = lerFormulario();

  if (!tipo) {
    alert("Selecione o que você quer denunciar.");
    return;
  }
  if (!valor) {
    alert({ telefone: "Digite o telefone.", link: "Digite o link.", email: "Digite o email." }[tipo]);
    CAMPOS[tipo].input.focus();
    return;
  }
  const problema = problemaAlvo({ tipo, valor });
  if (problema) {
    mostrarAvisoAlvo(problema);
    CAMPOS[tipo].input.focus();
    return;
  }
  if (descricao.length < MIN_DESCRICAO) {
    alert(`Descreva o que aconteceu (mínimo ${MIN_DESCRICAO} caracteres).`);
    inputDescricao.focus();
    return;
  }

  btnEnviar.disabled = true;
  btnAnalisar.disabled = true;
  btnEnviar.textContent = "Enviando…";

  try {
    const perfil = await obterPerfil(user.uid);
    const nome = perfil?.nome || user.displayName || "Usuário";

    // Contas antigas ganham/migram a entrada do ranking antes de pontuar
    await sincronizarRanking(user.uid);

    const batch = writeBatch(db);
    const chave = chaveAlvo(tipo, valor);
    const idDoc = idDenuncia(user.uid, tipo, chave);

    // ID fixo por usuário + alvo: as regras recusam uma segunda denúncia igual
    batch.set(doc(db, "denuncias", idDoc), {
      [tipo]: valor,
      tipo,
      chave,
      descricao,
      data: new Date(),
      usuario_uid: user.uid,
      usuario_nome: nome,
      analise_ia: ultimaAnalise
        ? {
            risco: ultimaAnalise.risco,
            confianca: ultimaAnalise.confianca,
            padroes: ultimaAnalise.padroes,
            analise: ultimaAnalise.analise,
            modelo: ultimaAnalise.modelo
          }
        : null
    });

    batch.set(doc(db, "usuarios", user.uid), {
      xp: increment(XP_POR_DENUNCIA),
      denuncias: increment(1)
    }, { merge: true });

    // Perfil público: as regras só aceitam +3 XP / +10 moedas se esta
    // denúncia (ultimaDenuncia) for criada neste mesmo batch
    batch.update(doc(db, "ranking", user.uid), {
      xp: increment(XP_POR_DENUNCIA),
      denuncias: increment(1),
      moedas: increment(MOEDAS_POR_DENUNCIA),
      ultimaDenuncia: idDoc
    });

    await batch.commit();

    alert(`Denúncia enviada! Você ganhou ${XP_POR_DENUNCIA} XP e ${MOEDAS_POR_DENUNCIA} moedas.`);
    window.location.href = "perfil.html#denuncias";

  } catch (error) {
    console.error("Erro ao enviar denúncia:", error);
    alert(error.code === "permission-denied"
      ? "Não foi possível enviar: você já denunciou este alvo ou ainda não confirmou seu email."
      : "Erro ao enviar denúncia: " + error.message);
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Enviar denúncia";
    atualizarEstado();
  }
});

mostrarVazio();
atualizarEstado();
carregarMinhasDenuncias();
