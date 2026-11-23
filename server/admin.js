// Firebase Admin (somente servidor): verifica o token do usuário e acessa o
// Firestore sem passar pelas regras. Configure na Vercel (e no .env, para
// `npm run dev`): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// — os três vêm de uma chave de conta de serviço (Firebase Console →
// Configurações do projeto → Contas de serviço → Gerar nova chave privada).
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export class ErroHttp extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function obterAdmin(env) {
  const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  // Na Vercel a chave costuma ficar com "\n" literal
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new ErroHttp(500, "Credenciais do firebase-admin não configuradas no servidor (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).");
  }

  const app = getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return { auth: getAuth(app), db: getFirestore(app) };
}

// Confere o ID token do cabeçalho Authorization e devolve o token decodificado.
// Sessões anônimas (consulta grátis) são recusadas.
export async function verificarToken(auth, authHeader) {
  const idToken = (authHeader || "").replace(/^Bearer\s+/i, "");
  if (!idToken) throw new ErroHttp(401, "Faça login para continuar.");

  let decodificado;
  try {
    decodificado = await auth.verifyIdToken(idToken);
  } catch {
    throw new ErroHttp(401, "Sessão expirada. Faça login novamente.");
  }

  if (decodificado.firebase?.sign_in_provider === "anonymous") {
    throw new ErroHttp(401, "Faça login para continuar.");
  }
  return decodificado;
}

// Roda o handler e converte ErroHttp em { status, body }
export async function responder(fn) {
  try {
    return await fn();
  } catch (erro) {
    if (erro instanceof ErroHttp) return { status: erro.status, body: { erro: erro.message, ...erro.extra } };
    console.error("[api]", erro);
    return { status: 500, body: { erro: "Erro interno no servidor." } };
  }
}
