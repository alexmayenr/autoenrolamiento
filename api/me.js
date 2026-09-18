// api/me.js — estado de sesion (sin credenciales). Informa tipo y modo demo.
import { getSessionActor } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET.' }); return; }
  let actor = null;
  try { actor = await getSessionActor(req); } catch { actor = null; }
  if (!actor) { res.status(200).json({ autenticado: false }); return; }
  res.status(200).json({
    autenticado: true,
    usuario: actor.id,
    nombre: actor.nombre,
    tipo: actor.tipo,
    modo_demo: actor.modoDemo === true,
  });
}
