// api/logout.js
// Borra la cookie de sesión.
import { ensurePostMethod } from './_lib/forward.js';
import { clearSessionCookie } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  clearSessionCookie(req, res);
  res.status(200).json({ ok: true });
}
