# Portal de Autoenrolamiento — Partners (beta, modo demo)

Portal externo multi-partner: cada partner (ej. MACROBASE) inicia sesión con su
propio usuario y enrola a sus clientes finales. Incluye **modo demo** (no toca
el certificador real) e **historial**. Los datos viven en Supabase (proyecto
tacticalboard, tablas con prefijo `ae_`).

## Arquitectura

```
Frontend (index.html estático)  ── fetch /api/... (cookie de sesión) ──▶ Funciones serverless (Vercel)
                                                                          ├── login/logout/me         → auth por partner (ae_partners)
                                                                          ├── registrar-emisor/firma/ → enrolamiento
                                                                          │   consulta/estab/frases      (modo demo intercepta)
                                                                          └── historial               → lee ae_emisores + ae_enrolamientos_log
                                                                                    │
                                                                                    ▼
                                                                          Supabase (REST, service key)
```

## Modo demo (clave)

Si el partner tiene `modo_demo = true` en `ae_partners`, el backend NO llama al
certificador: devuelve respuestas simuladas realistas y registra la actividad.
Los emisores creados en demo se guardan con `origen = 'demo'`, separados de los
reales (`origen = 'importado'`). El historial por defecto muestra solo lo real;
un checkbox "Incluir demo" muestra ambos. Limpiar lo demo es un
`delete from ae_emisores where origen='demo'` sin tocar nada real.

MACROBASE ya está configurado en demo. Login de demostración:
- Usuario: `macrobase`
- Contraseña: `Demo-Macrobase-2026`

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Qué es |
|---|---|
| `SESSION_SECRET` | Valor aleatorio largo para firmar cookies |
| `SUPABASE_URL` | `https://yiuetruckmygkbirniic.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role key (Supabase → Settings → API). Secreta, solo servidor |
| `SIGNER_LLAVE` | (solo para modo real, no demo) llave de firma compartida |

La service key hace bypass de RLS; por eso las tablas `ae_` tienen RLS activo
sin políticas: nadie con la anon key las toca, solo el backend.

## Base de datos (ya creada en tacticalboard)

- `ae_partners` — partners con login (hash), credenciales de certificador, `modo_demo`.
- `ae_emisores` — snapshot de clientes por partner. `origen`: importado | demo | portal.
  Único por `(partner_id, nit, fase)`.
- `ae_enrolamientos_log` — bitácora de acciones (auditoría).

Ya están cargadas las 216 filas reales de MACROBASE (`origen='importado'`).

## Desplegar

1. Subir a un repo y importar en Vercel (Framework: Other).
2. Cargar las 4 variables de entorno.
3. Deploy.

## Pendiente para salir de beta

- Credenciales reales de partner de MACROBASE (hoy dummy porque está en demo).
- Los campos de límites/IVA/personería/plantilla son de solo lectura (informativos).
- Al pasar un partner a real: `modo_demo=false`, cargar prefijo/llave reales.
