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

**Multi-page app.** Each root HTML page loads its own `js/<page>.js` module. New pages must be added to `build.rollupOptions.input` in `vite.config.mjs`. Logged-in pages share the same static `<header class="topbar">` markup (copied per page, with `aria-current="page"` on the active link) and load `js/layout.js`, which runs the auth guard, wires `#btn-sair`, and exports `usuarioPronto` (a promise for the current user) — page scripts `await usuarioPronto` instead of calling `onAuthStateChanged` themselves.

**Firebase access goes only through `js/firebase.js`**, which re-exports every SDK function the pages use (npm `firebase` package). Need a new SDK function → add it to that file's import and export lists.

**Secrets boundary.** `GEMINI_API_KEY`/`GEMINI_MODEL` have no `VITE_` prefix, so they never reach the browser. `server/analisar.js` holds all Gemini logic (`processarAnalise(req, env)`): verifies the caller's Firebase ID token via the Identity Toolkit REST API, validates input, calls Gemini `generateContent` with a JSON `responseSchema`, and retries/falls back to a reserve model on 429/5xx. It is mounted twice: as Vite middleware in `vite.config.mjs` (dev/preview) and as a Vercel function in `api/analisar.js`. The browser (`js/denuncia.js`) calls it with `Authorization: Bearer <idToken>`. Never call Gemini or put a key in front-end code.

**Firestore data model** (rules in `firestore.rules`, published manually via the Firebase console):
- `usuarios/{uid}` — private: `nome`, `cpf`, `email`, `xp`, `denuncias`, `cuponsGanhos`, `dataCriacaoConta`. Owner-only.
- `ranking/{uid}` — public to logged-in users: `nome`, `xp`, `denuncias`. Exists so the leaderboard never downloads CPF/email. The rules only allow updates that add exactly +3 XP / +1 report.
- `denuncias/{id}` — `telefone` or `link` (key = `tipo`), `tipo`, `descricao`, `data`, `usuario_uid`, `usuario_nome`, `analise_ia` (or null). Immutable after creation.

`js/usuarios.js` owns the user docs: `criarPerfil` (signup and first Google login write both docs in a batch) and `sincronizarRanking` (backfills `ranking/{uid}` for accounts created before that collection existed; called on login and on the ranking page). A report submission is one `writeBatch`: the new `denuncias` doc + XP/count increments on `usuarios` and `ranking` (`XP_POR_DENUNCIA = 3`).

**Search flow.** `main.js` → `resultado.html?busca=<valor>`. `resultado.js` fetches all `denuncias` and filters client-side (letters or `/` means link, compared after normalization; otherwise phone, compared by digit suffix with at least 8 digits). Risk: 0 reports = baixo, 1–3 = médio, 4+ = alto.

**Rendering.** Anything user- or AI-generated inserted with `innerHTML` must go through `escapeHtml` from `js/util.js` (or use `textContent`). `util.js` also holds the XP level table (`nivelPorXp`).

**Styling.** One stylesheet, `css/style.css`, organized by page sections with design tokens in `:root`. Icons are inline SVG (`class="icon"`, stroke-based); the UI avoids emoji.
