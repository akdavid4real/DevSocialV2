# DevSocial Spring Backend

Incremental Spring Boot replacement for the NestJS backend. The frontend, mobile clients,
PostgreSQL schema, and Supabase project remain unchanged.

## Compatibility rules

- HTTP routes remain under `/api/v2`.
- Successful controller responses use `{ "success": true, "data": ... }`.
- Errors retain the existing `success`, `statusCode`, `timestamp`, `path`, and `error` fields.
- Existing `DATABASE_URL`, `FRONTEND_URL`, and `CORS_ORIGINS` variables are supported.
- Unmigrated routes are denied by default and must remain routed to NestJS.

## Build and test

The checked-in Maven Wrapper pins Maven 3.9.11, so a system Maven installation is not required:

```bash
./mvnw verify
```

The same build can run in a container:

```bash
docker build -t devsocial-backend-spring:local backend-spring
```

Spring listens on port `3001` by default so it can run beside NestJS on port `3000`.

Run the container with the same environment file currently used by NestJS:

```bash
docker run --rm --env-file backend/.env -p 3001:3001 devsocial-backend-spring:local
```

## Route ownership

The following routes are implemented and verified in Spring:

| Route | Authentication | Notes |
| --- | --- | --- |
| `GET /api/v2` | Public | Existing health/root response contract |
| `POST /api/v2/auth/login` | Public | Web HttpOnly cookie and mobile JSON token behavior |
| `POST /api/v2/auth/refresh` | Public | Rotates the web cookie or returns the mobile refresh token |
| `GET /api/v2/auth/me` | Bearer | Verifies Supabase, `auth.sessions`, block state, and local profile |

All other routes remain owned by NestJS. A gateway must only send the route groups listed
above to Spring; Spring denies unmigrated routes by default.

Authentication continues to use the existing `DATABASE_URL`, `SUPABASE_URL`, and
`SUPABASE_SERVICE_ROLE_KEY`. The Spring implementation does not create or migrate tables.

## Migration order

1. Compatibility and deployment foundation
2. Supabase authentication and current-user lookup
3. Users and onboarding
4. Storage
5. Follows, blocks, and privacy
6. Posts, comments, and likes
7. Search and trending

NestJS remains responsible for every route group until that entire group passes contract tests.
