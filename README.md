# Autoenrolamiento de Emisor · Infile (Vercel)

Portal de autoservicio para enrolar emisores en el certificador FEL. Versión
migrada de PHP a funciones serverless de Vercel.

## Estructura

```
/
├── index.html                 Frontend (antes index.php)
├── assets/                    Logos e íconos
├── api/
│   ├── _lib/forward.js        Helper compartido (privado, no es endpoint)
│   ├── registrar-emisor.js    ← proxy.php
│   ├── consulta-emisor.js     ← proxy_consulta_emisor.php
│   ├── establecimientos.js    ← proxy_establecimientos.php
│   ├── frases.js              ← proxy_frases.php
│   └── firma.js               ← proxy_firma.php
├── vercel.json                Config (maxDuration para firma)
├── .env.example               Plantilla de variables de entorno
└── .gitignore
```

Cada `proxy_*.php` se convirtió en una función serverless equivalente. El
frontend es el mismo, solo cambian las llamadas: antes `fetch('proxy.php')`,
ahora `fetch('/api/registrar-emisor')`.

## Qué cambió respecto a la versión PHP

- **Credenciales fuera del código.** `PARTNER_LLAVE` y `SIGNER_LLAVE_ACCESO`
  ya no están escritas en los archivos; se leen de variables de entorno de
  Vercel y no se suben al repo.
- **Sin duplicación.** Los 5 proxies compartían el mismo boilerplate; ahora
  vive una sola vez en `api/_lib/forward.js`.
- **Headers unificados.** Los proxies mezclaban `PREFIJO`/`prefijo`; ahora
  todos usan mayúsculas.
- **Salida escapada.** El PDF ahora escapa los valores antes de insertarlos
  como HTML (evita que una dirección con `<` o `&` rompa el layout).

## Subir a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Autoenrolamiento FEL - versión Vercel serverless"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

El `.gitignore` ya evita que se suban `.env` y `node_modules`.

## Desplegar en Vercel

1. En Vercel: **Add New → Project** e importa el repo de GitHub.
2. Framework Preset: **Other** (no hay build step; es HTML estático + funciones).
3. Antes de desplegar, configura las variables de entorno (siguiente sección).
4. Deploy. Los `push` posteriores a `main` redesplegarán solo.

### Variables de entorno

En **Project → Settings → Environment Variables**, agrega:

| Variable              | Valor                                   |
|-----------------------|-----------------------------------------|
| `PARTNER_PREFIJO`     | `IMPLEMENTACIONES_AE`                    |
| `PARTNER_LLAVE`       | (la llave de partner)                   |
| `SIGNER_LLAVE_ACCESO` | (la llave de acceso del signer)         |
| `APP_ACCESS_TOKEN`    | (opcional — ver "Control de acceso")    |

> Los valores reales estaban hardcodeados en los proxies PHP. Considéralos
> comprometidos: convendría **rotarlos** antes de reusarlos aquí.

### Plan y Fluid compute

- **Plan Pro (no Hobby).** El plan Hobby de Vercel no permite uso comercial;
  como esta es una herramienta de Infile, va en un proyecto Pro.
- **Fluid compute activo.** La función de firma tarda (hasta 90s). Fluid
  compute (activo por defecto en proyectos nuevos) permite ejecuciones largas;
  `vercel.json` fija `maxDuration: 120` para `api/firma.js`. Si la firma diera
  timeout, confirma que Fluid compute esté activado en Settings → Functions.

## Control de acceso (importante)

El portal es de autoservicio, así que hay que decidir quién puede llegar a él.
Hay dos capas, y conviene entender qué protege cada una:

1. **`APP_ACCESS_TOKEN` (defensa en profundidad).** Si defines esta variable,
   las funciones exigen el header `x-app-token`. Debes poner el mismo valor en
   la constante `APP_ACCESS_TOKEN` dentro de `index.html`. Esto frena bots y
   accesos automáticos que escanean endpoints, **pero** como el token vive en
   el JavaScript del navegador, cualquiera que abra el portal puede leerlo.
   No es control de acceso real.

2. **Protección a nivel de despliegue (el control real).** Se configura en
   **Settings → Deployment Protection**:
   - **Vercel Authentication** (gratis, todos los planes): solo usuarios con
     cuenta de Vercel del equipo pueden entrar. Ideal si el portal es interno.
   - **Password Protection** (add-on de Pro, o Enterprise): pide contraseña
     antes de cargar el sitio. Útil si lo usan personas sin cuenta de Vercel.

   Esta capa protege la página **antes** de que cargue, así que también
   protege las funciones del API. Es la que realmente decide quién entra.

**Recomendación:** si es interno, activa Vercel Authentication y listo. Si
necesita abrirse a clientes, usa Password Protection y deja el token como capa
extra.

## Desarrollo local

```bash
npm i -g vercel        # una sola vez
cp .env.example .env.local   # y coloca los valores reales
vercel dev             # levanta frontend + funciones en localhost
```

No hay dependencias que instalar: las funciones usan el `fetch` nativo de
Node.js.
