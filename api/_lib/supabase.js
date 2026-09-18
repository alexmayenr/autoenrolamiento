// api/_lib/supabase.js
// Acceso mínimo a Supabase vía su REST API (PostgREST), usando solo fetch
// nativo. Cero dependencias. Usa la service_role key, que hace bypass de RLS,
// así que ESTE código solo corre en el servidor (funciones serverless), nunca
// en el navegador.

function baseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('Falta SUPABASE_URL en el entorno.');
  return url.replace(/\/$/, '') + '/rest/v1';
}

function headers(extra = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_KEY en el entorno.');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function leer(resp) {
  const texto = await resp.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* deja json en null */ }
  if (!resp.ok) {
    const msg = (json && (json.message || json.hint)) || texto || `HTTP ${resp.status}`;
    throw new Error(`Supabase: ${msg}`);
  }
  return json;
}

// SELECT con filtros PostgREST. filtros = { columna: 'eq.valor', ... }
export async function select(tabla, { filtros = {}, columnas = '*', orden = null, limite = null } = {}) {
  const params = new URLSearchParams();
  params.set('select', columnas);
  for (const [k, v] of Object.entries(filtros)) params.set(k, v);
  if (orden) params.set('order', orden);
  if (limite) params.set('limit', String(limite));

  const resp = await fetch(`${baseUrl()}/${tabla}?${params.toString()}`, {
    method: 'GET',
    headers: headers(),
  });
  return (await leer(resp)) || [];
}

// INSERT de una fila; devuelve la fila insertada.
export async function insert(tabla, fila) {
  const resp = await fetch(`${baseUrl()}/${tabla}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(fila),
  });
  const filas = await leer(resp);
  return Array.isArray(filas) ? filas[0] : filas;
}
