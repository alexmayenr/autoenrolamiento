// api/consulta-emisor.js — consulta datos del emisor.
import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;

  const user = requireUser(req, res);
  if (!user) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  if (!requireFields(res, body, ['prefijo'])) return;

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/datos_emisor',
    headers: {
      PREFIJO: user.prefijo,
      LLAVE: user.llave,
    },
    payload: { prefijo: body.prefijo }, // prefijo del EMISOR consultado
    errorLabel: 'la API de consulta de emisor',
  });
}
