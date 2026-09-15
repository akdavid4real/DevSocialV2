# DevSocial V2 Migration Progress

Last updated: 2026-05-29

## Scope

DevSocial V2 is the target app. The old `devsocial` app is being used as a behavior reference only, not as architecture to copy directly. The V2 frontend has been moved to React + Vite, with the Nest backend remaining as the API layer.

Financial integration work is intentionally paused because it is no longer needed for now.

## Verified Baseline

These checks have been used after completed slices:

- Backend build: `corepack pnpm build` from `DevSocialV2/backend`
- Frontend build: `corepack pnpm build` from `DevSocialV2/frontend`
- Frontend lint: `corepack pnpm lint` from `DevSocialV2/frontend`

The frontend build still reports the existing Vite large chunk warning. That warning has not blocked any verified build.

## Completed Work

### Frontend Migration To React Vite

- Converted the V2 frontend away from Next runtime assumptions into a Vite React app.
- Added Vite entry structure through `index.html`, `src/main.tsx`, and `src/App.tsx`.
- Mapped migrated routes manually in the Vite app shell.
- Updated package scripts to use Vite build/dev/start commands.
- Kept authenticated, settings, public profile, and admin route layouts working under the Vite router shape.

### Auth And Account Flows

- Added forgot password and reset password flow.
- Added change password and delete account surfaces.
- Added current-user account settings fetch/update wiring.
- Added user data export endpoint and settings UI action.

### Profiles And Social Graph

- Added profile banner/profile editing surfaces.
- Added block/unblock workflow:
  - `POST /users/block/:userId`
  - `DELETE /users/unblock/:userId`
  - Removes follow connections both ways when a user is blocked.
  - Prevents self-blocking.
- Added blocked users settings page integration.
- Added pinned posts support:
  - Pin own posts.
  - Unpin own posts.
  - Fetch pinned posts.

### Feed, Posts, Tags, And Search

- Migrated feed/post behavior into V2 surfaces.
- Added tag feeds and `/tag/:tagName`.
- Added unified search:
  - `GET /search?q=...&type=all|posts|users|tags&page&limit`
  - Returns posts, users, and tags buckets.
  - Frontend search page now uses this endpoint and renders tag results.
- Added link preview endpoint/UI for composed posts.
- Added poll creation and voting.

### Comments And Reactions

- Added threaded comment/reply behavior where needed.
- Added comment like support.
- Added message reactions:
  - `POST /messages/:conversationId/:messageId/reactions`
  - `DELETE /messages/:conversationId/:messageId/reactions`
  - Reactions are stored in the message JSON reactions field.
  - Frontend chat bubbles now show quick reaction controls and counts.

### Communities

- Added community list/detail/create flows.
- Added community post creation support.
- Wired relevant navigation/routes in the Vite app.

### Projects

- Added projects list/detail/create flows.
- Added My Projects.
- Added project status helpers and deletion/update behavior where relevant.

### Knowledge Bank

- Added knowledge bank list/detail/create flows.
- Added tags and code-example support in the knowledge entry forms.

### Feedback

- Added feedback list/detail/create flows.
- Added feedback comments.
- Added status update support for admin/moderation style workflows.

### Reports And Moderation

- Added report creation from posts.
- Added admin/moderator report review flows.
- Added content moderation admin routes and UI for posts.
- Added report resolution audit logging.

### Admin User Management

- Added admin user listing/detail support.
- Added role update.
- Added ban/unban.
- Added XP adjustment:
  - Add, remove, or set user XP.
  - Recalculates level.
  - Writes `XpLog` and `AuditLog`.
- Added admin reset password:
  - `POST /admin/users/:userId/reset-password`
  - Updates Supabase Auth password.
- Added admin delete user:
  - `DELETE /admin/users/:userId`
  - Deletes related local platform data and Supabase auth user.
  - Prevents self-delete.
  - Prevents deleting admin users from the admin users screen.
- Updated the admin users page with reset-password and delete-user dialogs.

### Dashboard And Analytics

- Added user dashboard summary metrics:
  - Average likes.
  - Average comments.
  - Lifetime average engagement.
  - Top post.
- Updated frontend dashboard summary cards.
- Added admin dashboard stats and user growth endpoints already used by the admin panel.

### AI Usage And Post Helpers

- Added AI usage settings page wiring.
- Added deterministic local AI helper endpoints:
  - `POST /posts/summarize`
  - `POST /posts/explain`
  - `POST /ai/enhance-text`
- Added usage tracking in `User.aiUsage` for:
  - Summaries.
  - Explanations.
  - Text enhancements.
- Added `AiLog` writes for AI helper actions.
- Added post-card buttons for summarize/explain.
- Added composer buttons for professional, casual, and hashtag text enhancement.

Note: these helpers are currently local deterministic assist logic, not external model calls. This avoids adding API key dependencies while preserving the product workflow and API surface.

### Appearance Settings Persistence

- Added persisted user appearance settings on backend:
  - `GET /users/appearance-settings`
  - `PUT /users/appearance-settings`
- Wired the V2 Appearance settings page to load and save:
  - `theme`
  - `fontSize`
  - `compactMode`
  - `highContrast`
  - `reducedMotion`
  - `colorTheme`
  - `sidebarCollapsed`
  - `showAvatars`
- Kept immediate local application for responsive UI behavior and added API-backed persistence with fallback to localStorage.

### Push Notifications

- Added browser push subscription API:
  - `GET /notifications/push-subscription`
  - `POST /notifications/push-subscription`
  - `DELETE /notifications/push-subscription`
- Stores subscription data in `User.pushSubscription`.
- Added Vite public service worker at `frontend/public/sw.js`.
- Added frontend push notification hook.
- Wired push enable/disable into notification settings.
- Uses `VITE_VAPID_PUBLIC_KEY` for browser push setup.

### Ready Player Me Avatar

- Added Ready Player Me avatar save endpoint:
  - `POST /users/avatar/ready-player-me`
- Validates `models.readyplayer.me` URLs.
- Accepts `.glb` or `.png` URLs and normalizes saved avatar to PNG-style preview URL.
- Added profile settings modal/action for saving a Ready Player Me avatar.

### Challenges, Referrals, Missions, Career Paths

- Added weekly challenges.
- Added referrals.
- Added missions.
- Added static career paths.
- Added frontend pages and route registration for these surfaces.

### Admin AI Logs

- Added `GetAiLogsQueryDto`.
- Added `GET /admin/ai-logs`.
- Added `AdminService.getAiLogs()` using Prisma `AiLog`.
- Added V2 admin AI logs page at `/admin/ai-logs`.
- Added admin nav and Vite route registration.
- Supports:
  - Pagination.
  - Service filter.
  - Task type filter.
  - Grouped stats by service and task type.
  - User lookup for log rows with `userId`.
- Verified after completion with backend build, frontend build, and frontend lint.

## Known Constraints And Notes

- The repository root at `C:\Users\user\Desktop\Main` is not a git repository, so changes have been tracked by files and build checks rather than commits.
- Prisma generated files exist under `backend/src/generated/prisma`.
- Some older text in the app has encoding artifacts from prior code; this has not been globally cleaned.
- Identity connection fields and basic connect/disconnect were added earlier, but further financial/transaction work is paused and should not continue unless explicitly requested.
- The Vite frontend build warning about large chunks is still present.

## Recommended Next Steps

1. Audit remaining old `devsocial` API folders against V2 to identify any important non-financial product gaps.
2. Clean up obvious long-file pressure in the largest frontend/admin components if future feature work keeps expanding them.
3. Consider frontend chunk splitting because Vite still warns that the main bundle is larger than 500 kB.
