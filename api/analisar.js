// Função serverless (Vercel) para POST /api/analisar.
// Configure GEMINI_API_KEY, GEMINI_MODEL e VITE_FIREBASE_API_KEY nas
// variáveis de ambiente do projeto na Vercel.
import { processarAnalise } from "../server/analisar.js";

export default async function handler(req, res) {
  const { status, body } = await processarAnalise(req, process.env);
  res.status(status).json(body);
}
