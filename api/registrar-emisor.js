// api/registrar-emisor.js — registro del emisor en el certificador FEL.
// Usa las credenciales del asesor autenticado.
import { ensurePostMethod, readJsonBody, forward } from './_lib/forward.js';
import { requireUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!ensurePostMethod(req, res)) return;

  const user = requireUser(req, res);
  if (!user) return;

  const body = readJsonBody(req, res);
  if (!body) return;

  await forward(res, {
    url: 'https://certificadorcloud.feel.com.gt/api/v1/partners/registro_emisor',
    headers: {
      PREFIJO: user.prefijo,
      LLAVE: user.llave,
    },
    payload: body, // se reenvía el mismo JSON tal cual
    errorLabel: 'la API de registro de emisor',
  });
}
