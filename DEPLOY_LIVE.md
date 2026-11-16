# PlaceTrack — live (Vercel + Render) checklist

## 1) Render — backend API

**Environment variables (required):**

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Render Postgres **Internal** URL, or Neon/Supabase URL with `?sslmode=require` |
| `JWT_SECRET` | long random string |
| `JWT_REFRESH_SECRET` | long random string |
| `FRONTEND_URL` | `https://placetrack.urbancode.in` |
| `CORS_ORIGIN` | `https://placetrack.urbancode.in` |
| `NODE_ENV` | `production` |

**Do not** use `localhost` or a VPS IP in `DATABASE_URL` unless that server allows remote connections (firewall + PostgreSQL `listen_addresses`).

After deploy, open: `https://place-track-1.onrender.com/health`  
→ should return JSON `"success": true` (not 503).

Run SQL once on the DB: `backend/scripts/schema.sql`, `backend/scripts/add_perf_indexes.sql`.

## 2) Vercel — frontend

**Build env (optional if using repo defaults):**

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `/api` |
| `VITE_SOCKET_URL` | `https://place-track-1.onrender.com` |

`frontend/vercel.json` proxies `/api/*` and `/health` to your Render service.  
If your Render URL changes, update the `destination` URLs in `vercel.json` and redeploy.

## 3) Google Chat daily board (Render free)

- `GOOGLE_CHAT_WEBHOOK_URL`
- `GOOGLE_CHAT_CRON_SECRET`
- cron-job.org → `GET https://place-track-1.onrender.com/api/public/cron/google-chat-board?secret=YOUR_SECRET` at 08:00 IST

## 4) Linode auto-deploy (GitHub → VPS)

On each push to `main`, GitHub Actions calls the API deploy webhook.

**Linode `backend/.env`:**
```
DEPLOY_SECRET=long-random-string-here
```

**One-time on server:**
```bash
cd ~/place_track && git pull --ff-only
chmod +x backend/scripts/linode-auto-deploy.sh
# add DEPLOY_SECRET to backend/.env
pm2 restart Place-track-backend --update-env
```

**GitHub repo → Settings → Secrets and variables → Actions:**
| Secret | Value |
|--------|--------|
| `LINODE_DEPLOY_URL` | `https://api.placetrack.urbancode.in/api/public/deploy` |
| `LINODE_DEPLOY_SECRET` | same as `DEPLOY_SECRET` |

Manual test:
```bash
curl -X POST -H "x-deploy-secret: YOUR_SECRET" https://api.placetrack.urbancode.in/api/public/deploy
# expect HTTP 202
tail -f ~/place_track/backend/logs/auto-deploy.log
```

## Quick test

1. `https://place-track-1.onrender.com/health` → OK  
2. `https://placetrack.urbancode.in/health` → OK (via Vercel proxy)  
3. Login on live site
