// api/login.js — login por partner contra ae_partners.
import { ensurePostMethod, readJsonBody } from './_lib/forward.js';
import { buscarPartnerPorId, verifyPassword, createSessionToken, setSessionCookie } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  const usuario = (body.usuario || '').trim().toLowerCase();
  const password = body.password || '';
  if (!usuario || !password) {
    res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    return;
  }

  let partner;
  try {
    partner = await buscarPartnerPorId(usuario);
  } catch (e) {
    res.status(500).json({ error: 'Configuración de servidor incompleta.', detalle: e.message });
    return;
  }

  const ok = partner ? verifyPassword(password, partner.hash) : false;
  if (!ok) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return;
  }

  const token = createSessionToken(partner.id);
  setSessionCookie(req, res, token);
  res.status(200).json({
    ok: true,
    usuario: partner.id,
    nombre: partner.nombre,
    modo_demo: partner.modo_demo === true,
  });
}
