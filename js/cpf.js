// Validação e formatação de CPF. Módulo puro: usado no navegador (cadastro)
// e no servidor (server/registrar-cpf.js).

export function somenteDigitos(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

// Valida o tamanho e os dígitos verificadores
export function validarCPF(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function formatarCPF(cpf) {
  const d = somenteDigitos(cpf);
  return d.length <= 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
}
