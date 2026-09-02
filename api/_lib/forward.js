// api/_lib/forward.js
// Utilidades compartidas por las funciones serverless.
// La autenticación por sesión vive en ./auth.js.
//
// Los archivos dentro de /api que empiezan con "_" NO se publican
// como endpoints en Vercel, así que este helper queda privado.

// Maneja OPTIONS (preflight) y exige POST. Devuelve false (y ya respondió)
// si la petición no debe continuar.
export function ensurePostMethod(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido. Use POST.' });
    return false;
  }
  return true;
}

// Vercel parsea el body JSON en req.body cuando el Content-Type es
// application/json. Aun así toleramos que venga como string.
export function readJsonBody(req, res) {
  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'JSON inválido enviado a la función.' });
      return null;
    }
  }

  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Se esperaba un cuerpo JSON.' });
    return null;
  }

  return body;
}

// Verifica que existan (y no estén vacíos) los campos requeridos.
export function requireFields(res, obj, fields) {
  for (const f of fields) {
    const val = obj[f];
    if (val === undefined || val === null || val === '') {
      res.status(400).json({ error: `Falta el campo requerido: ${f}` });
      return false;
    }
  }
  return true;
}

// Reenvía la petición al certificador y devuelve al navegador el mismo
// código HTTP y cuerpo que respondió la API real (passthrough).
export async function forward(res, {
  url,
  headers = {},
  payload,
  timeoutMs = 30000,
  errorLabel = 'la API externa',
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await apiResp.text();
    res.status(apiResp.status || 200);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(text);
  } catch (err) {
    const isAbort = err.name === 'AbortError';
    res.status(502).json({
      error: `Error al conectar con ${errorLabel}.`,
      detalle: isAbort ? 'Tiempo de espera agotado.' : err.message,
    });
  } finally {
    clearTimeout(timer);
  }
}
