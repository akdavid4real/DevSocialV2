# Route Compatibility Completion Report

Date: 2026-05-29

## What is now complete

- Frontend migration is running as a Vite shell with manual route wiring in `frontend/src/App.tsx`.
- Admin and analytics surfaces are now wired and validated:
  - `/admin`, `/admin/bots`, `/admin/roles`, `/admin/ai-logs`, `/admin/audit`, `/admin/posts`, `/admin/reports`, `/admin/users`
  - `/analytics`, `/analytics/content`, `/analytics/growth`, `/analytics/realtime`, `/analytics/users`
- Legacy-compatible route aliases added in `frontend/src/App.tsx`:
  - `/admin-roles`, `/home`, `/dashboard`, `/post/:id`, `/community/:id`, `/profile`, `/profile/:username`, `/admin/users/:userId`, `/create-community`
- New legacy route migrated:
  - `/confess` added and implemented at `frontend/src/app/(authenticated)/confess/page.tsx`, mapped to `ConfessPage`
- Concrete legacy route pages currently added:
  - `/terms`
  - `/privacy`
  - `/api-docs`
  - `/offline`
  - `/onboarding`
  - `/test-push`
- Route-param shim parity updates in `frontend/src/lib/navigation.ts`:
  - `/post/:id` maps to `{ id }`
  - `/profile/:username` maps to `{ username: @<value> }`
  - `/community/:id` maps to `{ idOrSlug }`

## What is still non-migrated

- `/test-push` remains a migration stub by design.

## Verification

- `corepack pnpm lint` (frontend): pass
- `corepack pnpm build` (frontend): pass
- Existing Vite chunk-size warning remains unchanged.

## Scope note

- Non-financial scope remains intentionally out of scope in this pass.
