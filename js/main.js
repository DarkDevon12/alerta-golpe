function buscar() {
  const valor = document.getElementById("inputBusca").value.trim();

  if (!valor) {
    alert("Digite um telefone ou link");
    return;
  }

  // passa o valor pela URL em vez de localStorage
  window.location.href = `resultado.html?busca=${encodeURIComponent(valor)}`;
}

// conecta o botão aqui no JS, não no HTML
document.getElementById("btnBuscar").addEventListener("click", buscar);