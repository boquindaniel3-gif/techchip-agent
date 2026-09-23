# Resolx Agent — CLI + web + API

Agente de balance logístico **AX = B**.
Gauss, Gauss-Jordan e inversa en Python (sin `np.linalg.solve`), expuesto como CLI y como API Docker. El frontend es Next.js (Vercel) con autenticación e historial en **Supabase**.

## Por qué Supabase (y no Clerk)

Hace falta login **y** guardar matrices/resoluciones por usuario. Supabase cubre Auth + Postgres + RLS. Clerk solo cubre el login y exigiría otra base de datos.

## Arranque local

```bash
# API (sin JWT, para desarrollo)
docker compose up --build api

# o sin Docker:
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r api/requirements.txt
AUTH_DISABLED=true .venv/bin/python -m uvicorn api.main:app --reload --port 8000

# Web
cd web
cp .env.example .env.local   # opcional: deja vacío Supabase para entrar sin login
npm install
npm run dev
```

CLI del parcial:

```bash
.venv/bin/python resolx_agent.py --stress
.venv/bin/python resolx_agent.py --json data/modelo_base.json
```

## Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Authentication → Providers → Email (activar).
3. SQL Editor: ejecuta [`supabase/schema.sql`](supabase/schema.sql).
4. Settings → API: copia URL y `anon` key.
5. Settings → API → JWT (solo si el proyecto usa HS256 legado): `JWT Secret`.
6. Authentication → URL configuration: añade `http://localhost:3000` y el dominio de Vercel.

Variables:

| Dónde | Variable |
| --- | --- |
| API / Railway | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` (opcional), `CORS_ORIGINS`, `AUTH_DISABLED=false` |
| Web / Vercel | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` |

Copia [`.env.example`](.env.example) y `web/.env.example`.

## GitHub + Vercel + Railway

1. Crea un repositorio vacío en GitHub y súbelo:

```bash
git add .
git commit -m "Agente Resolx CLI, API Docker y web Next.js"
git remote add origin git@github.com:TU_USUARIO/resolx-agent.git
git push -u origin master
```

2. **Vercel** → Add Project → el mismo repo → Root Directory = `web`.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` = URL pública de Railway (https://....up.railway.app)

3. **Railway** → New → GitHub repo.
   - Detecta `railway.toml` (Dockerfile en `api/Dockerfile`, contexto la raíz).
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CORS_ORIGINS` = `https://tu-app.vercel.app,http://localhost:3000`
   - `AUTH_DISABLED=false`
   - Genera dominio público.

4. En Supabase, autoriza el origen de Vercel (CORS de Auth no es el de la API; la API usa `CORS_ORIGINS`).

Vercel **no** ejecuta el contenedor Python. El Docker vive en Railway (o Fly.io).

## Endpoints

- `GET /health`
- `GET /api/modelo-base` (JWT)
- `POST /api/resolver` body `{ A, B, method, persistir }`
- `POST /api/estres`
- `GET /api/historial`

PyCharm: abre la raíz del repo. El backend es `resolx_agent.py` + `api/`. La carpeta `web/` es el frontend.
