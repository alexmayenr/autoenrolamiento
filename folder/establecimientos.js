// api/establecimientos.js
// Reemplaza proxy_establecimientos.php — establecimientos autorizados.
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
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/obtener_establecimientos',
    // Headers unificados a MAYÚSCULAS (los proxies PHP mezclaban
    // mayúsculas/minúsculas; HTTP es case-insensitive, se unifica).
    headers: {
      PREFIJO: env.PARTNER_PREFIJO,
      LLAVE: env.PARTNER_LLAVE,
    },
    payload: {
      nit: body.nit,
      prefijo: body.prefijo,
      llave: body.llave,
    },
    errorLabel: 'la API de establecimientos',
  });
}
