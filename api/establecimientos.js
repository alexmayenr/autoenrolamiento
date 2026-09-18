import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requireActor } from './_lib/auth.js';
import { demoEstablecimientos } from './_lib/demo.js';
export const config = { maxDuration: 60 };
export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const actor = await requireActor(req, res);
  if (!actor) return;
  const body = readJsonBody(req, res);
  if (!body) return;
  if (!requireFields(res, body, ['nit', 'prefijo', 'llave'])) return;
  if (actor.modoDemo) { res.status(200).json(demoEstablecimientos({ nit: body.nit })); return; }
  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/obtener_establecimientos',
    headers: { PREFIJO: actor.prefijo, LLAVE: actor.llave },
    payload: { nit: body.nit, prefijo: body.prefijo, llave: body.llave },
    errorLabel: 'la API de establecimientos',
  });
}
