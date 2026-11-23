// Função serverless (Vercel) para POST /api/registrar-cpf.
import { registrarCpf } from "../server/registrar-cpf.js";

export default async function handler(req, res) {
  const { status, body } = await registrarCpf(req, process.env);
  res.status(status).json(body);
}
