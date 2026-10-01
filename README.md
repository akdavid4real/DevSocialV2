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

## Run the web app and API with Docker

Requires Docker Engine/Desktop with Compose v2 or newer. Run these commands from
the repository root (the mobile app stays outside Docker):

```bash
# First-time setup; don't overwrite an existing backend/.env.
cp -n backend/.env.example backend/.env
cp -n .env.docker.example .env.docker
```

Fill `backend/.env` with your existing database URL, Supabase URL, and service-role
key. Fill `.env.docker` with the matching **public** Supabase URL and anon key;
the VAPID public key is optional. Docker excludes all `.env` files from builds.
For Docker on an IPv4-only network, use **Supabase → Connect → Session pooler**
for `DATABASE_URL` (port 5432). The direct `db.<project-ref>.supabase.co` endpoint
normally requires IPv6. Copy the exact pooler hostname and username from the
Connect dialog; the hostname cannot be inferred reliably from the project region.
Keep your database password, percent-encoding any reserved URL characters.
Never put the service-role key, database password, or VAPID private key in a
`VITE_` variable: Vite embeds those values in browser JavaScript.

```bash
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
```

Open **http://localhost:5173**. The frontend proxies `/api/` to the backend;
you can also check the API directly at http://localhost:3000/api/v2.
Ports are bound to localhost. Stop the containers with:

```bash
docker compose --env-file .env.docker down
```

If the API exits, inspect `docker compose --env-file .env.docker logs backend`.
`P1001` / `DatabaseNotReachable` means the database connection needs checking;
in particular, check the IPv4/session-pooler setting above. After changing only
`backend/.env`, run `docker compose --env-file .env.docker up -d` to recreate the
backend with the new environment. No image rebuild is needed.

This runs compiled app images, without hot reload. After editing source, run
`up --build -d` again. To rebuild only the changed app:

```bash
docker compose --env-file .env.docker up --build -d --no-deps frontend
# Or replace frontend with backend.
```

The API still uses your configured database and Supabase services. No database
container is provisioned and no migrations or repair scripts run automatically.
Use an already initialized development project. The existing app may seed its
affiliations catalogue at startup if the table is empty. The Compose setup uses
`NODE_ENV=development` for local HTTP auth cookies, while the backend image itself
defaults to production. Use HTTPS and production settings when deploying it.

For a test email without an inbox, set `DEV_AUTH_TEST_EMAIL` in `.env.docker`
to that account's email, then recreate the backend. After registering the account,
confirm it locally using:

```bash
curl --fail-with-body http://localhost:3000/api/v2/auth/dev/verify \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-configured-test-email@example.test"}'
```

Then sign in with that email and the password chosen during signup. This confirms
the account in Supabase and the app database; normal password authentication still
applies. The endpoint requires `NODE_ENV=development` and an exact match with the
configured email. Clear `DEV_AUTH_TEST_EMAIL` and recreate the backend to disable
the endpoint. An account already confirmed remains confirmed.

### How the Docker builds stay small and fast

- Each app has its own build context and an allowlist in `.dockerignore`. The
  builder never receives the whole repository, local `node_modules`, credentials,
  backups, or the mobile app. Prisma's client is generated inside the build.
- Dependency manifests are copied before source, so source edits reuse the
  dependency layers. BuildKit also caches Bun downloads when dependencies change.
- Frozen Bun lockfiles make installs reproducible. Commit both apps' `bun.lock`
  files alongside the Dockerfiles, including the existing local lockfile changes.
- Multi-stage builds keep compilers and build tools outside the final images.
  The API runs on Node with production dependencies; the web image contains only
  compiled static files and nginx. Both run as non-root users.
- Frontend public configuration is supplied after dependency installation, so
  changing it rebuilds the web bundle without reinstalling dependencies.

The first build downloads base images and packages; later builds reuse them.
Avoid `--no-cache` or deleting the builder cache for routine rebuilds. Changes to
frontend public variables require a rebuild because they are compiled into Vite's
output. This Compose setup is for local Docker; it is not a Kubernetes deployment
or a Vercel deployment configuration.

References: [Docker build cache optimization](https://docs.docker.com/build/cache/optimize/)
and [multi-stage build guidance](https://docs.docker.com/build/building/best-practices/).

## Jenkins, Kubernetes and Render

The coursework pipeline, Kubernetes manifests, and Render Free blueprint are
included. See [deployment setup](deploy/README.md) for local Jenkins and the
free hosted Kubernetes lab route. Infrastructure files alone do not provision
a hosted cluster or Render services.

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
