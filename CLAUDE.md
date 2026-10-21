# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AlertaGolpe — a TCC (undergraduate thesis) web app, in Portuguese, where logged-in users look up whether a phone number or link has been reported as a scam, submit reports (with an AI risk analysis from Google Gemini), and earn XP on a leaderboard. Plain HTML/CSS/vanilla JS (ES modules), Firebase Auth + Firestore, bundled with Vite. Code, identifiers, UI text and comments are in Portuguese — keep it that way.

## Commands

- `npm run dev` — Vite dev server; also serves `POST /api/analisar`
- `npm run build` — multi-page build into `dist/` (gitignored)
- `npm run preview` — serve the build; also serves `/api/analisar`

No tests or linter. The app must run through Vite: Firebase config comes from `import.meta.env` and the AI analysis needs the `/api/analisar` middleware, so Live Server / `file://` will not work. Secrets live in `.env` (gitignored; template in `.env.example`).

## Architecture

**Multi-page app.** Each root HTML page loads its own `js/<page>.js` module. New pages must be added to `build.rollupOptions.input` in `vite.config.mjs`. Logged-in pages share the same static `<header class="topbar">` markup (copied per page, with `aria-current="page"` on the active link) and load `js/layout.js`, which runs the auth guard, wires `#btn-sair`, and exports `usuarioPronto` (a promise for the current user) — page scripts `await usuarioPronto` instead of calling `onAuthStateChanged` themselves. Pages with `<body data-visitante>` (`index.html`, `resultado.html`) skip the guard and resolve `usuarioPronto` to the user, an anonymous user, or null; use `ehVisitante(user)` from `js/route-guard.js` (true for null, anonymous, or email not verified).

**Guest free search.** Visitors get one search without an account: `js/consulta-gratis.js` stores the searched value in localStorage (re-opening the same result is allowed; a different one redirects to `login.html?aviso=limite`). `resultado.js` signs the visitor in with Firebase Anonymous Auth (provider must be enabled in the console) so the rules allow reading `denuncias`, and shows only risk + count, not the reports. Anonymous sessions are not "logged in": `logado()` in `firestore.rules` excludes `sign_in_provider == "anonymous"`, `protegerRota` redirects them, and `server/analisar.js` rejects tokens with no linked provider.

**Auth pages.** Password reset uses Firebase `sendPasswordResetEmail` (link by email, `auth.languageCode = "pt-BR"`), in a panel inside `login.html`. Signup (`cadastro.html`) is a one-question-per-step wizard (nome → CPF → email → senha) driven by `VALIDACOES` in `js/cadastro.js`. `ativarOlhoSenha()` from `js/olho-senha.js` adds the show/hide toggle to every password input on the page.

**Email verification.** Email/password accounts must confirm their email before using the app (`enviarEmailVerificacao` in `js/verificacao-email.js`, sent at signup; `login.html` has a "Confirme seu email" panel with resend / "Já confirmei", which reloads the user and forces a fresh token). Enforced in three places: `protegerRota`, `verificado()` in `firestore.rules` (creating `denuncias`, +3 XP on `ranking`), and `server/analisar.js` (`emailVerified`). Profile docs are still created right after signup, before verification.

**Report targets (`js/alvos.js`).** Reports are of `tipo` `telefone`, `link` or `email`. Each value maps to a `chave` (`chaveAlvo`): phone = DDD + number (10–11 digits, DDD required); link = registrable domain (`casasbahia.com.br`, subdomains and paths ignored; hosting platforms like `netlify.app` count the customer's subdomain; shorteners like `bit.ly` keep the path, with `/` replaced by `|`); email = lowercased address. The `denuncias` doc ID is `{uid}_{tipo}_{chave}` and the rules check it, so a user can report each target only once (a second create would be an update, which is denied); `denuncia.js` also checks the user's earlier reports to warn early. Keys never contain `/`.

**Firebase access goes only through `js/firebase.js`**, which re-exports every SDK function the pages use (npm `firebase` package). Need a new SDK function → add it to that file's import and export lists.

**Secrets boundary.** `GEMINI_API_KEY`/`GEMINI_MODEL` have no `VITE_` prefix, so they never reach the browser. `server/analisar.js` holds all Gemini logic (`processarAnalise(req, env)`): verifies the caller's Firebase ID token via the Identity Toolkit REST API, validates input, calls Gemini `generateContent` with a JSON `responseSchema`, and retries/falls back to a reserve model on 429/5xx. It is mounted twice: as Vite middleware in `vite.config.mjs` (dev/preview) and as a Vercel function in `api/analisar.js`. The browser (`js/denuncia.js`) calls it with `Authorization: Bearer <idToken>`. Never call Gemini or put a key in front-end code.

**Firestore data model** (rules in `firestore.rules`, published manually via the Firebase console):
- `usuarios/{uid}` — private: `nome`, `cpf`, `email`, `xp`, `denuncias`, `cuponsGanhos`, `dataCriacaoConta`. Owner-only.
- `ranking/{uid}` — the public profile, readable by logged-in users: `nome`, `xp`, `denuncias`, `moedas`, `itens` (bought), `avatar`, `borda`, `tema`, `perfilPublico`, `ultimaDenuncia`, `ultimaCompra`. Exists so the leaderboard never downloads CPF/email; coins live here (not in the owner-writable `usuarios`) because the rules validate every change. Allowed writes: create zeroed; migrate a pre-shop entry (adds the new fields, 10 coins per past report); report (+3 XP, +1, +10 coins, only if the `denuncias/{ultimaDenuncia}` doc is created in the same batch); buy (one item from `precos()`, exact price, balance ≥ 0); personalize (nome/avatar/borda/tema/perfilPublico, only usable items).
- `denuncias/{uid}_{tipo}_{chave}` (older docs have random IDs and no `chave`) — `telefone`, `link` or `email` (key = `tipo`), `tipo`, `chave`, `descricao`, `data`, `usuario_uid`, `usuario_nome`, `analise_ia` (or null). Readable by any session (including anonymous), created only by real accounts, immutable after creation.

`js/usuarios.js` owns the user docs: `criarPerfil` (signup and first Google login write both docs in a batch) and `sincronizarRanking` (backfills `ranking/{uid}` for accounts created before that collection existed; called on login and on the ranking page). A report submission is one `writeBatch`: the new `denuncias` doc + XP/count increments on `usuarios` and `ranking` (`XP_POR_DENUNCIA = 3`).

**Search flow.** `main.js` → `resultado.html?busca=<valor>`. `resultado.js` fetches all `denuncias` and filters client-side, recomputing keys from the stored value (so old docs work). `detectarTipo`: email pattern → email; letters or `/` → link; otherwise phone (compared by digit suffix with at least 8 digits). Exact matches (same `chave`) drive the risk: 0 = baixo, 1–3 = médio, 4+ = alto. "Parecidos" — links whose name matches or contains the searched one (`nomesParecidos`, e.g. `casasbahia.org` when searching `casasbahia.com.br`), or other emails on the same non-free domain — are listed in a separate warning card and do not affect the risk, so the real site is not flagged because of a fake.

**Profile, shop and themes.** `js/personalizacao.js` is the catalog (avatars, borders, themes; each free, `preco` in coins, or `xpMinimo`), plus `renderAvatar` (avatar + border markup, used by the topbar menu, ranking and profile) and `aplicarTema`. The IDs, prices and XP thresholds are duplicated in `firestore.rules` (`gratis()`, `precos()`, `porNivel()`) — change both together. `layout.js` exports `perfilPronto` (the user's `ranking` doc via `sincronizarRanking`), applies the profile theme, and replaces `.topbar-user` with the avatar menu (`atualizarMenuPerfil` refreshes it). `perfil.html` (`js/perfil.js`) shows the own profile (tabs: visão geral with level progress/achievements, loja, minhas denúncias) or someone else's via `?uid=` (reports listed only if `perfilPublico`; this is a UI choice, the `denuncias` collection itself is readable by any session). Themes are `data-tema` on `<html>` overriding the `:root` tokens; every page has an inline `<head>` script that applies the theme from localStorage (`alertagolpe:tema`) before paint — new pages need it too.

**Rendering.** Anything user- or AI-generated inserted with `innerHTML` must go through `escapeHtml` from `js/util.js` (or use `textContent`). `util.js` also holds the XP level table (`nivelPorXp`).

**Styling.** One stylesheet, `css/style.css`, organized by page sections with design tokens in `:root`. Icons are inline SVG (`class="icon"`, stroke-based); the UI avoids emoji.
