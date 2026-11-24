// Cupons de desconto da loja parceira Dr. Filamento (impressão 3D).
// Usado pela página de perfil (loja) e pelo servidor (server/cupons.js),
// que confere o preço: o cliente nunca decide o valor.
//
// `limiteDesconto`: teto do desconto em reais (null = sem teto).

export const LOJA_PARCEIRA = {
  nome: "Dr. Filamento",
  site: "https://dr-filamento.vercel.app/",
  // WhatsApp da loja, só dígitos com DDI+DDD (ex.: "5517999999999").
  // Vazio = o botão do WhatsApp não aparece e a pessoa só vê o código.
  whatsapp: "5517981117587",
};

export const CUPONS = [
  {
    id: "cupom-5",
    nome: "5% de desconto",
    percentual: 5,
    limiteDesconto: null,
    preco: 500,
    descricao: "5% de desconto em qualquer peça"
  },
  {
    id: "cupom-10",
    nome: "10% de desconto",
    percentual: 10,
    limiteDesconto: 50,
    preco: 1000,
    descricao: "10% de desconto, limitado a R$ 50"
  }
];

export function obterCupom(id) {
  return CUPONS.find((c) => c.id === id) || null;
}
