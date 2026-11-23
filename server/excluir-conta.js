// POST /api/excluir-conta — apaga a conta e os dados pessoais do usuário.
//
// Apaga: usuarios/{uid}, ranking/{uid}, o registro protegido do CPF e as
// denúncias privadas (denuncias, onde fica o uid). Os "relatos" públicos
// não têm uid nem nome (ver firestore.rules), então já estão anonimizados e
// permanecem para a prevenção coletiva. Por último remove o login.
//
// Idempotente: se algum passo falhar, o login ainda existe e o usuário pode
// tentar de novo; nada fica órfão sem como ser removido.
import { obterAdmin, verificarToken, responder, ErroHttp } from "./admin.js";

const JANELA_LOGIN_RECENTE_S = 5 * 60;

export function excluirConta(req, env) {
  return responder(async () => {
    if (req.method !== "POST") throw new ErroHttp(405, "Use POST.");

    const { auth, db } = obterAdmin(env);
    const token = await verificarToken(auth, req.headers.authorization);
    const uid = token.uid;

    // Ação sensível: exige login feito há pouco (o front pede a senha de novo)
    if (Date.now() / 1000 - token.auth_time > JANELA_LOGIN_RECENTE_S) {
      throw new ErroHttp(401, "Confirme sua identidade para excluir a conta.", { codigo: "requer-login-recente" });
    }

    const apagar = async (consulta) => {
      const snap = await consulta.get();
      for (let i = 0; i < snap.docs.length; i += 400) {
        const lote = db.batch();
        snap.docs.slice(i, i + 400).forEach((d) => lote.delete(d.ref));
        await lote.commit();
      }
    };

    await apagar(db.collection("denuncias").where("usuario_uid", "==", uid));
    await apagar(db.collection("cpfs").where("uid", "==", uid));
    await db.collection("ranking").doc(uid).delete();
    await db.collection("usuarios").doc(uid).delete();

    await auth.deleteUser(uid).catch((e) => {
      if (e.code !== "auth/user-not-found") throw e;
    });

    return { status: 200, body: { ok: true } };
  });
}
