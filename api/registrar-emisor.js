// api/registrar-emisor.js — registro de emisor (con modo demo).
import { ensurePostMethod, readJsonBody, forward } from './_lib/forward.js';
import { requirePartner } from './_lib/auth.js';
import { demoRegistroEmisor } from './_lib/demo.js';
import { registrarLog } from './_lib/log.js';
import { insert } from './_lib/supabase.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;

  const partner = await requirePartner(req, res);
  if (!partner) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  // El frontend arma el payload; de ahí sacamos nit/alias/fase para el log y el demo.
  const nit = body.nit || (body.emisor && body.emisor.nit) || '';
  const alias = body.alias || (body.emisor && body.emisor.prefijo) || '';
  const fase = (body.fase || '').toUpperCase() || (String(alias).toUpperCase().endsWith('PRO') ? 'PRODUCCION' : 'IMPLEMENTACION');

  if (partner.modo_demo) {
    // Guarda el emisor simulado, marcado origen='demo' para no mezclar con lo real.
    try {
      await insert('ae_emisores', {
        partner_id: partner.id,
        nit: String(nit),
        nombre: body.nombre || body.empresa || null,
        prefijo: alias || null,
        fase,
        estado_cuenta: 'Activo',
        origen: 'demo',
      });
    } catch (e) {
      // Si ya existía (misma clave nit+fase en demo), no es fatal para la demo.
      console.error('insert demo emisor:', e.message);
    }
    await registrarLog(partner.id, { nit, accion: 'registro_emisor', resultado: 'ok', detalle: 'DEMO' });
    res.status(200).json(demoRegistroEmisor({ nit, alias }));
    return;
  }

  // Modo real (fuera de demo): usar las credenciales del partner.
  await registrarLog(partner.id, { nit, accion: 'registro_emisor', resultado: 'enviado' });
  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/registro_emisor',
    headers: { PREFIJO: partner.prefijo, LLAVE: partner.llave },
    payload: body,
    errorLabel: 'la API de registro de emisor',
    timeoutMs: 55000,
  });
}
