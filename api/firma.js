// api/firma.js — registro del certificado (PFX) del emisor.
// Usa la llave del signer del asesor autenticado.
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

  if (!user.signerLlave) {
    res.status(500).json({ error: 'El asesor no tiene configurada la llave del signer.' });
    return;
  }

  const body = readJsonBody(req, res);
  if (!body) return;

  const requeridos = ['nombre', 'empresa', 'correo', 'alias', 'nit', 'pfx', 'password_pfx'];
  if (!requireFields(res, body, requeridos)) return;

  const payload = {
    llave_acceso: user.signerLlave,
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
