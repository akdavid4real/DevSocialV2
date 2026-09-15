# DevSocial V2

DevSocial is a developer community platform for sharing posts, joining communities, building projects, and tracking learning progress.

## Apps

- `backend/` — NestJS API with Prisma and PostgreSQL
- `frontend/` — React + Vite web app
- `mobile/` — Expo mobile app

## Run locally

Install dependencies in each application:

```powershell
cd backend; bun install
cd ../frontend; bun install
cd ../mobile; bun install
```

Copy each `.env.example` file to its local `.env` equivalent and add your own environment values. Then run:

```powershell
# API
cd backend; bun run start:dev

# Web app
cd frontend; bun run dev

# Mobile app
cd mobile; bun run start
```

The web app is available at `http://localhost:5173`. Ensure `VITE_API_URL` points to the backend API, including its `/api/v2` path.

## Database

After configuring `DATABASE_URL` in `backend/.env`:

```powershell
cd backend
bunx prisma generate
bun run seed:affiliations
```

The affiliation seed is safe to run again; it only inserts missing catalogue entries.

## Security

Never commit filled `.env` files, API keys, or database exports.
