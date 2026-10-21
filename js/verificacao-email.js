// Confirmação de email: a conta só funciona depois que a pessoa clica
// no link enviado pelo Firebase. Evita cadastros com email inventado.
import { sendEmailVerification } from "./firebase.js";

export async function enviarEmailVerificacao(user) {
  try {
    // Depois de confirmar, o Firebase mostra um botão de volta para o login
    await sendEmailVerification(user, { url: `${window.location.origin}/login.html` });
  } catch (error) {
    // Domínio fora de "Authorized domains": envia sem o botão de volta
    if (error.code !== "auth/unauthorized-continue-uri") throw error;
    await sendEmailVerification(user);
  }
}
