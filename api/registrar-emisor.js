// api/registrar-emisor.js — registro de emisor. Asesor: real con sus credenciales.
// Partner en demo: simulado + guardado (origen=demo) + log.
import { ensurePostMethod, readJsonBody, forward } from './_lib/forward.js';
import { requireActor } from './_lib/auth.js';
import { demoRegistroEmisor } from './_lib/demo.js';
import { registrarLog } from './_lib/log.js';
import { insert } from './_lib/supabase.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;
  const actor = await requireActor(req, res);
  if (!actor) return;
  const body = readJsonBody(req, res);
  if (!body) return;

  const nit = body.nit || (body.emisor && body.emisor.nit) || '';
  const alias = body.alias || (body.emisor && body.emisor.prefijo) || '';
  const fase = (body.fase || '').toUpperCase() || (String(alias).toUpperCase().endsWith('PRO') ? 'PRODUCCION' : 'IMPLEMENTACION');

  if (actor.modoDemo) {
    try {
      await insert('ae_emisores', {
        partner_id: actor.id, nit: String(nit), nombre: body.nombre || body.empresa || null,
        prefijo: alias || null, fase, estado_cuenta: 'Activo', origen: 'demo',
      });
    } catch (e) { console.error('insert demo emisor:', e.message); }
    await registrarLog(actor.id, { nit, accion: 'registro_emisor', resultado: 'ok', detalle: 'DEMO' });
    res.status(200).json(demoRegistroEmisor({ nit, alias }));
    return;
  }

  // Real (asesores siempre; partners fuera de demo). Log solo para partners.
  if (actor.tipo === 'partner') await registrarLog(actor.id, { nit, accion: 'registro_emisor', resultado: 'enviado' });
  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/registro_emisor',
    headers: { PREFIJO: actor.prefijo, LLAVE: actor.llave },
    payload: body,
    errorLabel: 'la API de registro de emisor',
    timeoutMs: 55000,
  });
}
