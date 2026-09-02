// api/_lib/auth.js
// Autenticación sin base de datos para un grupo fijo de asesores.
//
// - Los usuarios (con sus credenciales del certificador) viven en la
//   variable de entorno USERS (un JSON). No hay tabla ni Supabase.
// - Las sesiones son cookies firmadas con HMAC (stateless): el servidor
//   no guarda nada, solo verifica la firma en cada petición.
// - Las contraseñas se guardan como hash scrypt, nunca en texto plano.
//
// Todo usa el módulo crypto nativo de Node: cero dependencias externas.

import crypto from 'node:crypto';

const SESSION_COOKIE = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('Falta SESSION_SECRET (o es demasiado corto) en el entorno.');
  }
  return s;
}

// Carga el mapa de usuarios desde la variable de entorno USERS (JSON).
// Formato esperado:
// {
//   "amayen": { "nombre": "Alex", "hash": "scrypt$...", "prefijo": "...",
//               "llave": "...", "signerLlave": "..." },
//   ...
// }
export function loadUsers() {
  const raw = process.env.USERS;
  if (!raw) {
    throw new Error('Falta la variable de entorno USERS.');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('La variable USERS no es un JSON válido.');
  }
  return parsed;
}

// ── Contraseñas (scrypt) ────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ── Token de sesión (HMAC-SHA256) ───────────────────────────
export function createSessionToken(username) {
  const payload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [body, sig] = token.split('.');
  const expectedSig = b64url(crypto.createHmac('sha256', getSecret()).update(body).digest());

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload.exp !== 'number') return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expirado

  return payload; // { u, exp }
}

// ── Cookies ─────────────────────────────────────────────────
function isHttps(req) {
  return String(req.headers['x-forwarded-proto'] || '').includes('https');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) {
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

export function setSessionCookie(req, res, token) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req, res) {
  const parts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ── Resolución del usuario de la petición ───────────────────
// Devuelve el registro del usuario (con sus credenciales) o null.
export function getSessionUser(req) {
  const cookies = parseCookies(req);
  const payload = verifySessionToken(cookies[SESSION_COOKIE]);
  if (!payload) return null;

  const users = loadUsers();
  const record = users[payload.u];
  if (!record) return null; // el usuario fue removido de la config

  return { username: payload.u, ...record };
}

// Para usar dentro de las funciones del API: devuelve el usuario o, si no
// hay sesión válida, responde con el código adecuado y devuelve null.
export function requireUser(req, res) {
  let user = null;
  try {
    user = getSessionUser(req);
  } catch (e) {
    res.status(500).json({
      error: 'Configuración de servidor incompleta.',
      detalle: e.message,
    });
    return null;
  }
  if (!user) {
    res.status(401).json({ error: 'Sesión no válida. Inicie sesión de nuevo.' });
    return null;
  }
  return user;
}
