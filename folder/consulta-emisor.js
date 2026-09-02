// api/consulta-emisor.js
// Reemplaza proxy_consulta_emisor.php — consulta datos del emisor
// (incluye la llave propia del emisor y el estado real de la firma).
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

  if (!requireFields(res, body, ['prefijo'])) return;

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/datos_emisor',
    headers: {
      PREFIJO: env.PARTNER_PREFIJO,
      LLAVE: env.PARTNER_LLAVE,
    },
    payload: { prefijo: body.prefijo },
    errorLabel: 'la API de consulta de emisor',
  });
}
