# finanzas-app-front

Front de finanzas-app, una app web (pensada para el celular) para llevar tus finanzas personales: categorías, gastos e ingresos, y totales por mes. Next.js + Supabase Auth; consume la API de [finanzas-app-back](../finanzas-app-back/README.md).

## Puesta en marcha local

Requisitos: Node 22+ y el back corriendo en `http://localhost:3001`.

```bash
npm install
cp .env.example .env.local   # completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000
```

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key del proyecto Supabase. |
| `NEXT_PUBLIC_API_URL` | URL pública del back (local: `http://localhost:3001`). |

## Tipos de la API

```bash
npm run api:tipos
```

Genera `src/lib/api/esquema.d.ts` a partir de `../finanzas-app-back/openapi.json` (el back debe estar clonado al lado; se regenera con `npm run openapi:export` en el back).

## Tests

```bash
npx vitest run
```

## Despliegue

Orden: Supabase, Railway (back), Vercel (front) y, al final, volver a Railway para fijar `FRONT_URL`.

### a) Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Authentication → Sign In / Providers → Email: desactiva **Confirm email**.
3. Project Settings → API: copia el **Project URL** y la **anon key** (para el front).
4. Connect → Connection string → **Transaction pooler**: copia la cadena Postgres (reemplaza la contraseña) para `DATABASE_URL` del back.

### b) Railway (back)

1. New Project → Deploy from GitHub repo → elige `finanzas-app-back`. Railway detecta el `Dockerfile`.
2. En Variables añade:
   - `DATABASE_URL`: la cadena del pooler de Supabase.
   - `SUPABASE_URL`: el Project URL.
   - `FRONT_URL`: provisional (ej. `http://localhost:3000`); se actualiza en el paso d.
   - `NODE_ENV=production`.
3. Settings → Deploy → **Pre-deploy command**: `npm run db:migrate` (en la imagen ejecuta `node dist/scripts/migrar.js` y aplica las migraciones de `drizzle/`).
4. Settings → Networking: genera un dominio público.
5. Verifica: `curl https://<back>/health` devuelve `{"status":"ok"}`.

### c) Vercel (front)

1. Add New Project → importa `finanzas-app-front`.
2. Variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`: el dominio público de Railway (con `https://`, sin barra final).
3. Deploy y copia la URL resultante.

### d) Cerrar el ciclo

En Railway cambia `FRONT_URL` por la URL de Vercel (sin barra final; es el único origen que permite CORS) y espera el redeploy.

### e) Prueba manual en el celular

Abre la URL de Vercel en el móvil:

- [ ] Registrarse y ver las 10 categorías sugeridas.
- [ ] Crear un gasto y un ingreso, y ver los totales.
- [ ] Cambiar a "mes anterior".
- [ ] Eliminar una categoría con movimientos usando "mover".
- [ ] Comprobar en Supabase (Table Editor) que los datos están guardados.
