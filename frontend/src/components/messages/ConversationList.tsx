"use client"

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/lib/messages'
import { API_BASE_URL } from '@/lib/env'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId?: string
  onSelect: (conversationId: string, otherUser: any) => void
  loading?: boolean
  currentUserId?: string
}

interface FollowingUser {
  id: string
  username: string
  displayName: string
  avatar: string
}

export default function ConversationList({ conversations, selectedId, onSelect, loading, currentUserId }: ConversationListProps) {
  const [following, setFollowing] = useState<FollowingUser[]>([])
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  // Fetch people you follow
  useEffect(() => {
    async function fetchFollowing() {
      if (!currentUserId) return

      setLoadingFollowing(true)
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/follow/${currentUserId}/following?limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const result = await response.json()
          const data = result.data || result
          const allFollowing = data.following || []

          // Filter out users we already have conversations with
          const conversationUserIds = new Set(
            conversations.map(c => c.otherUser?.id).filter(Boolean)
          )
          const filtered = allFollowing
            .filter((user: FollowingUser) => !conversationUserIds.has(user.id))
            .slice(0, 5)

          setFollowing(filtered)
        }
      } catch (error) {
        console.error('Failed to fetch following:', error)
      } finally {
        setLoadingFollowing(false)
      }
    }

    fetchFollowing()
  }, [currentUserId, conversations])

  const handleStartChat = (user: FollowingUser) => {
    const tempConvId = `temp_${user.id}`
    onSelect(tempConvId, user)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-2">
        {/* Existing conversations */}
        {conversations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-2 py-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent chats
              </h3>
            </div>
            <div className="space-y-1">
              {conversations.map((conversation) => {
          const otherUser = conversation.otherUser
          if (!otherUser) return null

          const isSelected = selectedId === conversation.id
          const timestamp = conversation.lastMessageAt
            ? new Date(conversation.lastMessageAt)
            : new Date()

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id, otherUser)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                isSelected
                  ? "bg-primary/10 ring-1 ring-primary/20"
                  : "hover:bg-muted/50"
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-12 w-12 ring-2 ring-border">
                  <AvatarImage src={otherUser.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {otherUser.displayName?.[0]?.toUpperCase() || otherUser.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {otherUser.online && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={cn(
                    "text-sm font-semibold truncate",
                    conversation.unreadCount > 0 ? "text-foreground" : "text-foreground/80"
                  )}>
                    {otherUser.displayName || otherUser.username}
                  </h3>
                  <span className="text-xs text-muted-foreground/60 shrink-0">
                    {formatDistanceToNow(timestamp, { addSuffix: false })}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-xs truncate",
                    conversation.unreadCount > 0
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}>
                    {conversation.lastMessage?.content || 'No messages yet'}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-xs font-bold bg-primary text-primary-foreground shrink-0">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          )
        })}
            </div>
          </div>
        )}

        {/* People you follow - Start new chat */}
        {following.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-2 py-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                People you follow
              </h3>
            </div>
            <div className="space-y-1">
              {following.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleStartChat(user)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left cursor-pointer"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-border">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {user.displayName || user.username}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no conversations */}
        {conversations.length === 0 && following.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3 max-w-xs">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">No messages yet</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Start following people to send them messages!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
