# MaintainIQ Backend

AI-Powered QR Maintenance & Asset History Platform – Backend (Express + MongoDB + Socket.IO + Cloudinary + GenAI)

## Tech Stack

- Node.js ≥ 18
- Express.js
- MongoDB + Mongoose
- JWT (Access + Refresh tokens in httpOnly cookies)
- Socket.IO
- Cloudinary + Multer
- OpenAI / Gemini for AI Issue Triage
- Helmet, Compression, Morgan, Rate Limiter, express-validator

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, Cloudinary, OpenAI keys

# Development
npm run dev

# Production
npm start

# Seed demo data (after models are ready)
npm run seed
```

## API Base

```
http://localhost:5000/api
```

Health check: `GET /api/health`

## Project Structure

```
backend/
├── src/
│   ├── config/          # Environment & DB connection
│   ├── database/        # (optional extra DB helpers)
│   ├── models/          # Mongoose schemas
│   ├── controllers/     # Route handlers
│   ├── routes/          # Express routers
│   ├── services/        # Business logic
│   ├── middlewares/     # Auth, error, upload, rate-limit
│   ├── validators/      # express-validator chains
│   ├── sockets/         # Socket.IO events
│   ├── cloudinary/      # Cloudinary config + helpers
│   ├── ai/              # AI Issue Triage service
│   ├── utils/           # ApiError, ApiResponse, logger, etc.
│   ├── helpers/         # Small pure helpers
│   ├── constants/       # Roles, statuses, transitions
│   ├── jobs/            # node-cron jobs
│   ├── events/          # Domain events
│   ├── seed/            # Demo data
│   ├── docs/            # API documentation notes
│   ├── app.js           # Express app
│   └── server.js        # HTTP server + graceful shutdown
├── .env.example
├── nodemon.json
└── package.json
```

## Roles

| Role        | Access |
|-------------|--------|
| ADMIN       | Full control – assets, issues, users, reports |
| TECHNICIAN  | Assigned issues only – inspection, maintenance, evidence |
| SUPERVISOR  | Approve / reject / reopen, performance views |
| Public      | No login – only public asset page + report issue |

## Status Workflows

See `src/constants/index.js` for the complete allowed transition matrix.

## Environment Variables

See `.env.example` for the full list.

## License

MIT
