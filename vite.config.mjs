import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import { processarAnalise } from "./server/analisar.js";

// Serve POST /api/analisar dentro do próprio Vite (dev e preview),
// para a chave do Gemini ficar só no servidor.
function apiAnalisar(env) {
  const middleware = (req, res, next) => {
    if (req.url !== "/api/analisar") return next();

    let bruto = "";
    req.on("data", chunk => {
      bruto += chunk;
      if (bruto.length > 20000) req.destroy();
    });
    req.on("end", async () => {
      let body = null;
      try { body = JSON.parse(bruto || "{}"); } catch { /* validado em processarAnalise */ }

      const resultado = await processarAnalise(
        { method: req.method, headers: req.headers, body },
        env
      );

      res.statusCode = resultado.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(resultado.body));
    });
  };

  return {
    name: "api-analisar",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); }
  };
}

export default defineConfig(({ mode }) => {
  // "" = carrega também as variáveis sem prefixo VITE_ (ex.: GEMINI_API_KEY).
  // Elas ficam só no Node; o Vite só injeta no front as que começam com VITE_.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [apiAnalisar(env)],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
          login: resolve(__dirname, "login.html"),
          cadastro: resolve(__dirname, "cadastro.html"),
          denunciar: resolve(__dirname, "denunciar.html"),
          ranking: resolve(__dirname, "ranking.html"),
          resultado: resolve(__dirname, "resultado.html")
        }
      }
    }
  };
});
