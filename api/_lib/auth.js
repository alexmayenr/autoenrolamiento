// api/_lib/auth.js
// Autenticación UNIFICADA. Dos tipos de actor:
//   - asesor  : vive en la variable de entorno USERS (portal interno, en vivo).
//   - partner : vive en la tabla ae_partners de Supabase (portal externo).
// El login busca primero en USERS y luego en partners. La sesión guarda el
// tipo, y cada función resuelve las credenciales según el tipo.

import crypto from 'node:crypto';
import { select } from './supabase.js';

const SESSION_COOKIE = 'ae_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Falta SESSION_SECRET (o es demasiado corto) en el entorno.');
  return s;
}

// -- Asesores (USERS) --
export function loadUsers() {
  const raw = process.env.USERS;
  if (!raw) return {}; // sin USERS, simplemente no hay asesores (no es fatal)
  try { return JSON.parse(raw); } catch { throw new Error('La variable USERS no es un JSON valido.'); }
}

// -- Contrasenas (scrypt) --
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
  } catch { return false; }
}

// -- Token de sesion (HMAC-SHA256). payload: { sub, t, exp } --
export function createSessionToken(sub, tipo) {
  const payload = { sub, t: tipo, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
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
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload; // { sub, t, exp }
}

// -- Cookies --
function isHttps(req) { return String(req.headers['x-forwarded-proto'] || '').includes('https'); }

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export function setSessionCookie(req, res, token) {
  const parts = [`${SESSION_COOKIE}=${token}`, 'HttpOnly', 'SameSite=Strict', 'Path=/', `Max-Age=${SESSION_TTL_SECONDS}`];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req, res) {
  const parts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// -- Login unificado. Devuelve { tipo, id, nombre } o null. --
export async function autenticar(usuario, password) {
  const u = String(usuario || '').trim();

  // 1) Asesor (USERS)
  const users = loadUsers();
  const registro = users[u];
  if (registro && verifyPassword(password, registro.hash)) {
    return { tipo: 'asesor', id: u, nombre: registro.nombre || u };
  }

  // 2) Partner (Supabase)
  const idLower = u.toLowerCase();
  const filas = await select('ae_partners', { filtros: { id: `eq.${idLower}`, activo: 'eq.true' }, limite: 1 });
  const partner = filas[0];
  if (partner && verifyPassword(password, partner.hash)) {
    return { tipo: 'partner', id: partner.id, nombre: partner.nombre || partner.id };
  }

  return null;
}

// -- Resolucion del actor de la peticion (con credenciales). --
// { tipo, id, nombre, prefijo, llave, signerLlave, modoDemo }
export async function getSessionActor(req) {
  const cookies = parseCookies(req);
  const payload = verifySessionToken(cookies[SESSION_COOKIE]);
  if (!payload) return null;

  if (payload.t === 'asesor') {
    const users = loadUsers();
    const r = users[payload.sub];
    if (!r) return null;
    return {
      tipo: 'asesor', id: payload.sub, nombre: r.nombre || payload.sub,
      prefijo: r.prefijo, llave: r.llave, signerLlave: r.signerLlave || process.env.SIGNER_LLAVE,
      modoDemo: false,
    };
  }

  if (payload.t === 'partner') {
    const filas = await select('ae_partners', { filtros: { id: `eq.${payload.sub}`, activo: 'eq.true' }, limite: 1 });
    const p = filas[0];
    if (!p) return null;
    return {
      tipo: 'partner', id: p.id, nombre: p.nombre || p.id,
      prefijo: p.prefijo, llave: p.llave, signerLlave: p.signer_llave || process.env.SIGNER_LLAVE,
      modoDemo: p.modo_demo === true,
    };
  }

  return null;
}

// Para funciones protegidas: devuelve el actor o responde 401 y devuelve null.
export async function requireActor(req, res) {
  let actor = null;
  try {
    actor = await getSessionActor(req);
  } catch (e) {
    res.status(500).json({ error: 'Configuracion de servidor incompleta.', detalle: e.message });
    return null;
  }
  if (!actor) {
    res.status(401).json({ error: 'Sesion no valida. Inicie sesion de nuevo.' });
    return null;
  }
  return actor;
}
