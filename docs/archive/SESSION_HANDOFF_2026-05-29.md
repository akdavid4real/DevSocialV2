# Migration Handoff - Session Notes

Date: 2026-05-29

## Summary of completed work

- Completed React Vite route compatibility migration for the active frontend shell.
- Fixed router-shim parameter decoding in `frontend/src/lib/navigation.ts` so legacy paths work without Next router:
  - `/post/:id`
  - `/profile/:username`
  - `/community/:id`
- Added legacy route mappings in `frontend/src/App.tsx` for:
  - `/admin-roles`, `/home`, `/dashboard`
  - `/post/:id`, `/community/:id`
  - `/profile` and `/profile/:username`
  - `/admin/users/:userId`, `/create-community`
- Added and wired legacy confession route:
  - `frontend/src/app/(authenticated)/confess/page.tsx`
  - mapped to `/confess` in authenticated routes.
- Added concrete legacy-compatible public pages for:
  - `/terms`, `/privacy`, `/api-docs`, `/offline`, `/onboarding`
  - `/test-push` (migration stub)
- Verification checks still pass:
  - `corepack pnpm lint`
  - `corepack pnpm build`

## Current constraints

- Non-migrated parity items are intentionally paused for now.

## Immediate next action

- Continue migration against old `devsocial` route list and convert placeholders only when explicitly in scope.
