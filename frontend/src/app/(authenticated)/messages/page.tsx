"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from '@/lib/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import ConversationList from '@/components/messages/ConversationList'
import ChatWindow from '@/components/messages/ChatWindow'
import { getConversations, getOrCreateConversation, subscribeToConversations, type Conversation } from '@/lib/messages'
import { MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const username = searchParams.get('username')

  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string
    otherUser: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Refresh conversation list
  const refreshConversations = useCallback(async () => {
    const data = await getConversations()
    setConversations(data)
  }, [])

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      setLoading(true)
      refreshConversations().finally(() => setLoading(false))
    }
  }, [user, refreshConversations])

  // Subscribe to conversation updates via Supabase realtime
  useEffect(() => {
    if (!user?.id) return
    return subscribeToConversations(user.id, refreshConversations)
  }, [user?.id, refreshConversations])

  // Handle direct message from URL params
  useEffect(() => {
    async function initializeConversation() {
      if (userId && username && user) {
        const conversationId = await getOrCreateConversation(userId)
        if (conversationId) {
          await refreshConversations()
          setSelectedConversation({
            id: conversationId,
            otherUser: {
              id: userId,
              username: username,
              displayName: username,
              avatar: '',
            },
          })
          setShowMobileChat(true)
        }
      }
    }
    initializeConversation()
  }, [userId, username, user, refreshConversations])

  const handleSelectConversation = async (conversationId: string, otherUser: any) => {
    // If it's a temp conversation (from "People you follow" list)
    if (conversationId.startsWith('temp_')) {
      const realId = await getOrCreateConversation(otherUser.id)
      if (realId) {
        await refreshConversations()
        setSelectedConversation({ id: realId, otherUser })
        setShowMobileChat(true)
      }
    } else {
      setSelectedConversation({ id: conversationId, otherUser })
      setShowMobileChat(true)
    }
  }

  const handleBack = () => {
    setShowMobileChat(false)
  }

  // Called by ChatWindow after a message is sent so the sidebar updates
  const handleMessageSent = () => {
    refreshConversations()
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation List */}
      <Card className={`
        w-full lg:w-80 xl:w-96
        bg-card border-border
        rounded-none lg:rounded-l-3xl
        ${showMobileChat ? 'hidden lg:block' : 'block'}
      `}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Messages</h1>
              <p className="text-xs text-muted-foreground">
                {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id}
          onSelect={handleSelectConversation}
          loading={loading}
          currentUserId={user?.id}
        />
      </Card>

      {/* Chat Window */}
      <Card className={`
        flex-1
        bg-background border-border
        rounded-none lg:rounded-r-3xl
        ${showMobileChat ? 'block' : 'hidden lg:block'}
      `}>
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation.id}
            otherUser={selectedConversation.otherUser}
            currentUserId={user?.id || ''}
            onBack={handleBack}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center space-y-3 max-w-md">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Your Messages</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Select a conversation from the list to start chatting, or visit a user's profile to send them a message
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
