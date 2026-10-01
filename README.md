# DevSocial V2

DevSocial is a developer community platform for posts, communities, projects, and learning.

## Apps

- `backend-spring/` — current web API: Spring Boot, Java 17, Maven Wrapper, JUnit 5.
- `frontend/` — React + Vite web app.
- `backend/` — legacy NestJS backend and existing Prisma tooling; not deployed by the current pipeline.
- `mobile/` — unchanged Expo mobile app.

The previous main version is preserved on `legacy/nestjs`; the original coursework
setup remains on `coursework/jenkins-kubernetes`.

## Run locally

Put the existing database/Supabase configuration in `backend-spring/.env`.
Spring loads it automatically when started from that directory:

```bash
cd backend-spring
./mvnw spring-boot:run
```

In another terminal, configure `frontend/.env.local` with public
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
`VITE_API_URL=http://localhost:3001/api/v2`, then:

```bash
cd frontend
bun install --frozen-lockfile
bun run dev
```

The frontend normally runs at http://localhost:5173 and the API at
http://localhost:3001/api/v2. Keep `CORS_ORIGINS` in the backend env file aligned
with your actual frontend origin. Mobile setup is unchanged.

## Docker: web frontend and Spring API

Requires Docker with Compose v2. From the repository root:

```bash
# First-time setup only; preserve existing environment files.
cp -n backend-spring/.env.example backend-spring/.env
cp -n .env.docker.example .env.docker
```

Fill `backend-spring/.env` with your existing database URL, Supabase URL, and
service-role key. Fill `.env.docker` with the matching public Supabase URL and anon
key. Never put database credentials, service-role keys, or private push keys in
`VITE_` variables: those are embedded in browser JavaScript.

Use the exact Supabase connection details for your existing database. If your
Docker network cannot reach its direct IPv6 database endpoint, use the connection
details supplied by your project for its session pooler; do not guess the host.

```bash
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
```

Open http://localhost:5173. The frontend proxies `/api/` to Spring on port 3001.
The API can also be checked directly:

```bash
curl --fail http://localhost:3001/api/v2/actuator/health/readiness
```

Compose uses development cookies for local HTTP. Production images default to
secure cookies and require HTTPS frontend origins. Spring does not implement
the legacy development email-verification bypass; use normal Supabase verification.

No database container, migrations, repair scripts, or automatic seeding are run.
The existing PostgreSQL schema and Supabase project are unchanged.

After source edits, rebuild with `up --build -d`. After changing only
`backend-spring/.env`, recreate with `up -d` (no image rebuild needed).
Frontend `VITE_` changes require rebuilding the frontend image.
Inspect backend connection/startup failures with:

```bash
docker compose --env-file .env.docker logs backend
```

Stop the containers with `docker compose --env-file .env.docker down`.

### Build behavior

- Each app has its own build context; local environment files and build output are excluded.
- Maven dependencies are downloaded before source copying to reuse builder layers.
- The Spring Docker build runs `./mvnw verify`, including the full JUnit 5 suite.
- The runtime image contains Java 17 and the executable JAR, not Maven or source.
- The frontend uses its frozen Bun lockfile and runs its TypeScript/Vite production build.
- Both runtime images run as non-root users. Mobile is outside the build.

## Jenkins, Kubernetes and Render

See [deployment setup](deploy/README.md). The root Jenkinsfile now targets Spring
and the web frontend, with JUnit reports and optional image publishing/deployments.
Configure the SCM branch as `*/main` after pushing your local changes.
Infrastructure files alone do not provision or update external services.

Kubernetes uses Spring readiness/liveness endpoints and port 3001. The disposable
lab continues to run only the frontend, connected to the Render API.

## Tests

```bash
cd backend-spring
./mvnw verify
```

For the frontend, run `bun run build` from `frontend/`.

## Database and security

Use the existing initialized database. Legacy Prisma scripts in `backend/` are
available for intentional maintenance, but are not executed by Docker/Jenkins.
Never commit filled environment files, private keys, database exports, or kubeconfigs.
