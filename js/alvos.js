// Normalização dos "alvos" de denúncia (telefone, link e email).
//
// Cada alvo vira uma `chave`: duas denúncias com a mesma chave são do
// mesmo alvo. A chave é usada na busca e no ID do documento da denúncia
// (`{uid}_{tipo}_{chave}`), que é o que impede o mesmo usuário de
// denunciar o mesmo alvo duas vezes (ver firestore.rules). Por isso a
// chave nunca contém "/", que não é permitido em IDs do Firestore.

export const TIPOS = ["telefone", "link", "email"];

const REGEX_EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

// Telefone, link ou email, a partir do que o usuário digitou na busca
export function detectarTipo(texto) {
  const valor = String(texto || "").trim();
  if (REGEX_EMAIL.test(valor)) return "email";
  if (/[a-z]/i.test(valor) || valor.includes("/")) return "link";
  return "telefone";
}

// ── TELEFONE ────────────────────────────────────────────

export function normalizarTelefone(texto) {
  return String(texto || "").replace(/\D/g, "");
}

// Na busca, compara pelo final do número (com/sem DDD e +55)
export function telefonesBatem(tel1, tel2) {
  const norm1 = normalizarTelefone(tel1);
  const norm2 = normalizarTelefone(tel2);

  // Menos de 8 dígitos não identifica um número
  if (norm1.length < 8 || norm2.length < 8) return false;

  return norm1.endsWith(norm2) || norm2.endsWith(norm1);
}

// Chave = DDD + número (10 ou 11 dígitos), sem +55 nem zero de operadora.
// Devolve null se o número não tiver DDD.
export function chaveTelefone(texto) {
  let digitos = normalizarTelefone(texto).replace(/^0+/, "");
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  return digitos.length === 10 || digitos.length === 11 ? digitos : null;
}

// ── LINK ────────────────────────────────────────────────

// Segundo nível usado por países: casasbahia.com.br, loja.co.uk…
const SEGUNDO_NIVEL = new Set([
  "com", "net", "org", "gov", "edu", "co", "ac", "mil", "nom", "art", "blog",
  "app", "eco", "emp", "log", "ong", "tv", "wiki", "adv", "eng", "med", "ind", "inf", "srv", "tur"
]);

// Plataformas onde cada cliente ganha um subdomínio próprio
// (golpe-casasbahia.netlify.app é de quem criou, não da Netlify)
const PLATAFORMAS = new Set([
  "netlify.app", "vercel.app", "github.io", "web.app", "firebaseapp.com", "pages.dev",
  "workers.dev", "blogspot.com", "wixsite.com", "wordpress.com", "weebly.com",
  "herokuapp.com", "onrender.com", "glitch.me", "ngrok.io", "ngrok-free.app",
  "azurewebsites.net", "appspot.com", "000webhostapp.com", "squarespace.com"
]);

// Encurtadores e serviços em que o que identifica o golpe é o caminho
// (todo bit.ly/... é "bit.ly", mas bit.ly/abc e bit.ly/xyz são links diferentes)
const POR_CAMINHO = new Set([
  "bit.ly", "tinyurl.com", "cutt.ly", "is.gd", "t.co", "goo.gl", "ow.ly", "rebrand.ly",
  "shorturl.at", "rb.gy", "tiny.cc", "s.id", "encurtador.com.br", "abre.ai", "l.ead.me",
  "wa.me", "linktr.ee", "forms.gle", "sites.google.com", "docs.google.com", "drive.google.com"
]);

function dominioRegistravel(host) {
  const partes = host.split(".");
  if (partes.length < 2 || /^\d+$/.test(partes.at(-1))) return host; // IP ou sem TLD

  const ultimasDuas = partes.slice(-2).join(".");
  const sufixoComposto = PLATAFORMAS.has(ultimasDuas)
    || (partes.at(-1).length === 2 && SEGUNDO_NIVEL.has(partes.at(-2)));
  const tamanhoSufixo = sufixoComposto ? 2 : 1;

  return partes.length > tamanhoSufixo ? partes.slice(-(tamanhoSufixo + 1)).join(".") : host;
}

/**
 * Quebra um link em partes comparáveis. Ex.: "https://promo.casasbahia.com.br/pix"
 *   → { host: "promo.casasbahia.com.br", dominio: "casasbahia.com.br",
 *       nome: "casasbahia", chave: "casasbahia.com.br", exibicao: "casasbahia.com.br" }
 * `nome` é null nos encurtadores (lá o nome não diz nada sobre o golpe).
 * Devolve null se não der para ler o link.
 */
export function analisarLink(texto) {
  let bruto = String(texto || "").trim().toLowerCase();
  if (!bruto) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(bruto)) bruto = "http://" + bruto;

  let url;
  try {
    url = new URL(bruto);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
  if (!host) return null;

  if (POR_CAMINHO.has(host)) {
    const exibicao = host + url.pathname.replace(/\/+$/, "");
    return { host, dominio: host, nome: null, chave: exibicao.replaceAll("/", "|"), exibicao };
  }

  const dominio = dominioRegistravel(host);
  const ehIp = /^[\d.]+$/.test(host) || host.includes(":");
  return { host, dominio, nome: ehIp ? null : dominio.split(".")[0], chave: dominio, exibicao: dominio };
}

// Link válido para denúncia: precisa de um domínio de verdade (com ponto)
export function linkValido(texto) {
  const link = analisarLink(texto);
  return Boolean(link && link.host.includes("."));
}

// Nomes parecidos: iguais, ou um contém o outro (casasbahia × casasbahia-ofertas).
// Nomes curtos demais (bb, oi) só valem se forem idênticos.
export function nomesParecidos(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [menor, maior] = a.length <= b.length ? [a, b] : [b, a];
  return menor.length >= 4 && maior.includes(menor);
}

// ── EMAIL ───────────────────────────────────────────────

// Provedores onde qualquer pessoa cria conta: o domínio não diz nada
const PROVEDORES_GRATUITOS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com",
  "outlook.com.br", "live.com", "msn.com", "yahoo.com", "yahoo.com.br", "icloud.com",
  "me.com", "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br", "protonmail.com",
  "proton.me", "aol.com", "gmx.com", "zoho.com", "yandex.com", "mail.com"
]);

export function emailValido(texto) {
  return REGEX_EMAIL.test(String(texto || "").trim());
}

export function analisarEmail(texto) {
  const endereco = String(texto || "").trim().toLowerCase();
  if (!REGEX_EMAIL.test(endereco)) return null;

  const dominio = endereco.split("@")[1];
  return { endereco, dominio, gratuito: PROVEDORES_GRATUITOS.has(dominio), chave: endereco, exibicao: endereco };
}

// ── GERAL ───────────────────────────────────────────────

// Chave do alvo (ou null se o valor for inválido para o tipo)
export function chaveAlvo(tipo, valor) {
  if (tipo === "telefone") return chaveTelefone(valor);
  if (tipo === "link") return linkValido(valor) ? analisarLink(valor).chave : null;
  if (tipo === "email") return analisarEmail(valor)?.chave || null;
  return null;
}

// ID do documento da denúncia: um por usuário e alvo
export function idDenuncia(uid, tipo, chave) {
  return `${uid}_${tipo}_${chave}`;
}
