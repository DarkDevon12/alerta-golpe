import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import { processarAnalise } from "./server/analisar.js";
import { registrarCpf } from "./server/registrar-cpf.js";
import { excluirConta } from "./server/excluir-conta.js";

// Rotas de /api atendidas pelo Vite (no deploy, são as funções em api/)
const ROTAS_API = {
  "/api/analisar": processarAnalise,
  "/api/registrar-cpf": registrarCpf,
  "/api/excluir-conta": excluirConta
};

// Serve as rotas /api dentro do próprio Vite (dev e preview), para as
// chaves (Gemini, firebase-admin, CPF_PEPPER) ficarem só no servidor.
function apiLocal(env) {
  const middleware = (req, res, next) => {
    const tratar = ROTAS_API[req.url];
    if (!tratar) return next();

    let bruto = "";
    req.on("data", chunk => {
      bruto += chunk;
      if (bruto.length > 20000) req.destroy();
    });
    req.on("end", async () => {
      let body = null;
      try { body = JSON.parse(bruto || "{}"); } catch { /* validado em processarAnalise */ }

      const resultado = await tratar(
        { method: req.method, headers: req.headers, body },
        env
      );

      res.statusCode = resultado.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(resultado.body));
    });
  };

  return {
    name: "api-local",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); }
  };
}

export default defineConfig(({ mode }) => {
  // "" = carrega também as variáveis sem prefixo VITE_ (ex.: GEMINI_API_KEY).
  // Elas ficam só no Node; o Vite só injeta no front as que começam com VITE_.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [apiLocal(env)],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
          login: resolve(__dirname, "login.html"),
          cadastro: resolve(__dirname, "cadastro.html"),
          denunciar: resolve(__dirname, "denunciar.html"),
          ranking: resolve(__dirname, "ranking.html"),
          perfil: resolve(__dirname, "perfil.html"),
          resultado: resolve(__dirname, "resultado.html"),
          privacidade: resolve(__dirname, "privacidade.html"),
          termos: resolve(__dirname, "termos.html")
        }
      }
    }
  };
});
