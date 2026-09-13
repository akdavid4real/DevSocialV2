# DevSocial V2 Migration Handoff

## Date

2026-05-29

## Current State

The frontend migration from Next-style assumptions to a Vite + React app is ongoing and stable for the already-ported product surfaces. The old `devsocial` app is used only as behavior reference; it is not being copied structurally into V2.

Financial/payment functionality is explicitly out of scope right now and has not been part of recent migration work.

## Completed Migration Slices

### Frontend shell and routing
- Vite entry setup (`index.html`, `src/main.tsx`, `src/App.tsx`) and route wiring.
- Manual route mapping from the old app intent into the V2 router shape.

### Account, auth, and user settings
- Forgot password and reset password flow.
- Change password and delete account surfaces.
- Current-user account fetch/update flows.
- User data export flow and settings action wiring.

### Profile and social graph
- Profile banner/profile editing.
- Block/unblock behavior with mutual follow cleanup.
- Blocked users settings screen integration.
- Pinned posts create/list/fetch/unpin behavior.

### Feed, post, tags, and search
- Feed/post behavior migration.
- Tag feed route support.
- Global search endpoint and page support (`all|posts|users|tags`).
- Link preview support for composed posts.
- Poll creation and voting behavior.

### Comments, messages, and reactions
- Threaded comments/replies.
- Comment likes.
- Message reaction add/remove with UI quick controls.

### Communities
- Community list/detail/create flows.
- Community post creation.
- Community navigation and route integration.

### Projects
- Project list/detail/create flows.
- My Projects.
- Status helper behavior plus update/delete where relevant.

### Knowledge Bank
- Knowledge bank list/detail/create flows.
- Tagging and code example fields in forms.

### Feedback
- Feedback list/detail/create.
- Feedback comments and admin-style status updates.

### Reports and moderation
- Report creation from posts.
- Admin report review and moderation screens.
- Report resolution audit logging.

### Admin user and operations
- Admin users list/detail.
- Role update.
- Ban/unban.
- XP adjustment (`add`, `remove`, `set`) with audit and `XpLog` writes.
- Admin password reset endpoint.
- Admin user deletion with related data cleanup and guards against self-delete/admin-delete.

### Dashboard and analytics
- User dashboard metrics.
- Admin growth and dashboard stats endpoints.

### AI and assistant helpers
- AI settings page.
- Deterministic local AI endpoints:
  - `POST /posts/summarize`
  - `POST /posts/explain`
  - `POST /ai/enhance-text`
- AI usage counters and `AiLog` writes for helper actions.

### Appearance settings persistence
- API endpoints added:
  - `GET /users/appearance-settings`
  - `PUT /users/appearance-settings`
- V2 appearance settings UI now persists:
  - `theme`, `fontSize`, `compactMode`, `highContrast`, `reducedMotion`,
    `colorTheme`, `sidebarCollapsed`, `showAvatars`
- Immediate local state application kept, with API-backed persistence and `localStorage` fallback.

### Push notifications
- Push subscription endpoints:
  - `GET /notifications/push-subscription`
  - `POST /notifications/push-subscription`
  - `DELETE /notifications/push-subscription`
- Browser service worker (`frontend/public/sw.js`) added.
- Notification settings now include push enable/disable logic.
- Uses `VITE_VAPID_PUBLIC_KEY`.

### Ready Player Me
- Ready Player Me avatar save endpoint (`POST /users/avatar/ready-player-me`).
- URL validation, `.glb` / `.png` handling, and normalized preview persistence.

### Gameplay and discovery
- Weekly challenges.
- Referrals.
- Missions.
- Career paths.
- `admin/ai-logs` support with filters and pagination.

### Additional completed work already in scope
- Reported in `MIGRATION_PROGRESS.md`:
  - Push notification flow, dashboard/AI/admin routes, and ancillary surfaces.

## Current verification status
- Backend build: `corepack pnpm build` (`DevSocialV2/backend`)
- Frontend build: `corepack pnpm build` (`DevSocialV2/frontend`)
- Frontend lint: `corepack pnpm lint` (`DevSocialV2/frontend`)
- Known Vite warning about large chunk size remains and is non-blocking.
- Backend build now also passes after restoring the missing `Put` import used by `/users/appearance-settings`.

## Next action
- Continue remaining parity audit against `C:\\Users\\user\\Desktop\\Main\\devsocial` only for non-financial functional gaps.
- Keep financial integrations paused unless explicitly re-enabled.
