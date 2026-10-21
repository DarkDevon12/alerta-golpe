// Visitantes sem conta podem fazer UMA consulta. O valor consultado fica
// salvo no navegador, então recarregar a mesma página de resultado
// continua funcionando, mas uma busca diferente pede login.
//
// É um limite de conveniência (dá para limpar o navegador); o que protege
// os dados de verdade são as regras do Firestore.
const CHAVE = "alertagolpe:consultaGratis";

export function consultaGratisUsada() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function registrarConsultaGratis(valor) {
  try {
    localStorage.setItem(CHAVE, valor);
  } catch { /* navegador sem storage: segue sem limitar */ }
}

// Pode consultar `valor`? Sim se ainda não usou, ou se é a mesma consulta.
export function podeConsultarGratis(valor) {
  const usada = consultaGratisUsada();
  return usada === null || usada === valor;
}
