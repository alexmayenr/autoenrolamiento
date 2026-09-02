// api/frases.js
// Reemplaza proxy_frases.php — frases tributarias obligatorias del emisor.
import {
  checkMethodAndAuth,
  getRequiredEnv,
  readJsonBody,
  requireFields,
  forward,
} from './_lib/forward.js';

export default async function handler(req, res) {
  if (!checkMethodAndAuth(req, res)) return;

  const env = getRequiredEnv(res, ['PARTNER_PREFIJO', 'PARTNER_LLAVE']);
  if (!env) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  if (!requireFields(res, body, ['nit', 'prefijo', 'llave'])) return;

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/obtener_frases',
    headers: {
      PREFIJO: env.PARTNER_PREFIJO,
      LLAVE: env.PARTNER_LLAVE,
    },
    payload: {
      nit: body.nit,
      prefijo: body.prefijo,
      llave: body.llave,
    },
    errorLabel: 'la API de frases',
  });
}
