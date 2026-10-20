// Escapa texto antes de inserir via innerHTML (nomes, relatos e
// respostas da IA vêm de usuários e não podem virar HTML).
export function escapeHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function iniciais(nome) {
  const partes = String(nome || "?").trim().split(/\s+/);
  const primeira = partes[0]?.[0] || "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// Níveis de XP usados no ranking
const NIVEIS = [
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
