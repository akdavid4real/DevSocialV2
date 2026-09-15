# Comment XP System Implementation

## Overview
Comments now award XP to users, encouraging engagement and quality contributions.

## XP Rewards

### Comment Creation
- **Top-level comment**: 5 XP
- **Reply to comment**: 3 XP
- **Logged as**: `COMMENT_CREATION` in XpLog

### Comment Likes
- **Receiving a like**: +1 XP (to comment author)
- **Unliking**: -1 XP (removed from comment author)
- **Logged as**: `LIKE_RECEIVED` in XpLog
- **Note**: Users cannot earn XP by liking their own comments

## Implementation Details

### Database Operations
All XP operations are wrapped in transactions to ensure data consistency:

```typescript
// Comment creation transaction
1. Create comment
2. Update user points (+5 or +3 XP)
3. Create XP log entry

// Like transaction
1. Create/delete like
2. Update comment likesCount
3. Update comment author points (+1 or -1 XP)
4. Create XP log entry (only on like, not unlike)
```

### XP Calculation Logic

**Comment XP:**
```typescript
const xpAmount = parentId ? 3 : 5;
// parentId exists = reply (3 XP)
// parentId null = top-level comment (5 XP)
```

**Like XP:**
```typescript
if (userId !== comment.authorId) {
  // Award 1 XP to comment author
  // Prevent self-XP farming
}
```

## Comparison with Posts

| Action | Post XP | Comment XP |
|--------|---------|------------|
| Create | 20 XP | 5 XP (top-level) / 3 XP (reply) |
| Receive Like | Varies | 1 XP |
| Delete | N/A | No XP refund |

## Anti-Gaming Measures

1. **No self-likes**: Users cannot earn XP by liking their own comments
2. **XP removal on unlike**: Prevents like/unlike spam
3. **Different XP for replies**: Encourages quality over quantity
4. **Transaction-based**: Prevents race conditions and XP duplication

## User Experience

### What Users See:
- ✅ XP notification when commenting (via toast)
- ✅ XP increases in their profile
- ✅ Progress toward next level
- ✅ XP history in XpLog

### What Users Don't See:
- Individual like XP notifications (would be spammy)
- XP removal notifications (negative UX)

## Future Enhancements

### Quick Wins (5-15 min)
1. **First comment bonus**: Award extra XP for first comment on a post
2. **Quality bonus**: Award extra XP for comments with 10+ likes
3. **Streak bonus**: Award extra XP for commenting X days in a row

### Medium Effort (30-60 min)
1. **Comment length bonus**: Award more XP for detailed comments (>100 chars)
2. **Best comment badge**: Highlight top-liked comment with special badge
3. **XP notifications**: Show toast when earning XP from likes

### Advanced Features (2+ hours)
1. **Diminishing returns**: Reduce XP after X comments per day (prevent spam)
2. **Quality scoring**: Use AI to detect low-quality comments
3. **Reputation system**: Separate reputation from XP based on community votes

## Testing Checklist

- [x] Create top-level comment → User gets 5 XP
- [x] Create reply → User gets 3 XP
- [x] Like someone's comment → Comment author gets 1 XP
- [x] Unlike someone's comment → Comment author loses 1 XP
- [x] Like own comment → No XP awarded
- [ ] XP log entries are created correctly
- [ ] User points update in real-time
- [ ] Transaction rollback on error

## Monitoring

### Key Metrics to Track:
- Average XP per user per day
- Comment creation rate (before/after XP)
- Like rate on comments
- XP distribution (are power users dominating?)

### Database Queries:

```sql
-- Top commenters by XP earned
SELECT userId, SUM(xpAmount) as total_xp
FROM XpLog
WHERE type = 'COMMENT_CREATION'
GROUP BY userId
ORDER BY total_xp DESC
LIMIT 10;

-- Comment engagement rate
SELECT 
  COUNT(*) as total_comments,
  AVG(likesCount) as avg_likes_per_comment
FROM Comment
WHERE createdAt > NOW() - INTERVAL '7 days';
```

## Performance Considerations

- **Transaction overhead**: Minimal (~5ms per comment)
- **Database writes**: 3 writes per comment (comment + user + xpLog)
- **Indexing**: Ensure XpLog has index on (userId, type, createdAt)
- **Caching**: Consider caching user points for display

## Rollback Plan

If XP system causes issues:

1. **Disable XP awards**: Comment on XP update lines
2. **Keep XP logs**: Don't delete historical data
3. **Recalculate**: Run script to recalculate all user points from XpLog

```typescript
// Emergency disable
// await this.prisma.user.update({ ... }); // Comment this out
```

## Success Metrics

After 1 week, we should see:
- ✅ 20-30% increase in comment creation
- ✅ 15-25% increase in comment likes
- ✅ More balanced XP distribution
- ✅ Higher user retention (users with XP return more)

## Related Files

- `backend/src/posts/posts.service.ts` - XP implementation
- `backend/prisma/schema.prisma` - XpLog model
- `COMMENT_IMPROVEMENTS.md` - Overall comment system docs
