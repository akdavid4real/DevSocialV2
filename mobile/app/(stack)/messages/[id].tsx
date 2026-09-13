import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Send } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import type { Message } from '@/lib/types'

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [messageText, setMessageText] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const response = await api.getMessages(conversationId!)
      return unwrap(response) as Message[]
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  })

  // Supabase real-time subscription
  useEffect(() => {
    if (!conversationId) return

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
        }
      )
      .subscribe()

    // Mark as read
    api.markAsRead(conversationId)

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages?.length])

  // Find the other user from messages
  const otherUser = messages?.find((m) => m.senderId !== user?.id)?.sender

  const sendMutation = useMutation({
    mutationFn: async () => {
      const receiverId = otherUser?.id || messages?.[0]?.receiverId || messages?.[0]?.senderId
      if (!receiverId) throw new Error('No receiver')
      return api.sendMessage({ receiverId, content: messageText })
    },
    onSuccess: () => {
      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    },
  })

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.senderId === user?.id

      return (
        <View className={`flex-row gap-2 px-4 py-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          {!isMine && (
            <Avatar
              uri={item.sender?.avatar}
              username={item.sender?.username}
              size="sm"
            />
          )}
          <View
            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              isMine
                ? 'bg-primary rounded-br-md'
                : 'bg-surface-elevated rounded-bl-md'
            }`}
          >
            <Text className={isMine ? 'text-white' : 'text-text-primary'}>
              {item.content}
            </Text>
          </View>
        </View>
      )
    },
    [user?.id]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FAFAFA" />
          </Pressable>
          {otherUser && (
            <Pressable
              onPress={() => router.push(`/(stack)/user/${otherUser.username}`)}
              className="flex-row items-center gap-2"
            >
              <Avatar uri={otherUser.avatar} username={otherUser.username} size="sm" />
              <Text className="text-text-primary font-semibold">
                {otherUser.displayName || otherUser.username}
              </Text>
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#6366f1" size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages || []}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Text className="text-text-muted">Start the conversation</Text>
              </View>
            }
          />
        )}

        {/* Message Input */}
        <View className="flex-row items-center gap-2 px-4 py-3 border-t border-border">
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#71717A"
            value={messageText}
            onChangeText={setMessageText}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary"
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={() => sendMutation.mutate()}
            disabled={!messageText.trim() || sendMutation.isPending}
            className={`p-2.5 rounded-xl ${messageText.trim() ? 'bg-primary' : 'bg-surface-elevated'}`}
          >
            <Send size={18} color={messageText.trim() ? '#fff' : '#71717A'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
