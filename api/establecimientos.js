// api/establecimientos.js — establecimientos (con modo demo).
import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requirePartner } from './_lib/auth.js';
import { demoEstablecimientos } from './_lib/demo.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const partner = await requirePartner(req, res);
  if (!partner) return;
  const body = readJsonBody(req, res);
  if (!body) return;
  if (!requireFields(res, body, ['nit', 'prefijo', 'llave'])) return;

  if (partner.modo_demo) {
    res.status(200).json(demoEstablecimientos({ nit: body.nit }));
    return;
  }

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/obtener_establecimientos',
    headers: { PREFIJO: partner.prefijo, LLAVE: partner.llave },
    payload: { nit: body.nit, prefijo: body.prefijo, llave: body.llave },
    errorLabel: 'la API de establecimientos',
  });
}
