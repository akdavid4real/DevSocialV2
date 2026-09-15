import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import * as api from '@/lib/api'
import { getMessagePage } from '@/lib/messages-api'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import type { Message } from '@/lib/types'

const PAGE_SIZE = 50

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [messageText, setMessageText] = useState('')
  const flatListRef = useRef<FlatList<Message>>(null)

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.getConversations,
  })

  const conversation = conversations.find((item) => item.id === conversationId)
  const otherUser = conversation?.otherUser

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) => getMessagePage(conversationId!, pageParam || undefined, PAGE_SIZE),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!conversationId,
  })

  const messages = useMemo(() => {
    const pages = data?.pages || []
    const seen = new Set<string>()
    const merged = pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages)
      .filter((message) => {
        if (seen.has(message.id)) return false
        seen.add(message.id)
        return true
      })
    return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [data])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`mobile-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
          void queryClient.invalidateQueries({ queryKey: ['conversations'] })
        },
      )
      .subscribe()

    void api.markAsRead(conversationId)

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])

  useEffect(() => {
    if (messages.length > 0 && !isFetchingNextPage) {
      const timer = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
      return () => clearTimeout(timer)
    }
  }, [messages.length, isFetchingNextPage])

  const sendMutation = useMutation({
    mutationFn: async () => {
      const content = messageText.trim()
      if (!content) throw new Error('Message cannot be empty')
      if (!otherUser?.id) throw new Error('Conversation participant is unavailable')
      return api.sendMessage({ receiverId: otherUser.id, content })
    },
    onSuccess: () => {
      setMessageText('')
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (error: any) => {
      Toast.show({ type: 'error', text1: error?.message || 'Failed to send message' })
    },
  })

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user?.id
    return (
      <View className={`flex-row gap-2 px-4 py-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {!isMine && <Avatar uri={item.sender?.avatar} username={item.sender?.username} size="sm" />}
        <View className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-primary rounded-br-md' : 'bg-surface-elevated rounded-bl-md'}`}>
          <Text className={isMine ? 'text-white' : 'text-text-primary'}>{item.content}</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
          <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
          {otherUser ? (
            <Pressable onPress={() => router.push(`/(stack)/user/${otherUser.username}`)} className="flex-row items-center gap-2">
              <Avatar uri={otherUser.avatar} username={otherUser.username} size="sm" />
              <Text className="text-text-primary font-semibold">{otherUser.displayName || otherUser.username}</Text>
            </Pressable>
          ) : (
            <Text className="text-text-primary font-semibold">Conversation</Text>
          )}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color="#6366f1" size="large" /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            ListHeaderComponent={
              hasNextPage ? (
                <Pressable
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="self-center px-4 py-2 my-2 rounded-full bg-surface-elevated"
                >
                  <Text className="text-primary text-sm">{isFetchingNextPage ? 'Loading…' : 'Load older messages'}</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={<View className="items-center justify-center py-20"><Text className="text-text-muted">Start the conversation</Text></View>}
          />
        )}

        <View className="flex-row items-center gap-2 px-4 py-3 border-t border-border">
          <TextInput
            placeholder={otherUser ? `Message ${otherUser.displayName || otherUser.username}...` : 'Type a message...'}
            placeholderTextColor="#71717A"
            value={messageText}
            onChangeText={setMessageText}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary"
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={() => sendMutation.mutate()}
            disabled={!messageText.trim() || !otherUser?.id || sendMutation.isPending}
            className={`p-2.5 rounded-xl ${messageText.trim() && otherUser?.id ? 'bg-primary' : 'bg-surface-elevated'}`}
          >
            <Send size={18} color={messageText.trim() && otherUser?.id ? '#fff' : '#71717A'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
