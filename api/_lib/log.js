// api/_lib/log.js
// Registra cada acción en ae_enrolamientos_log (la bitácora de auditoría).
// Nunca lanza: si el log falla, no debe tumbar la operación principal.

import { insert } from './supabase.js';

export async function registrarLog(partnerId, { nit, accion, resultado, detalle = null }) {
  try {
    await insert('ae_enrolamientos_log', {
      partner_id: partnerId,
      nit: String(nit || ''),
      accion,
      resultado,
      detalle,
    });
  } catch (e) {
    // Se traga el error a propósito: el log es best-effort.
    console.error('No se pudo escribir en ae_enrolamientos_log:', e.message);
  }
}
