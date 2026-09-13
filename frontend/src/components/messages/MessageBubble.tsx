"use client"

import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/messages'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  currentUserId: string
  onReact?: (messageId: string, emoji: string) => void
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥"] as const

export default function MessageBubble({ message, isOwn, currentUserId, onReact }: MessageBubbleProps) {
  const user = isOwn ? message.sender : message.receiver
  const timestamp = message.createdAt ? new Date(message.createdAt) : new Date()
  const currentUserReaction = message.reactions?.find((reaction) => reaction.userId === currentUserId)
  const reactionCounts = (message.reactions || []).reduce<Record<string, number>>((counts, reaction) => {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1
    return counts
  }, {})

  return (
    <div className={cn(
      "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 ring-2 ring-border shrink-0">
        <AvatarImage src={user?.avatar} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {user?.username?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1 max-w-[70%]",
        isOwn ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-2xl px-4 py-2.5 break-words",
          isOwn
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          <p className="text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className={cn("flex flex-wrap gap-1", isOwn ? "justify-end" : "justify-start")}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message.id, emoji)}
                className={cn(
                  "rounded-full border border-border bg-background px-2 py-0.5 text-xs shadow-sm transition-colors hover:bg-muted",
                  currentUserReaction?.emoji === emoji && "border-primary bg-primary/10"
                )}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        <div className={cn("flex gap-1 opacity-70 transition-opacity hover:opacity-100", isOwn ? "justify-end" : "justify-start")}>
          {QUICK_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant={currentUserReaction?.emoji === emoji ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-full px-2 text-sm"
              onClick={() => onReact?.(message.id, emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground/60 px-1">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  )
}
