// POST /api/gerar-cupom — troca moedas por um cupom de desconto da loja
// parceira (Dr. Filamento). O cupom é um código único gravado em cupons/{codigo};
// o cliente manda o código à loja (WhatsApp) e o dono dá baixa com
// scripts/cupom.mjs.
//
// Roda só no servidor (firebase-admin): o cliente não tem acesso de escrita a
// cupons nem às moedas, então não dá para forjar código nem saldo.
//
// Limite "por CPF": cada CPF (protegido, HMAC de cpfs/) resgata no máximo um
// cupom de cada tipo — resgates/{hmac}_{tipo}. O CPF nunca é gravado. Quem
// entrou com Google (sem CPF no cadastro) informa o CPF na primeira vez.
import { randomInt } from "node:crypto";
import { obterAdmin, verificarToken, responder, ErroHttp } from "./admin.js";
import { exigirPepper, vincularCpf } from "./registrar-cpf.js";
import { CUPONS } from "../js/cupons.js";

// Sem 0/O, 1/I/L: o código é digitado e ditado pelo cliente
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function gerarCodigo() {
  const trecho = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `DRF-${trecho()}-${trecho()}`;
}

export function gerarCupom(req, env) {
  return responder(async () => {
    if (req.method !== "POST") throw new ErroHttp(405, "Use POST.");
    exigirPepper(env);

    const admin = obterAdmin(env);
    const { db } = admin;
    const token = await verificarToken(admin.auth, req.headers.authorization);
    const uid = token.uid;

    if (token.email_verified !== true) throw new ErroHttp(403, "Confirme seu email para pegar cupons.");

    const oferta = CUPONS.find((c) => c.id === req.body?.tipo);
    if (!oferta) throw new ErroHttp(400, "Cupom inválido.");

    // CPF protegido desta conta (quem veio do Google ainda pode não ter)
    const achou = await db.collection("cpfs").where("uid", "==", uid).limit(1).get();
    let hash = achou.empty ? null : achou.docs[0].id;
    if (!hash) {
      const cpf = String(req.body?.cpf ?? "");
      if (!cpf) throw new ErroHttp(400, "Informe seu CPF para pegar cupons.", { codigo: "cpf-necessario" });
      hash = await vincularCpf(admin, uid, cpf, env.CPF_PEPPER);
    }

    const ranking = db.collection("ranking").doc(uid);
    const resgate = db.collection("resgates").doc(`${hash}_${oferta.id}`);

    // Poucas tentativas: colisão de código é praticamente impossível (31^8)
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const codigo = gerarCodigo();
      const cupomRef = db.collection("cupons").doc(codigo);

      const criado = await db.runTransaction(async (t) => {
        const [perfil, jaResgatou, existe] = await Promise.all([t.get(ranking), t.get(resgate), t.get(cupomRef)]);

        if (jaResgatou.exists) throw new ErroHttp(409, "Você já pegou este cupom. Cada CPF pode pegar um de cada tipo.");
        if (existe.exists) return null; // colisão: tenta outro código
        if (!perfil.exists) throw new ErroHttp(404, "Perfil não encontrado.");

        const moedas = perfil.data().moedas || 0;
        if (moedas < oferta.preco) {
          throw new ErroHttp(400, `Faltam ${oferta.preco - moedas} moedas para este cupom.`);
        }

        const agora = new Date();
        t.update(ranking, { moedas: moedas - oferta.preco });
        t.set(resgate, { uid, tipo: oferta.id, codigo, criadoEm: agora });
        t.set(cupomRef, {
          codigo,
          uid, // só para a pessoa ver os próprios cupons; nenhum dado pessoal aqui
          tipo: oferta.id,
          percentual: oferta.percentual,
          limiteDesconto: oferta.limiteDesconto, // em reais; null = sem limite
          moedas: oferta.preco,
          status: "ativo",
          criadoEm: agora,
          usadoEm: null
        });
        return { codigo, moedas: moedas - oferta.preco };
      });

      if (criado) {
        return {
          status: 200,
          body: { ok: true, codigo: criado.codigo, moedas: criado.moedas, tipo: oferta.id, criadoEm: new Date().toISOString() }
        };
      }
    }
    throw new ErroHttp(500, "Não foi possível gerar o código. Tente de novo.");
  });
}
