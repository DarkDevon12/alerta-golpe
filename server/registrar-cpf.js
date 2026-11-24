// POST /api/registrar-cpf — guarda uma "impressão digital" protegida do CPF
// para limitar uma conta por pessoa, sem nunca gravar o CPF.
//
// HMAC-SHA256 com um segredo (CPF_PEPPER) que fica só no servidor: um hash
// simples seria fácil de reverter, porque só existem ~10^9 CPFs possíveis.
// O CPF chega por HTTPS, é usado na memória e descartado.
import { createHmac } from "node:crypto";
import { obterAdmin, verificarToken, responder, ErroHttp } from "./admin.js";
import { validarCPF, somenteDigitos } from "../js/cpf.js";

export function hmacCpf(cpf, pepper) {
  return createHmac("sha256", pepper).update(somenteDigitos(cpf)).digest("hex");
}

export function exigirPepper(env) {
  if (!env.CPF_PEPPER || env.CPF_PEPPER.length < 16) {
    throw new ErroHttp(500, "CPF_PEPPER não configurado no servidor (mínimo 16 caracteres).");
  }
}

// Vincula o CPF (protegido) à conta. Devolve o HMAC. 409 se já é de outra conta.
export async function vincularCpf({ auth, db }, uid, cpf, pepper) {
  if (!validarCPF(cpf)) throw new ErroHttp(400, "CPF inválido.");

  const hash = hmacCpf(cpf, pepper);
  const ref = db.collection("cpfs").doc(hash);

  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (snap.exists && snap.data().uid !== uid) {
      // Se a conta dona do registro não existe mais, o CPF fica livre
      const donoExiste = await auth.getUser(snap.data().uid).then(() => true, () => false);
      if (donoExiste) throw new ErroHttp(409, "Já existe uma conta com esse CPF.");
    }
    t.set(ref, { uid, criadoEm: new Date() });
  });

  return hash;
}

export function registrarCpf(req, env) {
  return responder(async () => {
    if (req.method !== "POST") throw new ErroHttp(405, "Use POST.");
    exigirPepper(env);

    const admin = obterAdmin(env);
    const { uid } = await verificarToken(admin.auth, req.headers.authorization);

    await vincularCpf(admin, uid, String(req.body?.cpf ?? ""), env.CPF_PEPPER);

    return { status: 200, body: { ok: true } };
  });
}
