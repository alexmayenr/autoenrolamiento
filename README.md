# Autoenrolamiento — Portal unico (asesores + partners)

Una sola herramienta. Segun quien inicia sesion, muestra lo que corresponde:

- **Asesor** (usuario en la variable `USERS`): flujo interno de siempre, con su
  propia credencial del certificador. Sin demo, sin historial. Es el portal que
  ya estaba EN VIVO; no cambia su comportamiento.
- **Partner** (fila en `ae_partners` de Supabase, ej. `macrobase`): flujo
  externo, con modo demo (no toca el certificador), badge "MODO DEMO" e
  historial de sus clientes.

El login busca primero en `USERS` y luego en Supabase. La sesion guarda el tipo
(`asesor` | `partner`) y cada funcion resuelve credenciales y comportamiento
segun ese tipo.

## Variables de entorno (Vercel)

| Variable | Para | Nota |
|---|---|---|
| `SESSION_SECRET` | Ambos | la que ya tenias |
| `USERS` | Asesores | el JSON de 8 asesores, sin cambios |
| `SIGNER_LLAVE` | Ambos (real) | la que ya tenias |
| `SUPABASE_URL` | Partners | https://yiuetruckmygkbirniic.supabase.co |
| `SUPABASE_SERVICE_KEY` | Partners | service_role key (secreta) |

Sobran y se pueden borrar: `PARTNER_PREFIJO`, `PARTNER_LLAVE`, `SIGNER_LLAVE_ACCESO`.

## Logins de prueba

- Asesor: los de siempre (ej. `amayen`).
- Partner demo: `macrobase` / `Demo-Macrobase-2026`.

## Importante al desplegar

Tras agregar/actualizar variables en Vercel, hacer **Redeploy** del ultimo
deployment; si no, no toman efecto.
