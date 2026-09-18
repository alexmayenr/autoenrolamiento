// api/_lib/forward.js
// Utilidades de request + simulación de modo demo + reenvío real al certificador.

export function ensurePostMethod(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido. Use POST.' }); return false; }
  return true;
}

export function readJsonBody(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { res.status(400).json({ error: 'JSON inválido.' }); return null; }
  }
  if (!body || typeof body !== 'object') { res.status(400).json({ error: 'Se esperaba un cuerpo JSON.' }); return null; }
  return body;
}

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

// Reenvío REAL al certificador (solo se usa cuando el partner NO está en demo).
export async function forward(res, { url, headers = {}, payload, timeoutMs = 30000, errorLabel = 'la API externa' }) {
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
    res.status(502).json({ error: `Error al conectar con ${errorLabel}.`, detalle: isAbort ? 'Tiempo de espera agotado.' : err.message });
  } finally {
    clearTimeout(timer);
  }
}
