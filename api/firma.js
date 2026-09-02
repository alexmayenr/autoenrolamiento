// api/firma.js — registro del certificado (PFX) del emisor.
// La llave del signer es compartida (SIGNER_LLAVE). Se permite override
// por usuario (user.signerLlave) por si algún día alguno tiene la suya.
import { ensurePostMethod, readJsonBody, requireFields, forward } from './_lib/forward.js';
import { requireUser } from './_lib/auth.js';

// Requiere Fluid compute activo (por defecto en proyectos nuevos).
export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;

  const user = requireUser(req, res);
  if (!user) return;

  const signerLlave = user.signerLlave || process.env.SIGNER_LLAVE;
  if (!signerLlave) {
    res.status(500).json({ error: 'No hay llave de firma configurada (SIGNER_LLAVE).' });
    return;
  }

  const body = readJsonBody(req, res);
  if (!body) return;

  const requeridos = ['nombre', 'empresa', 'correo', 'alias', 'nit', 'pfx', 'password_pfx'];
  if (!requireFields(res, body, requeridos)) return;

  const payload = {
    llave_acceso: signerLlave,
    solicitud: {
      nombre: body.nombre,
      empresa: body.empresa,
      correo: body.correo,
      alias: body.alias,
      nit: body.nit,
      referencia: '',
      tipo_firma: 'FEL',
      url_respuesta: '',
      mod_carga: 'Directo',
      pfx: body.pfx,
      password_pfx: body.password_pfx,
    },
  };

  await forward(res, {
    url: 'https://signer-administracion.feel.com.gt/api/v1/fel/certificados/registrar',
    payload,
    timeoutMs: 90000,
    errorLabel: 'el API de firma',
  });
}
