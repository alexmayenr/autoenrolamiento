import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requireActor } from './_lib/auth.js';
import { demoDatosEmisor } from './_lib/demo.js';
export const config = { maxDuration: 60 };
export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const actor = await requireActor(req, res);
  if (!actor) return;
  const body = readJsonBody(req, res);
  if (!body) return;
  if (!requireFields(res, body, ['prefijo'])) return;
  if (actor.modoDemo) { res.status(200).json(demoDatosEmisor({ prefijo: body.prefijo })); return; }
  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/datos_emisor',
    headers: { PREFIJO: actor.prefijo, LLAVE: actor.llave },
    payload: { prefijo: body.prefijo },
    errorLabel: 'la API de consulta de emisor',
  });
}
