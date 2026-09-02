// api/login.js
// Verifica usuario + contraseña contra la config (USERS) y, si son
// válidos, emite una cookie de sesión firmada. No expone credenciales.
import { ensurePostMethod, readJsonBody } from './_lib/forward.js';
import {
  loadUsers,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from './_lib/auth.js';

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  const usuario = (body.usuario || '').trim();
  const password = body.password || '';

  if (!usuario || !password) {
    res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    return;
  }

  let users;
  try {
    users = loadUsers();
  } catch (e) {
    res.status(500).json({ error: 'Configuración de servidor incompleta.', detalle: e.message });
    return;
  }

  const record = users[usuario];
  const ok = record ? verifyPassword(password, record.hash) : false;

  if (!ok) {
    // Mismo mensaje exista o no el usuario, para no revelar cuáles existen.
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return;
  }

  const token = createSessionToken(usuario);
  setSessionCookie(req, res, token);

  res.status(200).json({
    ok: true,
    usuario,
    nombre: record.nombre || usuario,
  });
}
