# Comment Notification System

## Overview
Complete notification system for comments, replies, mentions, and likes.

## Notification Types

### 1. Comment on Post 💬
**Trigger**: Someone comments on your post
**Recipient**: Post author
**Title**: "💬 New Comment"
**Message**: "{username}: {comment preview (50 chars)}"
**Action**: Navigate to post

### 2. Reply to Comment 💬
**Trigger**: Someone replies to your comment
**Recipient**: Parent comment author
**Title**: "💬 New Reply"
**Message**: "{username} replied: {reply preview (50 chars)}"
**Action**: Navigate to post

### 3. Mention in Comment 📢
**Trigger**: Someone mentions you in a comment (@username)
**Recipient**: Mentioned user
**Title**: "📢 You were mentioned"
**Message**: "{username} mentioned you in a comment"
**Action**: Navigate to post

### 4. Comment Liked ❤️
**Trigger**: Someone likes your comment
**Recipient**: Comment author
**Title**: "❤️ Comment Liked"
**Message**: "{username} liked your comment"
**Action**: Navigate to post

## Smart Features

### Anti-Spam
- ✅ No self-notifications (can't notify yourself)
- ✅ Duplicate prevention (same user, same action)
- ✅ Batch processing for mentions

### Notification Filtering
```typescript
// Don't notify if:
- recipientId === senderId (self-action)
- Commenting on own post
- Replying to own comment
- Liking own comment
```

## Database Schema

```prisma
model Notification {
  id          String   @id @default(uuid())
  recipientId String   // Who receives the notification
  senderId    String   // Who triggered it
  type        NotificationType // COMMENT, MENTION, LIKE
  title       String
  message     String
  relatedId   String?  // Comment/Post ID
  relatedType String?  // "comment" or "post"
  actionUrl   String?  // Where to navigate
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

## Implementation Flow

### Comment Creation Flow
```
1. User creates comment
2. Award XP (5 for top-level, 3 for reply)
3. Extract mentions from content
4. Create notifications:
   a. Notify mentioned users
   b. Notify post author (if top-level comment)
   c. Notify parent comment author (if reply)
5. Return comment with XP info
```

### Comment Like Flow
```
1. User likes comment
2. Award 1 XP to comment author
3. Create notification for comment author
4. Return like status with XP info
```

## API Responses

### Comment Creation
```json
{
  "id": "comment-uuid",
  "content": "Great post!",
  "author": { ... },
  "xpAwarded": 5,
  "createdAt": "2024-03-18T..."
}
```

### Comment Like
```json
{
  "liked": true,
  "likesCount": 5,
  "xpChange": 1,
  "isOwnComment": false
}
```

## Notification Service Methods

### `notifyComment(recipientId, senderId, postId, senderUsername, commentPreview)`
Notifies post author about new comment

### `notifyReply(recipientId, senderId, commentId, postId, senderUsername, replyPreview)`
Notifies comment author about new reply

### `notifyCommentMention(recipientId, senderId, commentId, postId, senderUsername)`
Notifies user about mention in comment

### `notifyCommentLike(recipientId, senderId, commentId, postId, senderUsername)`
Notifies comment author about like

## Frontend Integration

### Toast Notifications
```typescript
// Comment created
toast.success(
  <div>
    <span>Signal added to thread</span>
    <span className="text-primary">+5 XP</span>
  </div>,
  { icon: '🎯' }
)

// Comment liked
toast.success(
  <div>
    <span>Comment liked</span>
    <span className="text-primary">+1 XP</span>
  </div>,
  { icon: '❤️' }
)
```

### Notification Bell
- Shows unread count
- Real-time updates
- Click to view notification center

## Testing Checklist

- [ ] Comment on someone's post → They get notification
- [ ] Reply to someone's comment → They get notification
- [ ] Mention @user in comment → They get notification
- [ ] Like someone's comment → They get notification
- [ ] Comment on own post → No notification
- [ ] Reply to own comment → No notification
- [ ] Like own comment → No notification
- [ ] Multiple mentions in one comment → All get notified
- [ ] Notification appears in notification center
- [ ] Clicking notification navigates to correct post

## Performance Considerations

### Optimizations
- Notifications created asynchronously (don't block comment creation)
- Batch mention processing
- No notifications for self-actions
- Efficient database queries (single query for mentions)

### Database Indexes
```sql
-- Ensure these indexes exist
CREATE INDEX idx_notifications_recipient ON Notification(recipientId, createdAt DESC);
CREATE INDEX idx_notifications_read ON Notification(recipientId, read);
```

## Future Enhancements

### Quick Wins (5-15 min)
1. **Notification grouping**: "John and 5 others liked your comment"
2. **Mute notifications**: Allow users to mute specific posts
3. **Notification preferences**: Let users choose which notifications to receive

### Medium Effort (30-60 min)
1. **Push notifications**: Browser push for real-time alerts
2. **Email notifications**: Send email for important notifications
3. **Notification sounds**: Audio feedback for new notifications

### Advanced Features (2+ hours)
1. **Real-time WebSocket**: Instant notification delivery
2. **Notification digest**: Daily/weekly email summary
3. **Smart notifications**: ML-based notification prioritization

## Monitoring

### Key Metrics
- Notification delivery rate
- Average time to read notification
- Notification click-through rate
- Unread notification count per user

### Database Queries

```sql
-- Unread notifications per user
SELECT recipientId, COUNT(*) as unread_count
FROM Notification
WHERE read = false
GROUP BY recipientId
ORDER BY unread_count DESC;

-- Most engaging notification types
SELECT type, COUNT(*) as total, 
       SUM(CASE WHEN read THEN 1 ELSE 0 END) as read_count
FROM Notification
GROUP BY type;
```

## Error Handling

### Graceful Degradation
```typescript
try {
  await notifications.notifyComment(...)
} catch (error) {
  logger.error('Failed to send notification:', error)
  // Don't fail the main operation (comment creation)
}
```

### Retry Logic
- Failed notifications logged but don't block
- Can be retried via background job
- User still gets in-app notification

## Related Files

- `backend/src/notifications/notifications.service.ts` - Core service
- `backend/src/posts/posts.service.ts` - Integration points
- `frontend/src/components/home/CommentInput.tsx` - XP toasts
- `COMMENT_XP_SYSTEM.md` - XP documentation
- `COMMENT_IMPROVEMENTS.md` - Overall improvements

## Success Metrics

After 1 week:
- ✅ 80%+ notification delivery rate
- ✅ 60%+ notification read rate
- ✅ 40%+ notification click-through rate
- ✅ <5% unread notification backlog per user
