// api/login.js — login unificado (asesor por USERS o partner por Supabase).
import { ensurePostMethod, readJsonBody } from './_lib/forward.js';
import { autenticar, createSessionToken, setSessionCookie } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const body = readJsonBody(req, res);
  if (!body) return;

  const usuario = (body.usuario || '').trim();
  const password = body.password || '';
  if (!usuario || !password) {
    res.status(400).json({ error: 'Usuario y contrasena son requeridos.' });
    return;
  }

  let actor;
  try {
    actor = await autenticar(usuario, password);
  } catch (e) {
    res.status(500).json({ error: 'Configuracion de servidor incompleta.', detalle: e.message });
    return;
  }

  if (!actor) {
    res.status(401).json({ error: 'Usuario o contrasena incorrectos.' });
    return;
  }

  const token = createSessionToken(actor.id, actor.tipo);
  setSessionCookie(req, res, token);
  res.status(200).json({ ok: true, usuario: actor.id, nombre: actor.nombre, tipo: actor.tipo });
}
