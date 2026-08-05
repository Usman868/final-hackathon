# MaintainIQ – Deploy Guide

## Recommended architecture

| Part | Platform | Why |
|------|----------|-----|
| **Frontend** | **Vercel** | Vite SPA, free HTTPS, easy env |
| **Backend** | **Render** (or Railway) | Long-running Node + **Socket.IO** + cookies |
| **Database** | **MongoDB Atlas** | Managed Mongo |

> **Note:** Vercel serverless does **not** support Socket.IO well.  
> REST API *can* run on Vercel (`backend/vercel.json`), but use **Render** for production alerts/realtime.

---

## 1. MongoDB Atlas

1. Create cluster + database user  
2. Network Access → allow `0.0.0.0/0` (or platform IPs)  
3. Copy connection string  

---

## 2. Backend on Render

1. [render.com](https://render.com) → New → Web Service  
2. Connect GitHub repo, root directory: `backend`  
3. Build: `npm install` · Start: `npm start`  
4. Environment variables:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<long random>
JWT_REFRESH_SECRET=<long random>
CLIENT_URL=https://your-frontend.vercel.app
OPENAI_API_KEY=optional
CLOUDINARY_CLOUD_NAME=optional
CLOUDINARY_API_KEY=optional
CLOUDINARY_API_SECRET=optional
ORG_NAME=MaintainIQ
```

5. After deploy, run seed once (Render shell or local against Atlas):

```bash
cd backend && npm run seed
```

6. Note your API URL, e.g. `https://maintainiq-api.onrender.com`

Optional: use `backend/render.yaml` Blueprint.

---

## 3. Frontend on Vercel

1. [vercel.com](https://vercel.com) → Import Git repo  
2. **Root Directory:** `frontend`  
3. Framework: Vite (auto)  
4. Environment variables:

```
VITE_API_URL=https://maintainiq-api.onrender.com/api
VITE_SOCKET_URL=https://maintainiq-api.onrender.com
```

5. Deploy  

CORS: set backend `CLIENT_URL` to your Vercel URL (no trailing slash).

---

## 4. Backend on Vercel (REST only, optional)

```bash
cd backend
npx vercel
```

Uses `src/server.vercel.js`. **No Socket.IO.**  
Set the same env vars in the Vercel project.

---

## 5. GitHub Actions CI/CD

Workflows in `.github/workflows/`:

| File | Purpose |
|------|---------|
| `ci.yml` | On PR/push: backend syntax check + frontend build |
| `deploy-vercel.yml` | Deploy frontend to Vercel (needs secrets) |
| `deploy-backend.yml` | Optional Render deploy hook |

### Secrets (GitHub → Settings → Secrets)

- `VERCEL_TOKEN` – from Vercel account settings  
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` – from `.vercel/project.json` after `vercel link`  
- `RENDER_DEPLOY_HOOK_URL` – optional  

### Variables

- `VITE_API_URL`  
- `VITE_SOCKET_URL`  

---

## 6. Local production-like test

```bash
# backend
cd backend && npm start

# frontend
cd frontend
VITE_API_URL=http://localhost:5000/api npm run build
npm run preview
```

---

## Checklist

- [ ] Atlas IP / URI works  
- [ ] Backend health: `GET https://api.../api/health` (if exposed) or login  
- [ ] Frontend env points at API  
- [ ] `CLIENT_URL` matches frontend origin  
- [ ] Seed run against production DB once  
- [ ] Admin login works  
