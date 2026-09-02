// api/frases.js — frases tributarias obligatorias del emisor.
import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;

  const user = requireUser(req, res);
  if (!user) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  if (!requireFields(res, body, ['nit', 'prefijo', 'llave'])) return;

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/obtener_frases',
    headers: {
      PREFIJO: user.prefijo,
      LLAVE: user.llave,
    },
    payload: {
      nit: body.nit,
      prefijo: body.prefijo,
      llave: body.llave,
    },
    errorLabel: 'la API de frases',
  });
}
