// Função serverless (Vercel) para POST /api/gerar-cupom.
import { gerarCupom } from "../server/cupons.js";

export default async function handler(req, res) {
  const { status, body } = await gerarCupom(req, process.env);
  res.status(status).json(body);
}
