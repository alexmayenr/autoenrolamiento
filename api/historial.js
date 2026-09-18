// api/historial.js — historial del actor. Solo los partners tienen datos en
// Supabase; para un asesor devuelve vacio (el frontend igual oculta el boton).
import { requireActor } from './_lib/auth.js';
import { select } from './_lib/supabase.js';
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET.' }); return; }
  const actor = await requireActor(req, res);
  if (!actor) return;

  if (actor.tipo !== 'partner') {
    res.status(200).json({ actor: { id: actor.id, tipo: actor.tipo }, emisores: [], log: [], totales: { emisores: 0, acciones: 0 } });
    return;
  }

  const incluirDemo = String(req.query?.incluir || '').includes('demo');
  try {
    const filtrosEmisores = { partner_id: `eq.${actor.id}` };
    if (!incluirDemo) filtrosEmisores.origen = 'neq.demo';
    const emisores = await select('ae_emisores', {
      filtros: filtrosEmisores,
      columnas: 'nit,nombre,prefijo,fase,estado_cuenta,grupo_interno,origen,actualizado_en',
      orden: 'nombre.asc', limite: 1000,
    });
    const log = await select('ae_enrolamientos_log', {
      filtros: { partner_id: `eq.${actor.id}` },
      columnas: 'nit,accion,resultado,detalle,creado_en',
      orden: 'creado_en.desc', limite: 200,
    });
    res.status(200).json({
      actor: { id: actor.id, nombre: actor.nombre, tipo: actor.tipo, modo_demo: actor.modoDemo === true },
      totales: { emisores: emisores.length, acciones: log.length },
      emisores, log,
    });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer el historial.', detalle: e.message });
  }
}
