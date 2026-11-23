// Escapa texto antes de inserir via innerHTML (nomes, relatos e
// respostas da IA vêm de usuários e não podem virar HTML).
export function escapeHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function iniciais(nome) {
  const partes = (String(nome || "").replace(/[^\p{L}\p{N} ]/gu, "").trim() || "?").split(/\s+/);
  const primeira = partes[0]?.[0] || "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// Níveis de XP usados no ranking
export const NIVEIS = [
  { min: 500, nome: "Lenda" },
  { min: 250, nome: "Sentinela" },
  { min: 100, nome: "Guardião" },
  { min: 30, nome: "Vigilante" },
  { min: 0, nome: "Iniciante" }
];

export function nivelPorXp(xp) {
  const indice = NIVEIS.findIndex((n) => xp >= n.min);
  const atual = NIVEIS[indice];
  const proximo = NIVEIS[indice - 1] || null;
  return { nome: atual.nome, min: atual.min, proximo };
}

// ── Nome público ────────────────────────────────────────
// Outras pessoas nunca veem o nome real: só o apelido (ou "Protetor #1234",
// um código fixo derivado do uid, quando não há apelido ou a pessoa pediu
// para aparecer como anônima).

export function codigoAnonimo(uid) {
  let h = 0;
  for (const c of String(uid || "")) h = (h * 31 + c.charCodeAt(0)) % 10000;
  return String(h).padStart(4, "0");
}

export function nomePublico({ apelido, anonimo, uid } = {}) {
  const a = String(apelido || "").trim();
  return !anonimo && a ? a : `Protetor #${codigoAnonimo(uid)}`;
}

// Apelido: vazio (usa o anônimo) ou 3 a 20 caracteres, sem email nem telefone.
// Devolve a mensagem de erro ou null. As regras do Firestore repetem isto.
export function erroApelido(apelido) {
  const a = String(apelido || "").trim();
  if (a === "") return null;
  if (a.length < 3 || a.length > 20) return "O apelido precisa ter de 3 a 20 caracteres.";
  if (a.includes("@")) return "O apelido não pode ser um email.";
  if ((a.match(/\d/g) || []).length >= 8) return "O apelido não pode conter telefone ou números longos.";
  return null;
}
