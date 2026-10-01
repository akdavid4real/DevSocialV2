# DevSocial Spring Backend

Incremental Spring Boot replacement for the NestJS backend. The existing web frontend
uses Spring APIs; mobile clients, the PostgreSQL schema, and the Supabase project remain unchanged.

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

For local development, put the database and Supabase credentials in `backend-spring/.env`.
Spring automatically loads that file when started from `backend-spring`:

```bash
./mvnw spring-boot:run
```

The `.env` file is ignored by Git. Exported environment variables override its values.

HTTP requests are logged at INFO level with method, path, response status, and duration:

```text
HTTP GET /api/v2/posts -> 200 (42 ms)
```

Request bodies, query strings, authorization headers, and cookies are not logged.
Frontend-only navigation and Supabase realtime updates do not reach Spring and therefore
do not produce these request logs. Restart the backend after changing its Java code.

Run the container with the Spring environment file from the repository root:

```bash
docker run --rm --env-file backend-spring/.env -p 3001:3001 devsocial-backend-spring:local
```

## Route ownership

The following routes are implemented and verified in Spring:

| Route | Authentication | Notes |
| --- | --- | --- |
| `GET /api/v2` | Public | Existing health/root response contract |
| `POST /api/v2/auth/register` | Public | Supabase signup, local profile/UserStats transaction, referral rewards |
| `POST /api/v2/auth/login` | Public | Web HttpOnly cookie and mobile JSON token behavior |
| `POST /api/v2/auth/refresh` | Public | Rotates the web cookie or returns the mobile refresh token |
| `POST /api/v2/auth/verify` | Public | Verifies the existing six-character signup OTP |
| `POST /api/v2/auth/forgot-password` | Public | Preserves account-enumeration-safe response behavior |
| `GET /api/v2/auth/me` | Bearer | Verifies Supabase, `auth.sessions`, block state, and local profile |
| `POST /api/v2/auth/change-password` | Bearer | Rechecks the current password before the admin update |
| `DELETE /api/v2/auth/delete-account` | Bearer | Deletes Supabase auth and then the local profile |
| `POST /api/v2/auth/logout` | Bearer | Revokes the current Supabase session and clears the cookie |
| `GET /api/v2/auth/sessions` | Bearer | Returns the current-session-only compatibility representation |
| `DELETE /api/v2/auth/sessions/{id}` | Bearer | Restricts individual revocation to the current session |
| `POST /api/v2/auth/logout-all` | Bearer | Revokes every Supabase session and clears the cookie |
| `GET /api/v2/users/profile` | Bearer | Returns the existing full current-user profile shape |
| `PATCH /api/v2/users/profile` | Bearer | Whitelisted profile fields with existing validation limits |
| `GET, PUT /api/v2/users/onboarding` | Bearer | Existing stepwise updates and interest-based completion |
| `POST /api/v2/users/avatar/ready-player-me` | Bearer | Validates and normalizes Ready Player Me URLs |
| `GET, PUT /api/v2/users/appearance-settings` | Bearer | Existing defaults merged with JSONB settings |
| `GET, PATCH /api/v2/users/privacy` | Bearer | Existing nested privacy-settings envelope |
| `GET, PATCH /api/v2/users/notification-settings` | Bearer | Existing nested notification-settings envelope |
| `GET /api/v2/users/search` | Public | Case-insensitive username, display-name, and bio search |
| `GET /api/v2/users/leaderboard` | Public | Period filtering and clamped result limits |
| `GET /api/v2/users/{username}` | Optional bearer | Public profile with private-profile and bidirectional-block enforcement |
| `GET /api/v2/profile-access/{username}` | Optional bearer | Non-sensitive profile summary and follow-request state |
| `POST, DELETE /api/v2/follow/{userId}` | Bearer | Public follows or private follow requests with atomic counters |
| `GET /api/v2/follow/{userId}/is-following` | Bearer | Follow and pending-request state |
| `GET /api/v2/follow/{userId}/followers` | Bearer | Paginated follower list |
| `GET /api/v2/follow/{userId}/following` | Bearer | Paginated following list |
| `GET /api/v2/follow/{userId}/mutual-followers` | Bearer | Up to ten mutual connections |
| `GET /api/v2/follow/requests/incoming` | Bearer | Paginated pending requests received by the current user |
| `GET /api/v2/follow/requests/outgoing` | Bearer | Paginated pending requests sent by the current user |
| `POST /api/v2/follow/requests/{id}/accept` | Bearer | Atomically accepts a request and creates the follow relationship |
| `POST /api/v2/follow/requests/{id}/reject` | Bearer | Rejects a pending incoming request |
| `DELETE /api/v2/follow/requests/{id}` | Bearer | Cancels a pending outgoing request |
| `GET /api/v2/users/blocked` | Bearer | Existing nested blocked-user response shape |
| `POST /api/v2/users/block/{userId}` | Bearer | Removes both follow directions and repairs counters atomically |
| `DELETE /api/v2/users/unblock/{userId}` | Bearer | Removes the current user's block |
| `POST /api/v2/upload` | Bearer | Magic-byte validation, Supabase Storage upload, and durable asset ownership |
| `POST /api/v2/storage/upload` | Bearer | Compatibility alias used by the existing comment uploader |
| `GET /api/v2/posts` | Optional bearer | Paginated feed or search array with privacy, block, and community visibility |
| `GET /api/v2/posts/tag/{tagName}` | Optional bearer | Paginated tag feed with existing tag metadata shape |
| `GET /api/v2/posts/{postId}` | Optional bearer | Visibility enforcement, viewer-like state, and unique view tracking |
| `GET /api/v2/posts/{postId}/comments` | Optional bearer | Paginated top-level comments with viewer-like state |
| `GET /api/v2/posts/comments/{commentId}/replies` | Optional bearer | Paginated replies after parent-post visibility checks |
| `GET /api/v2/users/{username}/posts` | Optional bearer | Existing username privacy/block rules and user post list |
| `POST /api/v2/posts` | Bearer | Transactional post, tag, mention, XP/activity, community, and asset creation |
| `DELETE /api/v2/posts/{postId}` | Bearer | Author-only deletion and asset detachment |
| `POST /api/v2/posts/{postId}/like` | Bearer | Visibility-aware like toggle, activity, and post-commit notification |
| `POST /api/v2/posts/{postId}/comments` | Bearer | Thread validation, rate limiting, XP, mentions, assets, and notifications |
| `DELETE /api/v2/posts/comments/{commentId}` | Bearer | Author-only comment deletion and asset detachment |
| `POST /api/v2/posts/comments/{commentId}/like` | Bearer | Atomic like counter and recipient XP changes |
| `POST /api/v2/posts/{postId}/poll/vote` | Bearer | Serializable poll validation, vote update, and XP award |
| `GET /api/v2/search` | Optional bearer | Posts, users, and tags with the existing nested response and privacy-aware filtering |
| `GET /api/v2/career-paths`, `GET /api/v2/career-paths/{id}` | Public | Backend-owned learning catalog and lessons; no fabricated completion/progress metrics |
| `GET /api/v2/trending` | Optional bearer | Time-window post ranking, hashtag topics, rising users, and dashboard statistics |
| `GET /api/v2/notifications`, `GET /api/v2/notifications/{id}` | Bearer | Existing nested list envelope, unread filtering/count, and sender projection |
| `PUT /api/v2/notifications/mark-read`, `PUT /api/v2/notifications/mark-unread` | Bearer | Recipient-scoped bulk updates capped at 100 notification IDs |
| `GET, POST, DELETE /api/v2/notifications/push-subscription` | Bearer | Backward-compatible web-push state in the existing User JSONB field |
| `POST, DELETE /api/v2/notifications/mobile-push-token` | Bearer | Validated Expo token registration with deduplication and five-device cap |
| `GET, POST /api/v2/messages/conversations` | Bearer | Direct-conversation lookup/creation with block and messaging-privacy enforcement |
| `POST /api/v2/messages`, `GET /api/v2/messages/{conversationId}` | Bearer | Transactional send and chronological cursor history using the existing realtime tables |
| `GET /api/v2/messages/unread-count`, `PATCH /api/v2/messages/{conversationId}/read` | Bearer | Recipient-scoped unread count and read updates |
| `POST, DELETE /api/v2/messages/{conversationId}/{messageId}/reactions` | Bearer | Participant-only serialized JSONB reaction updates |
| `GET /api/v2/users/{username}/activities` | Optional bearer | Privacy-aware paginated activity history with the existing nested envelope |
| `GET /api/v2/users/{username}/liked-posts`, `GET /api/v2/users/{username}/commented-posts` | Optional bearer | Active hydrated post lists with viewer-like state |
| `GET /api/v2/users/{username}/stats`, `GET /api/v2/users/{username}/activity-heatmap` | Optional bearer | Profile counters and the existing 84-day activity series |
| `GET /api/v2/users/{username}/pinned-posts` | Optional bearer | Up to three active posts in the user's saved order |
| `POST /api/v2/users/{username}/pin-post`, `DELETE /api/v2/users/{username}/unpin-post/{postId}` | Bearer | Owner-only, serialized pin mutations with the three-post cap |
| `GET /api/v2/affiliations` | Public | Existing alphabetized affiliation lists grouped by subtype for web onboarding |
| `GET /api/v2/auth/security-stats` | Bearer | Account age plus recorded login and security-event telemetry |
| `POST /api/v2/users/export-data` | Bearer | Read-only account/content/activity JSON export without Supabase credentials |
| `GET /api/v2/communities`, `GET /api/v2/communities/{idOrSlug}` | Optional bearer | Web community catalog/detail, membership state, and private-member redaction |
| `POST /api/v2/communities`, `POST /api/v2/communities/{idOrSlug}/join` | Bearer | Community creation plus public membership or private join-request workflow |
| `GET /api/v2/communities/{idOrSlug}/posts`, `POST /api/v2/communities/{idOrSlug}/posts` | Optional bearer / Bearer | Private-community access checks and member-only community publishing |
| `/api/v2/communities/invitations/**`, `/api/v2/communities/**/join-requests/**`, `/api/v2/communities/**/invites/**` | Bearer | Web invitation inbox and creator/moderator membership review workflow |
| `GET /api/v2/projects`, `GET /api/v2/projects/{id}` | Optional bearer | Public web project discovery/detail and once-per-visitor daily view tracking |
| `GET /api/v2/projects/me`, `POST /api/v2/projects` | Bearer | Owner project dashboard statistics and validated project creation |
| `PUT /api/v2/projects/{id}/status`, `DELETE /api/v2/projects/{id}` | Bearer | Owner-only project lifecycle mutations |
| `GET /api/v2/knowledge-bank`, `GET /api/v2/knowledge-bank/{id}` | Public | Filtered web knowledge catalog and author-enriched entry details |
| `POST /api/v2/knowledge-bank` | Bearer | Validated knowledge publishing using the existing PostgreSQL schema |
| `POST /api/v2/referrals/validate` | Public | Existing referral-code validation and safe referrer projection |
| `GET /api/v2/referrals/code`, `GET /api/v2/referrals/stats` | Bearer | Serialized code creation plus reward/status summaries and recent referrals |
| `POST /api/v2/referrals/expire-old` | Bearer | Expires overdue pending referrals using the existing lifecycle enum |
| `GET, POST /api/v2/feedback`, `GET /api/v2/feedback/{id}` | Bearer | Owner-scoped feedback with staff-wide filtering and enriched user projections |
| `POST /api/v2/feedback/{id}/comments` | Bearer | Role-aware comments with atomic denormalized count updates |
| `PATCH /api/v2/feedback/{id}/status` | Bearer + staff role | Moderator/admin status workflow with solver attribution |
| `POST /api/v2/reports` | Bearer | Duplicate-safe post reporting with archived/self-report safeguards |
| `GET /api/v2/users/ai-usage` | Bearer | Existing nested per-feature usage envelope with free/premium limits and reset metadata |
| `GET /api/v2/users/dashboard` | Bearer | Period/lifetime post analytics, engagement, XP, ranking, challenge, notification, and activity charts |
| `POST /api/v2/link-preview` | Public | Five-second HTML metadata fetch for the web post composer with relative-image resolution |
| `GET, POST /api/v2/challenges/**` | Optional bearer / Bearer | Active and joined web challenges, staff creation, serialized progress rewards, and public leaderboards |
| `POST /api/v2/posts/summarize`, `POST /api/v2/posts/explain`, `POST /api/v2/ai/enhance-text` | Bearer | Deterministic web writing assistance with serialized monthly limits and AI audit logs |
| `GET /api/v2/admin/dashboard/stats`, `GET /api/v2/admin/dashboard/user-growth` | Bearer + staff/analytics role | Web administration counters and registration growth data using existing tables |
| `GET /api/v2/admin/ai-logs` | Bearer + admin/analytics role | Filtered AI audit records, user projections, grouped timing statistics, and pagination |
| `GET /api/v2/admin/reports`, `GET /api/v2/admin/reports/{id}` | Bearer + staff role | Filtered moderation inbox with reporter, target-user, and reported-post projections |
| `PUT /api/v2/admin/reports/{id}/resolve` | Bearer + staff role | Transactional report resolution, moderation side effects, and audit metadata |
| `GET /api/v2/admin/posts`, `PUT /api/v2/admin/posts/{id}/status`, `DELETE /api/v2/admin/posts/{id}` | Bearer + staff role | Filtered post moderation, transactional status/delete actions, and audit records |
| `GET /api/v2/admin/audit-logs` | Bearer + admin role | Paginated administrative audit history |
| `GET /api/v2/admin/users`, `GET /api/v2/admin/users/{id}` | Bearer + staff role | Searchable user directory and enriched moderation details |
| `PUT /api/v2/admin/users/{id}/role` | Bearer + admin role | Transactional role changes with an audit record |
| `POST /api/v2/admin/users/{id}/ban`, `POST /api/v2/admin/users/{id}/unban` | Bearer + staff role | Admin-safe account blocking with moderation audit records |
| `POST /api/v2/admin/users/{id}/reset-password` | Bearer + admin role | Supabase admin password reset without credential logging |

All other routes remain owned by NestJS. A gateway must only send the route groups listed
above to Spring; Spring denies unmigrated routes by default.

The core `posts`, web `communities`, web `projects`, and web `knowledge-bank` controller groups
are Spring-owned.

## Deliberate NestJS ownership

- Every `/api/v2/missions/**` route remains on NestJS; Spring has no mission module or route access.
- `DELETE /api/v2/admin/users/{id}` remains on NestJS because its existing cleanup contract includes
  `MissionProgress`, which has no user foreign key or database cascade.
- `PUT /api/v2/admin/users/{id}/xp` remains on NestJS because it is not called by the web client.
- `/api/v2/admin/bots` is not implemented by the existing NestJS controller despite the current web page call;
  the migration does not invent a replacement contract.
- `POST /api/v2/auth/dev/verify` remains a NestJS development-only route.

Authentication continues to use the existing `DATABASE_URL`, `SUPABASE_URL`, and
`SUPABASE_SERVICE_ROLE_KEY`. The Spring implementation does not create or migrate tables.

## Migration order

1. Compatibility and deployment foundation
2. Supabase authentication and current-user lookup
3. Users and onboarding
4. Follows, blocks, and privacy
5. Storage
6. Posts, comments, and likes
7. Search and trending
8. Web communities
9. Web projects
10. Web knowledge bank
11. Web referrals
12. Web feedback
13. Web report submission
14. Web AI usage summary
15. Web dashboard analytics
16. Web link previews
17. Web challenges
18. Web AI writing assistance
19. Web admin analytics
20. Web admin report moderation
21. Web admin content moderation and audit logs
22. Web admin user directory and details
23. Web admin role and ban moderation
24. Web admin password reset

NestJS remains responsible for every route group until that entire group passes contract tests.
