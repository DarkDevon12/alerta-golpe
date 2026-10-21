// Comportamento comum das páginas com a topbar: exige login, aplica o
// tema do perfil e troca o "Sair" pela bolinha do perfil (avatar), que
// abre um menu com perfil, loja, denúncias e Sair.
//
// Páginas com <body data-visitante> (início e resultado) também abrem sem
// login, para a consulta grátis; nelas o "Sair" vira um link "Entrar".
import { auth, signOut } from "./firebase.js";
import { obterUsuarioAtual, protegerRota, ehVisitante } from "./route-guard.js";
import { sincronizarRanking } from "./usuarios.js";
import { renderAvatar, aplicarTema, ICONE_MOEDA } from "./personalizacao.js";
import { escapeHtml, nivelPorXp } from "./util.js";

const aceitaVisitante = document.body.hasAttribute("data-visitante");

export const usuarioPronto = aceitaVisitante ? obterUsuarioAtual() : protegerRota();

// Perfil público (ranking/{uid}) do usuário logado, ou null para visitantes
export const perfilPronto = usuarioPronto.then((user) =>
  ehVisitante(user) ? null : sincronizarRanking(user.uid).catch((e) => {
    console.warn("Perfil:", e.message);
    return null;
  })
);

usuarioPronto.then((user) => {
  if (ehVisitante(user) && aceitaVisitante) trocarSairPorEntrar();
});

perfilPronto.then((perfil) => {
  if (!perfil) return;
  aplicarTema(perfil.tema);
  montarMenuPerfil(perfil);
});

function trocarSairPorEntrar() {
  const entrar = document.createElement("a");
  entrar.href = "login.html";
  entrar.className = "btn-sair btn-entrar";
  entrar.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>Entrar';
  document.getElementById("btn-sair")?.replaceWith(entrar);
}

async function sair() {
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    alert("Erro ao sair: " + error.message);
  }
}

// Enquanto o perfil carrega, o botão "Sair" original continua funcionando
document.getElementById("btn-sair")?.addEventListener("click", sair);

// Atualiza a bolinha e o menu (a página de perfil chama depois de editar)
export function atualizarMenuPerfil(perfil) {
  const botao = document.querySelector(".menu-perfil-btn");
  if (!botao) return montarMenuPerfil(perfil);

  const nivel = nivelPorXp(perfil.xp || 0);
  botao.innerHTML = renderAvatar(perfil, "avatar-sm");
  document.querySelector(".menu-perfil-cab").innerHTML = `
    ${renderAvatar(perfil)}
    <div>
      <strong>${escapeHtml(perfil.nome)}</strong>
      <span>${nivel.nome} · ${perfil.xp || 0} XP</span>
    </div>`;
  document.querySelector(".menu-perfil-moedas b").textContent = perfil.moedas || 0;
}

function montarMenuPerfil(perfil) {
  const area = document.querySelector(".topbar-user");
  if (!area) return;

  area.innerHTML = `
    <div class="menu-perfil">
      <button type="button" class="menu-perfil-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Abrir menu do perfil"></button>
      <div class="menu-perfil-painel" role="menu" hidden>
        <div class="menu-perfil-cab"></div>
        <div class="menu-perfil-moedas">${ICONE_MOEDA}<b></b> moedas</div>
        <a href="perfil.html" role="menuitem"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>Meu perfil</a>
        <a href="perfil.html#loja" role="menuitem"><svg class="icon" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Loja</a>
        <a href="perfil.html#denuncias" role="menuitem"><svg class="icon" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>Minhas denúncias</a>
        <button type="button" class="menu-perfil-sair" role="menuitem"><svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>Sair</button>
      </div>
    </div>`;

  atualizarMenuPerfil(perfil);

  const botao = area.querySelector(".menu-perfil-btn");
  const painel = area.querySelector(".menu-perfil-painel");

  const abrir = (aberto) => {
    painel.hidden = !aberto;
    botao.setAttribute("aria-expanded", String(aberto));
  };

  botao.addEventListener("click", (e) => {
    e.stopPropagation();
    abrir(painel.hidden);
  });
  painel.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => abrir(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !painel.hidden) {
      abrir(false);
      botao.focus();
    }
  });

  // Links com # na própria página de perfil só trocam a aba
  painel.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => abrir(false)));
  area.querySelector(".menu-perfil-sair").addEventListener("click", sair);
}
