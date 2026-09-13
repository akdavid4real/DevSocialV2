# Performance Issues & Fixes

## Issues Identified (2026-03-20)

### 1. 🔴 CRITICAL: Database Connection Timeouts
**Symptoms:**
- `Connection terminated due to connection timeout` every 20-40 seconds
- Random 500 errors on API calls
- Requests taking 10-20 seconds

**Root Causes:**
- Supabase pooler has limited connections
- Connection pool (max: 20) exhausting available pooler slots
- Long-running queries holding connections
- No statement timeout configured

**Fixes Applied:**
- ✅ Reduced `max` pool size from 20 → 10
- ✅ Reduced `idleTimeoutMillis` from 30s → 10s (release faster)
- ✅ Increased `connectionTimeoutMillis` from 20s → 30s
- ✅ Added `statement_timeout: 10000` (10s query limit)
- ✅ Set `allowExitOnIdle: true`
- ✅ Removed noisy debug logging

**Additional Recommendations:**
- Upgrade to Supabase Prod tier (more pooler connections)
- Add database indexes if queries are slow
- Implement query result caching

---

### 2. ⚠️ Connection Pool Monitoring
**Issue:** No visibility into pool health

**Fix:** Added pool metrics logging on `acquire` event:
```
Pool: X total, Y idle, Z waiting
```

---

### 3. ⚠️ Duplicate API Requests
**Symptom:** Same endpoint called multiple times concurrently

**Example:**
```
GET /api/v2/users/akdavid called 4x in 2 seconds
```

**Frontend Cause:** React strict mode + no request deduplication

**Recommendations:**
- Implement SWR or React Query for automatic deduplication
- Add request caching layer

---

### 4. ℹ️ JWT Token Expiry
**Current Config:** 7 days (`JWT_EXPIRES_IN=7d`)
- Token issued: 2026-03-20 22:23:13
- Token expires: 2026-03-27 22:23:13

**Recommendation:** Keep 7 days unless security requires shorter sessions

---

### 5. ⚠️ Auth Failures on DB Timeout
**Issue:** When DB times out, JWT validation fails → 401 → logout

**Flow:**
1. Request arrives with valid token
2. `JwtStrategy` queries DB to validate user
3. DB connection times out
4. Auth fails → 401 Unauthorized
5. Frontend redirects to login

**Fix:** Already addressed by fixing connection pool

---

## Performance Timeline from Logs

| Time | Event | Duration | Status |
|------|-------|----------|--------|
| 22:23:13 | Login successful | - | ✅ |
| 22:23:13 | Fetch posts (1st) | Started | - |
| 22:23:16 | Fetch posts completed | 3s | ✅ |
| 22:23:25-33 | 4 new pool connections | 8s | ⚠️ |
| 22:23:36 | First timeout error | 23s from login | ❌ |
| 22:23:47 | Fetch posts (2nd) | Started | - |
| 22:23:58 | Fetch posts completed | 11s | ⚠️ |
| 22:24:04 | New pool connection | - | - |
| 22:24:07 | Second timeout | - | ❌ |
| 22:28:29-49 | Profile requests timeout | 20s | ❌ |
| 22:29:27 | Auth failure (DB timeout) | - | ❌ |

**Pattern:** Timeouts occur when pool is saturated (6-8 concurrent connections)

---

## Next Steps

### Immediate (Done)
- ✅ Fix connection pool configuration
- ✅ Add pool monitoring

### Short-term (Recommended)
- [ ] Add query performance monitoring
- [ ] Implement request deduplication on frontend
- [ ] Add Redis caching for frequently accessed data
- [ ] Review slow queries with `EXPLAIN ANALYZE`

### Long-term
- [ ] Migrate to Supabase Pro (more pooler capacity)
- [ ] Add read replicas for scaling
- [ ] Implement GraphQL/DataLoader to batch queries
- [ ] Add APM monitoring (e.g., Sentry, DataDog)

---

## Testing

**After restart, monitor for:**
1. ✅ No more connection timeouts
2. ✅ Faster response times (<3s for posts)
3. ✅ Pool metrics showing healthy idle connections
4. ✅ No unexpected 401 errors

**Command to watch logs:**
```bash
pnpm start:dev | grep -E "(timeout|Pool:|500|401)"
```
