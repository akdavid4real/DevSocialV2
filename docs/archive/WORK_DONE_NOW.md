# DevSocialV2 Migration Work Summary (Current State)

Date: 2026-05-29

Scope requested: continue route migration in a non-financial scope.

Completed migration work
=======================

- Switched/confirmed public route wiring in frontend/src/App.tsx for legacy-compatible paths, including:
  - Auth routes (/auth/* and aliases)
  - Public routes (/onboarding, /api-docs, /offline, /privacy, /terms, /test-push)
  - Core app routes (/, /career-paths, /communities, /posts/:id, /projects, /trending, /feedback, etc.)
  - Settings cluster and route aliases
  - Admin cluster and analytics cluster
  - Legacy aliases (/home, /dashboard, /admin-roles, /create-community, /profile/:username, /community/:id, /post/:id, /admin/users/:userId)

- Added concrete route modules for previously missing legacy-public pages:
  - frontend/src/app/terms/page.tsx
  - frontend/src/app/privacy/page.tsx
  - frontend/src/app/offline/page.tsx
  - frontend/src/app/api-docs/page.tsx
  - frontend/src/app/test-push/page.tsx (migration stub)
  - frontend/src/app/onboarding/page.tsx (re-export wrapper to onboarding flow)

- Added/verified legacy route compatibility behavior:
  - /confess routed to frontend/src/app/(authenticated)/confess/page.tsx
  - Router shim enhancements in frontend/src/lib/navigation.ts:
    - /post/:id
    - /profile/:username
    - /community/:id

- Kept /admin/users/:userId mapped to admin users shell in-app while a dedicated detail page is still pending.

Verified checks
==============

- corepack pnpm lint (frontend): pass
- corepack pnpm build (frontend): pass
- Existing Vite chunk-size warning remains unchanged and non-blocking.
- corepack pnpm build (backend): pass
- backend eslint/full lint script did not complete within current environment window (timeout), but backend `nest build` passed.

Files changed in this pass
=========================

- frontend/src/App.tsx
- frontend/src/lib/navigation.ts (param decoding)
- frontend/src/app/terms/page.tsx
- frontend/src/app/privacy/page.tsx
- frontend/src/app/offline/page.tsx
- frontend/src/app/api-docs/page.tsx
- frontend/src/app/test-push/page.tsx
- frontend/src/app/onboarding/page.tsx
- frontend/src/app/(authenticated)/confess/page.tsx
- backend/src/users/users.controller.ts
- backend/src/users/users.service.ts
- backend/src/auth/auth.service.ts
- backend/src/users/dto/connect-wallet.dto.ts (removed)
- backend/prisma/schema.prisma
- backend/prisma/migrations/20260523000000_add_user_wallet_fields/migration.sql (removed)
- backend/src/generated/prisma (regenerated)
- HEDERA_WALLET_REMOVAL_REPORT.md

Constraints
===========

- Migration remains within frontend route compatibility and parity documentation.
- Backend wallet/Hedera scope was cleaned in this pass:
  - Removed connect-wallet and disconnect-wallet APIs.
  - Removed wallet-related columns from Prisma `User` schema and regenerated client artifacts.
  - Removed wallet fields from auth/profile response payloads.

Next recommended item
=====================

- Create dedicated detail page behavior for /admin/users/:userId only if user-management detail views are required; otherwise leave as intentional admin shell behavior.
