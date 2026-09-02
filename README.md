# Autoenrolamiento de Emisor · Infile (Vercel)

Portal **interno** para que los asesores de Implementaciones enrolen emisores
en el certificador FEL. Cada asesor inicia sesión con su propio usuario y usa
sus propias credenciales del certificador.

## Estructura

```
/
├── index.html                 Frontend (login + flujo de enrolamiento)
├── assets/                    Logos e íconos
├── api/
│   ├── _lib/
│   │   ├── forward.js         Utilidades (método, body, reenvío al certificador)
│   │   └── auth.js            Sesión: hash de contraseña, cookie firmada, usuarios
│   ├── login.js               Inicia sesión y emite la cookie
│   ├── logout.js              Cierra sesión
│   ├── me.js                  Indica si hay sesión (sin exponer credenciales)
│   ├── registrar-emisor.js    Registro de emisor
│   ├── consulta-emisor.js     Datos del emisor
│   ├── establecimientos.js    Establecimientos autorizados
│   ├── frases.js              Frases obligatorias
│   └── firma.js               Registro del certificado (PFX)
├── scripts/hash-password.js   Genera el hash de una contraseña
├── package.json               Declara ESM (type: module), sin dependencias
├── vercel.json                Config (maxDuration para firma)
├── .env.example               Plantilla de variables de entorno
└── .gitignore
```

## Cómo funciona la autenticación (sin base de datos)

Para un grupo fijo de 5 asesores no hace falta base de datos:

- **Los usuarios** viven en la variable de entorno `USERS` (un JSON). Cada
  asesor tiene su `prefijo`, `llave` y `signerLlave` propios, más el hash de
  su contraseña.
- **Las sesiones** son cookies firmadas con HMAC (stateless). El servidor no
  guarda nada; verifica la firma en cada petición.
- **Las credenciales del certificador nunca llegan al navegador.** El asesor
  manda usuario y contraseña; el servidor resuelve qué credenciales usar según
  quién inició sesión.

Flujo: `login` verifica contra `USERS` y deja una cookie `session` (httpOnly,
SameSite=Strict, Secure). Cada función lee esa cookie, identifica al asesor y
usa **sus** credenciales para llamar al certificador. Sin sesión válida → 401.

> Vercel Authentication (la protección de despliegue) sirve como control de
> acceso, pero no le dice a tus funciones **quién** entró, por eso el login
> vive en la app. Puedes activar además Vercel Authentication como capa extra.

## Variables de entorno

En **Project → Settings → Environment Variables**:

| Variable         | Qué es                                                        |
|------------------|--------------------------------------------------------------|
| `SESSION_SECRET` | Valor aleatorio largo para firmar las cookies                |
| `USERS`          | JSON con los asesores y sus credenciales (ver abajo)         |

Genera el secreto de sesión:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Genera el hash de cada contraseña:

```bash
node scripts/hash-password.js "laContraseñaDelAsesor"
```

Arma el JSON de `USERS` (pégalo en UNA línea en Vercel):

```json
{
  "amayen": { "nombre": "Alex Mayén", "hash": "scrypt$...", "prefijo": "...", "llave": "...", "signerLlave": "..." },
  "jlopez": { "nombre": "Juan Pablo", "hash": "scrypt$...", "prefijo": "...", "llave": "...", "signerLlave": "..." }
}
```

Los `usuario` (las llaves del JSON: `amayen`, `jlopez`, ...) son con los que
cada asesor inicia sesión.

> Las llaves que estaban hardcodeadas en los proxies PHP originales deben
> considerarse comprometidas: **rótalas** antes de ponerlas aquí.

## Desplegar en Vercel

1. **Add New → Project** e importa el repo.
2. Framework Preset: **Other** (no hay build step).
3. Carga las variables de entorno (`SESSION_SECRET`, `USERS`).
4. Deploy. Los `push` a `main` redesplegan solo.

### Plan y Fluid compute

- **Plan Pro (no Hobby).** Hobby no permite uso comercial; esta es una
  herramienta de Infile.
- **Fluid compute activo.** La firma tarda (hasta 90s). `vercel.json` fija
  `maxDuration: 120` para `api/firma.js`. Si diera timeout, confirma que Fluid
  compute esté activo en Settings → Functions.

## Desarrollo local

```bash
npm i -g vercel
cp .env.example .env.local   # coloca SESSION_SECRET y USERS reales
vercel dev
```

No hay dependencias que instalar: se usa el `fetch` y el `crypto` nativos de
Node.js.

## Notas de seguridad

- Contraseñas guardadas como hash scrypt, nunca en texto plano.
- Cookie de sesión httpOnly (no accesible desde JavaScript del navegador).
- El endpoint `me` nunca devuelve credenciales, solo usuario y nombre.
- Considera activar Vercel Authentication como capa adicional de acceso.
- Login sin límite de intentos: para 5 usuarios internos el riesgo es bajo;
  si el portal se expone más, conviene agregar rate limiting.
