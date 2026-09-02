// api/firma.js
// Reemplaza proxy_firma.php — registro del certificado (PFX) del emisor.
// La carga del PFX puede tardar, por eso el timeout es mayor (90s) y se
// declara maxDuration para que Vercel no corte la función antes.
import {
  checkMethodAndAuth,
  getRequiredEnv,
  readJsonBody,
  requireFields,
  forward,
} from './_lib/forward.js';

// Requiere Fluid compute activo (por defecto en proyectos nuevos).
export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  if (!checkMethodAndAuth(req, res)) return;

  const env = getRequiredEnv(res, ['SIGNER_LLAVE_ACCESO']);
  if (!env) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  const requeridos = ['nombre', 'empresa', 'correo', 'alias', 'nit', 'pfx', 'password_pfx'];
  if (!requireFields(res, body, requeridos)) return;

  const payload = {
    llave_acceso: env.SIGNER_LLAVE_ACCESO,
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
    timeoutMs: 90000, // el PFX en base64 puede tardar más
    errorLabel: 'el API de firma',
  });
}
