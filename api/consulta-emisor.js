// api/consulta-emisor.js — datos del emisor (con modo demo).
import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requirePartner } from './_lib/auth.js';
import { demoDatosEmisor } from './_lib/demo.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const partner = await requirePartner(req, res);
  if (!partner) return;
  const body = readJsonBody(req, res);
  if (!body) return;
  if (!requireFields(res, body, ['prefijo'])) return;

  if (partner.modo_demo) {
    res.status(200).json(demoDatosEmisor({ prefijo: body.prefijo }));
    return;
  }

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/datos_emisor',
    headers: { PREFIJO: partner.prefijo, LLAVE: partner.llave },
    payload: { prefijo: body.prefijo },
    errorLabel: 'la API de consulta de emisor',
  });
}
