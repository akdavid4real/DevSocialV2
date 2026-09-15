# Route Migration Handoff (Current Checkpoint)

**Date:** 2026-05-29  
**Branch context:** `DevSocialV2` Vite migration shell (`frontend/src/App.tsx`)

## Scope reminder

- No payment-integrated features in progress.
- Continue only route and core-product migration parity.

## What I changed in this checkpoint

- Updated `frontend/src/App.tsx` route wiring to include the missing parity imports:
  - `@/app/admin/roles/page`
  - `@/app/admin/bots/page`
  - `@/app/analytics/page`
  - `@/app/analytics/content/page`
  - `@/app/analytics/growth/page`
  - `@/app/analytics/realtime/page`
  - `@/app/analytics/users/page`
- Extended `adminRoutes` with:
  - `/admin/roles`
  - `/admin/bots`
- Added a new `analyticsRoutes` map and renderer block for:
  - `/analytics`
  - `/analytics/content`
  - `/analytics/growth`
  - `/analytics/realtime`
  - `/analytics/users`
- Preserved authenticated wrapping behavior:
  - admin routes still use `AdminLayout`
  - analytics routes use `AuthenticatedLayout`

- Added concrete route files for all newly mapped views so the shell is compile-safe:
  - `frontend/src/app/admin/roles/page.tsx`
  - `frontend/src/app/admin/bots/page.tsx`
  - `frontend/src/app/analytics/page.tsx`
  - `frontend/src/app/analytics/content/page.tsx`
  - `frontend/src/app/analytics/growth/page.tsx`
  - `frontend/src/app/analytics/realtime/page.tsx`
  - `frontend/src/app/analytics/users/page.tsx`

## Current validation

- Route map now includes the remaining legacy-facing admin/analytics endpoints for parity.
- Legacy placeholders are still in place for:
  - `/terms`
  - `/privacy`
  - `/api-docs`
  - `/offline`
- The shell remains a manual route map in `App.tsx` (not router-based), consistent with current migration pattern.

- Frontend build (`corepack pnpm build`) now succeeds with only the existing Vite chunk-size warning.

- Important gap / fix required next

- The roles/bots/analytics routes now have real implementations; remaining actions should focus on backend parity for API-backed behavior:
  - `/admin/bots` still depends on backend endpoint (`/admin/bots`) which is not yet implemented in `backend`.
  - Some analytics pages still use fallback data to avoid empty states when `/admin/dashboard/*` payloads are partial.
- Consider adding these pages' action flows and data contracts to match the old app behavior while preserving the non-financial migration scope.

## Work already complete in broader migration context

- Auth/account flows, profile features, feed/posts/tags/search, comments/reactions, communities, projects, knowledge bank, feedback, reports/moderation, admin user operations, admin AI logs, dashboard metrics, AI helper endpoints, appearance settings persistence, push notifications, and ready player me integration are already completed and documented in:
  - `MIGRATION_PROGRESS.md`
  - `MIGRATION_HANDOFF_NOTE.md`
  - `MIGRATION_CONTINUATION_ROUTES.md`

## Decision log

- Financial integrations remain paused as requested and are still out of scope for the active migration pass.

