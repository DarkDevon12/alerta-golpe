import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
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
});