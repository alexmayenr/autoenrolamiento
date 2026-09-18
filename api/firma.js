import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requireActor } from './_lib/auth.js';
import { demoFirma } from './_lib/demo.js';
import { registrarLog } from './_lib/log.js';
export const config = { maxDuration: 120 };
export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const actor = await requireActor(req, res);
  if (!actor) return;
  const body = readJsonBody(req, res);
  if (!body) return;
  const requeridos = ['nombre', 'empresa', 'correo', 'alias', 'nit', 'pfx', 'password_pfx'];
  if (!requireFields(res, body, requeridos)) return;

  if (actor.modoDemo) {
    await registrarLog(actor.id, { nit: body.nit, accion: 'firma', resultado: 'ok', detalle: 'DEMO' });
    res.status(200).json(demoFirma({ alias: body.alias }));
    return;
  }

  const signerLlave = actor.signerLlave || process.env.SIGNER_LLAVE;
  if (!signerLlave) { res.status(500).json({ error: 'No hay llave de firma configurada.' }); return; }
  if (actor.tipo === 'partner') await registrarLog(actor.id, { nit: body.nit, accion: 'firma', resultado: 'enviado' });
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
    timeoutMs: 90000, errorLabel: 'el API de firma',
  });
}
