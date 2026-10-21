// Botão de "olhinho" nos campos de senha: alterna entre mostrar e
// esconder o que está sendo digitado.
const OLHO = '<svg class="icon" viewBox="0 0 24 24"><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/></svg>';
const OLHO_RISCADO = '<svg class="icon" viewBox="0 0 24 24"><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.97 0 8.4 3.6 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.44 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5A10.75 10.75 0 0 1 2.06 12.35a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/></svg>';

export function ativarOlhoSenha() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    const campo = document.createElement("div");
    campo.className = "campo-senha";
    input.replaceWith(campo);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-olho";

    const atualizar = (visivel) => {
      input.type = visivel ? "text" : "password";
      botao.innerHTML = visivel ? OLHO_RISCADO : OLHO;
      botao.setAttribute("aria-label", visivel ? "Ocultar senha" : "Mostrar senha");
      botao.setAttribute("aria-pressed", String(visivel));
    };

    botao.addEventListener("click", () => {
      atualizar(input.type === "password");
      input.focus();
    });

    atualizar(false);
    campo.append(input, botao);
  });
}
