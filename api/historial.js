// api/historial.js — historial del partner autenticado.
// Devuelve dos cosas:
//   - emisores: el snapshot de clientes (por defecto solo los reales;
//     con ?incluir=demo también los de demostración, claramente separados).
//   - log: la bitácora de acciones (registro/firma) más recientes.
import { requirePartner } from './_lib/auth.js';
import { select } from './_lib/supabase.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Use GET.' }); return; }

  const partner = await requirePartner(req, res);
  if (!partner) return;

  const incluirDemo = String(req.query?.incluir || '').includes('demo');

  try {
    // Emisores del partner. Por defecto solo lo real (origen != demo).
    const filtrosEmisores = { partner_id: `eq.${partner.id}` };
    if (!incluirDemo) filtrosEmisores.origen = 'neq.demo';

    const emisores = await select('ae_emisores', {
      filtros: filtrosEmisores,
      columnas: 'nit,nombre,prefijo,fase,estado_cuenta,grupo_interno,origen,actualizado_en',
      orden: 'nombre.asc',
      limite: 1000,
    });

    // Bitácora de acciones (siempre incluye demo, es un log de actividad).
    const log = await select('ae_enrolamientos_log', {
      filtros: { partner_id: `eq.${partner.id}` },
      columnas: 'nit,accion,resultado,detalle,creado_en',
      orden: 'creado_en.desc',
      limite: 200,
    });

    res.status(200).json({
      partner: { id: partner.id, nombre: partner.nombre, modo_demo: partner.modo_demo === true },
      totales: {
        emisores: emisores.length,
        acciones: log.length,
      },
      emisores,
      log,
    });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer el historial.', detalle: e.message });
  }
}
