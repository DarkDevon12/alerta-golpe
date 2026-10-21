import { usuarioPronto } from "./layout.js";
import { ehVisitante } from "./route-guard.js";
import { consultaGratisUsada, podeConsultarGratis } from "./consulta-gratis.js";

const form = document.getElementById("form-busca");
const input = document.getElementById("inputBusca");
const avisoVisitante = document.getElementById("aviso-visitante");

let visitante = true;

usuarioPronto.then((user) => {
  visitante = ehVisitante(user);
  if (!visitante) return;

  avisoVisitante.textContent = consultaGratisUsada() === null
    ? "Você tem 1 consulta grátis sem cadastro. Crie uma conta para consultar quantas vezes quiser."
    : "Você já usou sua consulta grátis. Entre ou crie uma conta para continuar consultando.";
  avisoVisitante.hidden = false;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const valor = input.value.trim();

  if (!valor) {
    input.focus();
    return;
  }

  await usuarioPronto;
  if (visitante && !podeConsultarGratis(valor)) {
    window.location.href = "login.html?aviso=limite";
    return;
  }

  // passa o valor pela URL em vez de localStorage
  window.location.href = `resultado.html?busca=${encodeURIComponent(valor)}`;
});

// Chips de exemplo preenchem o campo
document.querySelectorAll("[data-exemplo]").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.dataset.exemplo;
    input.focus();
  });
});
