import { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, PenSquare } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap, timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import type { Conversation } from '@/lib/types'

export default function MessagesScreen() {
  const router = useRouter()

  const { data: conversations, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await api.getConversations()
      return unwrap(response) as Conversation[]
    },
  })

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <Pressable
        onPress={() => router.push(`/(stack)/messages/${item.id}`)}
        className={`flex-row items-center gap-3 px-4 py-3 border-b border-border ${
          item.unreadCount > 0 ? 'bg-primary/5' : ''
        }`}
      >
        <Avatar
          uri={item.otherUser?.avatar}
          name={item.otherUser?.displayName}
          username={item.otherUser?.username}
          size="md"
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary font-semibold">
              {item.otherUser?.displayName || item.otherUser?.username}
            </Text>
            <Text className="text-text-muted text-xs">
              {item.lastMessage?.createdAt ? timeAgo(item.lastMessage.createdAt) : ''}
            </Text>
          </View>
          <Text className="text-text-secondary text-sm mt-0.5" numberOfLines={1}>
            {item.lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View className="bg-primary rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-white text-xs font-bold">{item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    ),
    []
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FAFAFA" />
          </Pressable>
          <Text className="text-xl font-bold text-text-primary">Messages</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={conversations || []}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-text-muted text-lg">No conversations yet</Text>
              <Text className="text-text-muted text-sm mt-1">
                Start a conversation from someone's profile
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
