// api/firma.js — registro del certificado de firma (con modo demo).
import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requirePartner } from './_lib/auth.js';
import { demoFirma } from './_lib/demo.js';
import { registrarLog } from './_lib/log.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const partner = await requirePartner(req, res);
  if (!partner) return;
  const body = readJsonBody(req, res);
  if (!body) return;

  const requeridos = ['nombre', 'empresa', 'correo', 'alias', 'nit', 'pfx', 'password_pfx'];
  if (!requireFields(res, body, requeridos)) return;

  if (partner.modo_demo) {
    await registrarLog(partner.id, { nit: body.nit, accion: 'firma', resultado: 'ok', detalle: 'DEMO' });
    res.status(200).json(demoFirma({ alias: body.alias }));
    return;
  }

  const signerLlave = partner.signer_llave || process.env.SIGNER_LLAVE;
  if (!signerLlave) {
    res.status(500).json({ error: 'No hay llave de firma configurada para este partner.' });
    return;
  }

  await registrarLog(partner.id, { nit: body.nit, accion: 'firma', resultado: 'enviado' });
  await forward(res, {
    url: 'https://signer-administracion.feel.com.gt/api/v1/fel/certificados/registrar',
    payload: {
      llave_acceso: signerLlave,
      solicitud: {
        nombre: body.nombre, empresa: body.empresa, correo: body.correo, alias: body.alias,
        nit: body.nit, referencia: '', tipo_firma: 'FEL', url_respuesta: '', mod_carga: 'Directo',
        pfx: body.pfx, password_pfx: body.password_pfx,
      },
    },
    timeoutMs: 90000,
    errorLabel: 'el API de firma',
  });
}
