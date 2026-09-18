// api/me.js — estado de sesión del partner (sin exponer credenciales).
import { getSessionPartner } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET.' }); return; }
  let partner = null;
  try { partner = await getSessionPartner(req); } catch { partner = null; }
  if (!partner) { res.status(200).json({ autenticado: false }); return; }
  res.status(200).json({
    autenticado: true,
    usuario: partner.id,
    nombre: partner.nombre,
    modo_demo: partner.modo_demo === true,
  });
}
