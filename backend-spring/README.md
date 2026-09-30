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
| `GET /api/v2/trending` | Optional bearer | Time-window post ranking, hashtag topics, rising users, and dashboard statistics |
| `GET /api/v2/notifications`, `GET /api/v2/notifications/{id}` | Bearer | Existing nested list envelope, unread filtering/count, and sender projection |
| `PUT /api/v2/notifications/mark-read`, `PUT /api/v2/notifications/mark-unread` | Bearer | Recipient-scoped bulk updates capped at 100 notification IDs |
| `GET, POST, DELETE /api/v2/notifications/push-subscription` | Bearer | Backward-compatible web-push state in the existing User JSONB field |
| `POST, DELETE /api/v2/notifications/mobile-push-token` | Bearer | Validated Expo token registration with deduplication and five-device cap |
| `GET, POST /api/v2/messages/conversations` | Bearer | Direct-conversation lookup/creation with block and messaging-privacy enforcement |
| `POST /api/v2/messages`, `GET /api/v2/messages/{conversationId}` | Bearer | Transactional send and chronological cursor history using the existing realtime tables |
| `GET /api/v2/messages/unread-count`, `PATCH /api/v2/messages/{conversationId}/read` | Bearer | Recipient-scoped unread count and read updates |
| `POST, DELETE /api/v2/messages/{conversationId}/{messageId}/reactions` | Bearer | Participant-only serialized JSONB reaction updates |

All other routes remain owned by NestJS. A gateway must only send the route groups listed
above to Spring; Spring denies unmigrated routes by default.

The core `posts` controller group is Spring-owned. AI post analysis and community-specific
post routes remain separately owned by their NestJS route groups until documented here.

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

NestJS remains responsible for every route group until that entire group passes contract tests.
