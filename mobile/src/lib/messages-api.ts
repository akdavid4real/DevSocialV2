import api from './api'
import type { Message, MessagePage } from './types'

const DEFAULT_PAGE_SIZE = 50

export async function getMessagePage(
  conversationId: string,
  before?: string,
  limit = DEFAULT_PAGE_SIZE,
): Promise<MessagePage> {
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const result = await api.get<any, any>(`/messages/${conversationId}`, {
    params: {
      limit: safeLimit,
      ...(before ? { before } : {}),
    },
  })

  const messages: Message[] = Array.isArray(result)
    ? result
    : Array.isArray(result?.messages)
      ? result.messages
      : []

  return {
    messages,
    nextCursor: messages.length === safeLimit ? messages[0]?.id || null : null,
  }
}
