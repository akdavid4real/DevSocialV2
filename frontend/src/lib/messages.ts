/**
 * Messages API and Real-time utilities
 */

import { supabase } from './supabase'
import api from './api'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  read: boolean
  reactions?: Array<{
    userId: string
    emoji: string
    createdAt: string
    user?: {
      id: string
      username: string
      displayName?: string | null
      avatar?: string
    }
  }>
  sender?: {
    id: string
    username: string
    displayName: string
    avatar: string
  }
  receiver?: {
    id: string
    username: string
    displayName: string
    avatar: string
  }
}

export interface Conversation {
  id: string
  lastMessage?: Message
  lastMessageAt: string
  unreadCount: number
  otherUser?: {
    id: string
    username: string
    displayName: string
    avatar: string
    online?: boolean
  }
}

function unwrap(response: any) {
  if (response?.data !== undefined) return response.data
  return response
}

export async function getConversations(): Promise<Conversation[]> {
  try {
    const response = await api.get('/messages/conversations')
    const data = unwrap(response)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return []
  }
}

export async function getMessages(
  conversationId: string,
  options: { before?: string; limit?: number } = {},
): Promise<Message[]> {
  try {
    const response = await api.get(`/messages/${conversationId}`, {
      params: {
        limit: Math.min(Math.max(options.limit || 50, 1), 100),
        ...(options.before ? { before: options.before } : {}),
      },
    })
    const data = unwrap(response)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

export async function sendMessage(receiverId: string, content: string): Promise<Message | null> {
  try {
    const response = await api.post('/messages', { receiverId, content })
    return unwrap(response)
  } catch (error) {
    console.error('Error sending message:', error)
    return null
  }
}

export async function markAsRead(conversationId: string): Promise<void> {
  try {
    await api.patch(`/messages/${conversationId}/read`)
  } catch (error) {
    console.error('Error marking messages as read:', error)
  }
}

export async function addMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string
): Promise<Message['reactions']> {
  const response = await api.post(`/messages/${conversationId}/${messageId}/reactions`, { emoji })
  const data = unwrap(response)
  return data?.reactions || []
}

export async function removeMessageReaction(
  conversationId: string,
  messageId: string,
  emoji?: string
): Promise<Message['reactions']> {
  const response = await api.delete(`/messages/${conversationId}/${messageId}/reactions`, {
    data: emoji ? { emoji } : {},
  })
  const data = unwrap(response)
  return data?.reactions || []
}

export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  try {
    const response = await api.post('/messages/conversations', {
      participantId: otherUserId,
    })
    const data = unwrap(response)
    return data?.id || null
  } catch (error) {
    console.error('Error creating conversation:', error)
    return null
  }
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Message',
        filter: `conversationId=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Message)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToConversations(
  userId: string,
  onUpdate: () => void
) {
  const channel = supabase
    .channel(`user-conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Message',
      },
      () => {
        onUpdate()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
