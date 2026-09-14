"use client"

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Loader2, MoreVertical, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { addMessageReaction, getMessages, removeMessageReaction, sendMessage, markAsRead, subscribeToMessages, type Message } from '@/lib/messages'
import { toast } from 'sonner'
import Link from '@/components/ui/link'

interface ChatWindowProps {
  conversationId: string
  otherUser: {
    id: string
    username: string
    displayName: string
    avatar: string
    online?: boolean
  }
  currentUserId: string
  onBack?: () => void
  onMessageSent?: () => void
}

const PAGE_SIZE = 50

export default function ChatWindow({ conversationId, otherUser, currentUserId, onBack, onMessageSent }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadMessages() {
      setLoading(true)
      const fetchedMessages = await getMessages(conversationId, { limit: PAGE_SIZE })
      setMessages(fetchedMessages)
      setHasOlder(fetchedMessages.length === PAGE_SIZE)
      setLoading(false)
      await markAsRead(conversationId)
    }

    void loadMessages()
  }, [conversationId])

  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((message) => message.id === newMessage.id)) return prev
        return [...prev, newMessage]
      })

      if (newMessage.senderId !== currentUserId) {
        void markAsRead(conversationId)
      }
    })

    return unsubscribe
  }, [conversationId, currentUserId])

  useEffect(() => {
    if (!loadingOlder && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, loadingOlder])

  const handleLoadOlder = async () => {
    const oldest = messages[0]
    if (!oldest || loadingOlder) return

    const container = scrollRef.current
    const previousHeight = container?.scrollHeight || 0
    setLoadingOlder(true)

    try {
      const older = await getMessages(conversationId, {
        before: oldest.id,
        limit: PAGE_SIZE,
      })

      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id))
        return [...older.filter((message) => !existingIds.has(message.id)), ...current]
      })
      setHasOlder(older.length === PAGE_SIZE)

      requestAnimationFrame(() => {
        if (!container) return
        container.scrollTop = container.scrollHeight - previousHeight
      })
    } catch {
      toast.error('Failed to load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }

  const handleSend = async (content: string) => {
    const sent = await sendMessage(otherUser.id, content)
    if (sent) {
      setMessages((prev) => {
        if (prev.some((message) => message.id === sent.id)) return prev
        return [...prev, sent]
      })
      onMessageSent?.()
    } else {
      toast.error('Failed to send message')
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    const message = messages.find((item) => item.id === messageId)
    const existingReaction = message?.reactions?.find((reaction) => reaction.userId === currentUserId)

    try {
      const reactions = existingReaction?.emoji === emoji
        ? await removeMessageReaction(conversationId, messageId, emoji)
        : await addMessageReaction(conversationId, messageId, emoji)

      setMessages((prev) => prev.map((item) => (
        item.id === messageId ? { ...item, reactions } : item
      )))
    } catch {
      toast.error('Failed to update reaction')
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Link href={`/@${otherUser.username}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-border">
              <AvatarImage src={otherUser.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {otherUser.displayName?.[0]?.toUpperCase() || otherUser.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {otherUser.online && (
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {otherUser.displayName || otherUser.username}
            </h3>
            <p className="text-xs text-muted-foreground truncate">@{otherUser.username}</p>
          </div>
        </Link>

        <Button variant="ghost" size="icon" className="rounded-xl shrink-0">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--primary) / 0.3) transparent',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3 max-w-xs">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <UserIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">No messages yet</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Start the conversation with {otherUser.displayName || otherUser.username}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {hasOlder && (
              <div className="flex justify-center pb-2">
                <Button variant="ghost" size="sm" onClick={handleLoadOlder} disabled={loadingOlder}>
                  {loadingOlder ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : 'Load older messages'}
                </Button>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
                currentUserId={currentUserId}
                onReact={handleReaction}
              />
            ))}
          </div>
        )}
      </div>

      <MessageInput onSend={handleSend} placeholder={`Message ${otherUser.displayName || otherUser.username}...`} />
    </div>
  )
}
