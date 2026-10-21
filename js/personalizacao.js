// Catálogo de personalização: avatares, bordas e temas.
//
// Cada item é grátis, comprado com moedas (`preco`) ou liberado ao chegar
// a um nível (`xpMinimo`). Moedas vêm das denúncias (MOEDAS_POR_DENUNCIA).
//
// IMPORTANTE: firestore.rules repete os IDs, preços e XP mínimos
// (funções gratis(), precos() e porNivel()). Ao mudar o catálogo aqui,
// mude lá também, senão a compra é recusada.
import { escapeHtml, iniciais } from "./util.js";

export const MOEDAS_POR_DENUNCIA = 10;

// Campos de personalização com que todo perfil começa
export const PERFIL_PADRAO = {
  itens: [],
  avatar: "iniciais",
  borda: "sem-borda",
  tema: "escuro",
  perfilPublico: false
};

export const ICONE_MOEDA = '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.9 2.5 2-1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5"/><path d="M12 6.5V8M12 16v1.5"/></svg>';

export const AVATARES = [
  { id: "iniciais", nome: "Iniciais" },
  { id: "escudo", nome: "Escudo", fundo: "#15803d", icone: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>' },
  { id: "lupa", nome: "Detetive", fundo: "#0369a1", icone: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>' },
  { id: "cadeado", nome: "Cadeado", fundo: "#b45309", icone: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
  { id: "olho", nome: "Olho vivo", fundo: "#0f766e", icone: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>' },
  { id: "raio", nome: "Raio", fundo: "#a16207", icone: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>' },
  { id: "coracao", nome: "Coração", fundo: "#be123c", icone: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
  { id: "trofeu", nome: "Troféu", xpMinimo: 100, fundo: "linear-gradient(135deg, #854d0e, #ca8a04)", icone: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>' },
  { id: "coroa", nome: "Coroa", preco: 30, fundo: "linear-gradient(135deg, #b45309, #facc15)", icone: '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.27-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.67a1 1 0 0 0 1.52-.3z"/><path d="M5 21h14"/>' },
  { id: "foguete", nome: "Foguete", preco: 30, fundo: "linear-gradient(135deg, #4338ca, #db2777)", icone: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>' },
  { id: "diamante", nome: "Diamante", preco: 30, fundo: "linear-gradient(135deg, #0e7490, #67e8f9)", icone: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>' },
  { id: "chama", nome: "Chama", preco: 30, fundo: "linear-gradient(135deg, #b91c1c, #f97316)", icone: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>' },
  { id: "estrela", nome: "Estrela", preco: 30, fundo: "linear-gradient(135deg, #6d28d9, #c084fc)", icone: '<path d="M11.53 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.91l5.16-.75a2.12 2.12 0 0 0 1.6-1.16z"/>' },
  { id: "lua", nome: "Lua", preco: 30, fundo: "linear-gradient(135deg, #1e1b4b, #6366f1)", icone: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' }
];

export const BORDAS = [
  { id: "sem-borda", nome: "Sem borda" },
  { id: "bronze", nome: "Bronze", xpMinimo: 30 },
  { id: "prata", nome: "Prata", preco: 20 },
  { id: "ouro", nome: "Ouro", preco: 40 },
  { id: "neon", nome: "Neon", preco: 60 },
  { id: "fogo", nome: "Fogo", preco: 80 },
  { id: "arco-iris", nome: "Arco-íris", preco: 100 },
  { id: "lenda", nome: "Lenda", xpMinimo: 500 }
];

// `amostra`: fundo, cartão e destaque, para a prévia na loja
export const TEMAS = [
  { id: "escuro", nome: "Escuro", amostra: ["#0a0f1e", "#111827", "#22c55e"] },
  { id: "claro", nome: "Claro", amostra: ["#f3f5f9", "#ffffff", "#16a34a"] },
  { id: "contraste", nome: "Alto contraste", amostra: ["#000000", "#000000", "#fde047"] },
  { id: "oceano", nome: "Oceano", preco: 50, amostra: ["#03131c", "#072230", "#22d3ee"] },
  { id: "aurora", nome: "Aurora", preco: 50, amostra: ["#0f0a1e", "#1a1030", "#c084fc"] },
  { id: "terminal", nome: "Terminal", preco: 80, amostra: ["#000000", "#050a05", "#4ade80"] }
];

const TODOS = new Map([...AVATARES, ...BORDAS, ...TEMAS].map((item) => [item.id, item]));

export function obterItem(id) {
  return TODOS.get(id) || null;
}

/**
 * Situação de um item para o perfil:
 *   "em-uso" | "liberado" | "comprar" | "nivel" (falta XP)
 */
export function situacaoItem(item, perfil, campo) {
  if (perfil[campo] === item.id) return "em-uso";
  if (item.preco) return perfil.itens?.includes(item.id) ? "liberado" : "comprar";
  if (item.xpMinimo) return (perfil.xp || 0) >= item.xpMinimo ? "liberado" : "nivel";
  return "liberado";
}

// ── AVATAR ──────────────────────────────────────────────

// Cor do avatar de iniciais derivada do nome, para cada pessoa ter sempre a mesma
function hue(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/**
 * HTML do avatar com a borda escolhida.
 * `tamanho`: "" (40px), "avatar-sm", "avatar-lg" ou "avatar-xl".
 */
export function renderAvatar({ nome, avatar, borda } = {}, tamanho = "") {
  const item = obterItem(avatar);
  const comIcone = Boolean(item?.icone);
  const conteudo = comIcone
    ? `<svg class="icon" viewBox="0 0 24 24">${item.icone}</svg>`
    : escapeHtml(iniciais(nome));
  const estilo = comIcone ? `--avatar-fundo:${item.fundo}` : `--hue:${hue(nome)}`;
  const classeBorda = obterItem(borda) && borda !== "sem-borda" ? ` borda-${borda}` : "";

  return `<span class="avatar-moldura ${tamanho}${classeBorda}"><span class="avatar${comIcone ? " avatar-icone" : ""}" style="${estilo}">${conteudo}</span></span>`;
}

// ── TEMA ────────────────────────────────────────────────
// O tema fica também no navegador para ser aplicado antes da página
// aparecer (script inline no <head> de cada página).

const CHAVE_TEMA = "alertagolpe:tema";

export function aplicarTema(id, { salvar = true } = {}) {
  const tema = obterItem(id) ? id : "escuro";
  if (tema === "escuro") {
    delete document.documentElement.dataset.tema;
  } else {
    document.documentElement.dataset.tema = tema;
  }
  if (!salvar) return;
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch { /* sem storage: o tema volta do perfil no próximo carregamento */ }
}
