# Deploy Task Manager to Railway (Recommended)

## Why Railway over Vercel for this project

| | **Railway** | **Vercel** |
|---|-------------|------------|
| **Best for** | Full-stack apps, APIs, workers | Frontend & serverless functions |
| **FastAPI backend** | ✅ Long-running server, native support | ❌ Not ideal (serverless limits) |
| **React frontend** | ✅ Static or Node server | ✅ Excellent |
| **MongoDB / Redis** | Use Atlas + Redis add-on or Upstash | External only |
| **Single platform** | ✅ Backend + frontend + env in one place | Usually split frontend + API elsewhere |

**Recommendation:** Use **Railway** to run both the FastAPI backend and the React frontend. Use **MongoDB Atlas** (free tier) and **Redis** (Railway Redis add-on or [Upstash](https://upstash.com) free tier) as external services.

---

## Prerequisites

- [Railway](https://railway.app) account (GitHub login)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free cluster
- This repo connected to GitHub

---

## Step 1: MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user (username + password).
3. **Network Access** → Add IP: `0.0.0.0/0` (allow from anywhere; Railway IPs change).
4. Get your connection string:  
   **Connect** → **Drivers** → copy URI, e.g.:  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/appotime?retryWrites=true&w=majority`  
   Replace `USER`, `PASSWORD`, and database name if you use something other than `appotime`.

---

## Step 2: Redis (choose one)

**Option A – Railway Redis (if available in your plan)**  
- In your Railway project, add a **Redis** plugin.  
- Use the generated `REDIS_URL` in your backend service.

**Option B – Upstash (free tier)**  
- Sign up at [Upstash](https://upstash.com) → create a Redis database.  
- Copy the REST or connection URL and use it as `REDIS_URL` (e.g. `rediss://default:xxx@xxx.upstash.io:6379`).

---

## Step 3: Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project**.
2. **Deploy from GitHub repo** → select `Artechsolutions-arts/TASK-MANAGER`.
3. Add a **service** and set:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Watch Paths:** `backend/**`
4. In the service, open **Variables** and add:

   | Variable | Value |
   |----------|--------|
   | `DATABASE_URL` | Your MongoDB Atlas URI |
   | `REDIS_URL` | Your Redis URL (Railway or Upstash) |
   | `SECRET_KEY` | Long random string (e.g. 32+ chars) |
   | `CORS_ORIGINS` | Your frontend URL(s), e.g. `https://your-app.up.railway.app` |
   | `ENVIRONMENT` | `production` |
   | `DEBUG` | `False` |

5. **Settings** → **Networking** → **Generate Domain**.  
   Note the URL (e.g. `https://your-backend.up.railway.app`).

---

## Step 4: Deploy Frontend on Railway

1. In the **same project**, add another service.
2. Connect the **same GitHub repo** again (or use the same repo, different service).
3. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm ci && npm run build`
   - **Output Directory:** `dist`
   - **Start Command (static):** `npx serve -s dist -l $PORT`  
     (Install serve: add `"serve": "^14.2.0"` to `frontend/package.json` devDependencies, or use **Start Command:** `npx serve -s dist -l 3000` and set Railway to use port 3000 if needed.)

   **Simpler option:** Use Railway’s **Static Site** preset if available:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`

4. In **Variables** add:
   - `VITE_API_URL` = your backend URL from Step 3 (e.g. `https://your-backend.up.railway.app`).

5. **Settings** → **Networking** → **Generate Domain** for the frontend.  
   Use this URL in the backend `CORS_ORIGINS` (and update the backend variable if you hadn’t set it yet).

---

## Step 5: Seed data (optional)

After the backend is deployed and healthy:

1. **Railway** → backend service → **Settings** → run a one-off command, or use **Shell** in the deploy logs.
2. Run:  
   `python -m scripts.seed_data`  
   (from repo root you may need to run from `backend` and ensure `scripts` is on the path; adjust to match your repo layout.)

Alternatively run the seed script locally with `DATABASE_URL` and other env vars set to your production values.

---

## Step 6: Celery (optional)

If you use Celery in production:

1. Add a **third service** in the same project.
2. Same repo, **Root Directory:** `backend`.
3. **Start Command:** `celery -A app.celery_app worker --loglevel=info`
4. Reuse the same variables as the backend (`DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, etc.).

---

## Environment variables summary

**Backend**

- `DATABASE_URL` – MongoDB Atlas URI  
- `REDIS_URL` – Redis URL  
- `SECRET_KEY` – 32+ character secret  
- `CORS_ORIGINS` – Frontend URL(s), comma-separated  
- `ENVIRONMENT=production`  
- `DEBUG=False`  
- `CELERY_BROKER_URL` – Same Redis or dedicated (e.g. `redis://.../1`)  
- `CELERY_RESULT_BACKEND` – Same Redis or dedicated (e.g. `redis://.../2`)

**Frontend**

- `VITE_API_URL` – Backend public URL (no trailing slash)

---

## If you prefer Vercel (frontend only)

You can host **only the frontend** on Vercel and keep the API on Railway:

1. **Vercel:** New Project → Import `TASK-MANAGER` repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Environment variable:** `VITE_API_URL` = your Railway backend URL
5. Deploy. Then add the Vercel URL (e.g. `https://task-manager.vercel.app`) to the backend `CORS_ORIGINS` on Railway.

This keeps the API on Railway and uses Vercel only for the React app.

---

## Quick links

- [Railway Docs](https://docs.railway.app)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Upstash Redis](https://upstash.com)
