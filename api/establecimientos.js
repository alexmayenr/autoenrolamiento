// api/establecimientos.js — establecimientos autorizados del emisor.
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
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/obtener_establecimientos',
    headers: {
      PREFIJO: user.prefijo, // credencial de partner del asesor
      LLAVE: user.llave,
    },
    payload: {
      nit: body.nit,          // datos del EMISOR consultado
      prefijo: body.prefijo,
      llave: body.llave,
    },
    errorLabel: 'la API de establecimientos',
  });
}
