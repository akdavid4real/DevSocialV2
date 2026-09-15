# DevSocial V2 Frontend Conversion: Continuation Notes

## Verification snapshot

- Frontend project dependencies and scripts are Vite-based (`vite`, `vite build`, `vite preview`).
- Manual router shim is used in `src/lib/navigation.ts` (custom `useRouter`, `usePathname`, `useSearchParams`) to avoid Next runtime imports.
- `corepack pnpm build` now passes in `DevSocialV2/frontend`.
- `corepack pnpm lint` now passes in `DevSocialV2/frontend`.

## What is currently migrated in Vite shell

- Route mapping in `src/App.tsx` handles:
  - auth pages
  - public home/feed
  - settings cluster
  - posts/projects/knowledge-bank/communities/career-paths/feedback/tags
  - moderation/admin dashboard screens
  - notifications/messages/challenges/missions/referrals/trending
- Legacy-looking Next page modules are retained as V2 view modules under `src/app/**/page.tsx` (not Next runtime pages), all imported directly by `src/App.tsx`.
- Router-shim param support covers legacy aliases used by old links (`/post/:id`, `/profile/:username`, `/community/:id`).

## Route parity check against old `devsocial`

- Mapped with concrete pages:
  - `/terms`, `/privacy`, `/api-docs`, `/offline`, `/onboarding`
  - `/test-push` (migration stub)
- Mapped as aliases:
  - `/home`, `/dashboard` -> home route
  - `/create-community` -> community create
  - `/confess` -> confess page
  - `/admin-roles`, `/admin/roles`, `/admin/bots`, `/admin/users/:userId`
- Admin and analytics surfaces are mapped in shell:
  - `/admin`, `/admin/*` and `/analytics/*`

## Suggested next actions

1. Keep `/test-push` as migration stub unless non-route parity work is re-enabled.
2. Decide whether to introduce `react-router-dom` as the routing layer when route volume grows.
3. Keep remaining financial/payment integrations out of scope unless explicitly re-enabled.
