# MaintainIQ Frontend

Vite + React 19 + Tailwind CSS v4

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

## Tailwind CSS v4

- Plugin: `@tailwindcss/vite` in `vite.config.js`
- **No** `tailwind.config.js` / `postcss.config.js`
- Import only in `src/index.css`: `@import "tailwindcss";`
- Design tokens via `@theme { ... }`

## Stack

- React 19, React Router DOM 7
- Axios (credentials + token refresh)
- React Hook Form + Zod
- Lucide React, Framer Motion, Recharts
- React Hot Toast, react-qr-code, html2canvas, jspdf
- date-fns, clsx, socket.io-client

## Demo login

See backend seed: `admin@maintainiq.demo` / `Demo@12345`
