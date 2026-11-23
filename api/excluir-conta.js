// Função serverless (Vercel) para POST /api/excluir-conta.
import { excluirConta } from "../server/excluir-conta.js";

export default async function handler(req, res) {
  const { status, body } = await excluirConta(req, process.env);
  res.status(status).json(body);
}
