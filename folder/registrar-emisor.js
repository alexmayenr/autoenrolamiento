// api/registrar-emisor.js
// Reemplaza proxy.php — registro del emisor en el certificador FEL.
import {
  checkMethodAndAuth,
  getRequiredEnv,
  readJsonBody,
  forward,
} from './_lib/forward.js';

export default async function handler(req, res) {
  if (!checkMethodAndAuth(req, res)) return;

  const env = getRequiredEnv(res, ['PARTNER_PREFIJO', 'PARTNER_LLAVE']);
  if (!env) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/registro_emisor',
    headers: {
      PREFIJO: env.PARTNER_PREFIJO,
      LLAVE: env.PARTNER_LLAVE,
    },
    payload: body, // se reenvía el mismo JSON tal cual, como en el proxy original
    errorLabel: 'la API de registro de emisor',
  });
}
