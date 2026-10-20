const form = document.getElementById("form-busca");
const input = document.getElementById("inputBusca");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const valor = input.value.trim();

  if (!valor) {
    input.focus();
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
