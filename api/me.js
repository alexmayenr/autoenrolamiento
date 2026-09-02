// api/me.js
// Indica al frontend si hay sesión activa y quién es (sin credenciales).
import { getSessionUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Use GET.' });
    return;
  }

  let user = null;
  try {
    user = getSessionUser(req);
  } catch {
    user = null; // config incompleta => se trata como no autenticado
  }

  if (!user) {
    res.status(200).json({ autenticado: false });
    return;
  }

  // Solo datos no sensibles. Nunca prefijo/llave/signerLlave.
  res.status(200).json({
    autenticado: true,
    usuario: user.username,
    nombre: user.nombre || user.username,
  });
}
