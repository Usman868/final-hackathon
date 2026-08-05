# MaintainIQ

AI-Powered QR Maintenance & Asset History Platform  
MERN stack · Hackathon Advanced Full-Stack + GenAI track

---

## What it does

- **Assets** with unique codes and QR codes that open a **public** page (no login)
- **Public issue reporting** with **AI triage** (human review / edit / accept before save)
- **Role-based staff app**: Admin, Supervisor, Technician
- **Issue workflow** with server-enforced status transitions
- **Permanent asset history** (append-only)
- **Dashboard** stats and charts
- **Notifications** (in-app + Socket.IO ready on backend)
- Evidence uploads via **Cloudinary** (when configured)

---

## Stack

| Layer | Tech |
|--------|------|
| Frontend | Vite · React 19 · React Router 7 · Tailwind CSS **v4** (`@tailwindcss/vite`) · Recharts · RHF + Zod · Lucide |
| Backend | Node · Express · MongoDB / Mongoose · JWT (httpOnly cookies + Bearer) · Socket.IO · Multer · Cloudinary · OpenAI |
| Auth roles | `ADMIN` · `SUPERVISOR` · `TECHNICIAN` · public reporter (no account) |

**Tailwind v4 note:** no `tailwind.config.js` / `postcss.config.js`. Plugin in `vite.config.js`; tokens via `@theme` in `src/index.css`.

---

## Prerequisites

- Node.js 20+
- MongoDB running locally (or Atlas URI)
- Optional: Cloudinary account, OpenAI API key

---

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — at minimum MONGODB_URI and JWT secrets
npm install
npm run seed    # 5 users, 22 assets, 12 issues
npm run dev     # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev     # http://localhost:5173
```

Frontend proxies `/api` to the backend in dev (`vite.config.js`).

---

## Demo accounts

Password for all: **`Demo@12345`**

| Role | Email |
|------|--------|
| Admin | `admin@maintainiq.demo` |
| Supervisor | `supervisor@maintainiq.demo` |
| Technician | `tech1@maintainiq.demo` |
| Technician | `tech2@maintainiq.demo` |
| Technician | `tech3@maintainiq.demo` |

Public asset pages: `/public/asset/{publicId}`  
(get `publicId` from asset detail or QR after seed).

---

## Environment

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | Mongo connection |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Yes | Token signing |
| `CLIENT_URL` | Yes | CORS + QR public links (e.g. `http://localhost:5173`) |
| `PORT` | No | Default `5000` |
| `OPENAI_API_KEY` | No | AI triage (fallback heuristics if missing) |
| `CLOUDINARY_*` | No | Evidence upload |
| `ORG_NAME` | No | Printed on QR labels |

### Frontend (`frontend/.env`)

| Variable | Default |
|----------|---------|
| `VITE_API_URL` | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | `http://localhost:5000` |

---

## Main API surface

| Area | Base |
|------|------|
| Auth | `/api/auth` (login, refresh, me, technicians) |
| Assets | `/api/assets` |
| Public | `/api/public/assets/:publicId` · report issue |
| Issues | `/api/issues` (list, assign, status transition) |
| AI | `/api/ai/triage` (public + staff) |
| Dashboard | `/api/dashboard/summary` |
| Notifications | `/api/notifications` |
| Uploads | `/api/issues/:id/evidence` |

---

## Frontend routes

| Path | Access |
|------|--------|
| `/login` | Public |
| `/public/asset/:publicId` | Public (no sidebar) |
| `/dashboard` | Staff |
| `/assets`, `/assets/:id`, `/assets/new` | Staff (create/edit Admin) |
| `/issues`, `/issues/:id` | Staff |
| `/notifications` | Staff |

---

## Business rules (server-enforced)

- Invalid **issue status** transitions are rejected
- **Maintenance notes** required before resolving
- Costs cannot be negative
- Asset **codes** and **publicIds** are unique and stable (QR never breaks on edit)
- History is permanent
- Public endpoints only expose safe fields

---

## Project layout

```
MaintainIQ/
├── CONTEXT.md          # Living progress tracker
├── README.md
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── services/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── ai/
│   │   ├── sockets/
│   │   └── seed/
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── pages/
    │   ├── layouts/
    │   ├── components/
    │   └── context/
    └── package.json
```

See **`CONTEXT.md`** for module-by-module completion status.

---

## Scripts

**Backend**

- `npm run dev` — nodemon
- `npm run seed` — demo data (clears collections first)
- `npm start` — production node

**Frontend**

- `npm run dev` — Vite
- `npm run build` — production build
- `npm run preview` — preview build

---

## Notes

- AI triage always returns structured suggestions; the UI requires **human accept** (and records edit flags).
- Without `OPENAI_API_KEY`, triage uses a deterministic fallback so the flow still works offline.
- Without Cloudinary, core CRUD and workflows still run; evidence upload needs Cloudinary credentials.


---

## Deploy (Vercel + Render)

See **[DEPLOY.md](./DEPLOY.md)** for:

- Frontend on **Vercel**
- Backend on **Render** (Socket.IO) or Vercel REST-only
- GitHub Actions CI/CD
- Env vars checklist
