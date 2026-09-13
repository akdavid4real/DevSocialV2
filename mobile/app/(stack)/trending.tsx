import { useState, useCallback } from 'react'
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
import { ArrowLeft, TrendingUp, Flame } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap, formatCount } from '@/lib/utils'
import { PostCard } from '@/components/home/PostCard'
import type { Post } from '@/lib/types'

const PERIODS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

export default function TrendingScreen() {
  const router = useRouter()
  const [period, setPeriod] = useState('week')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['trending', period],
    queryFn: async () => {
      const response = await api.getTrending(period)
      return unwrap(response)
    },
  })

  const posts = (data?.posts || data || []) as Post[]

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Flame size={22} color="#f59e0b" />
        <Text className="text-xl font-bold text-text-primary">Trending</Text>
      </View>

      {/* Period Filter */}
      <View className="flex-row px-4 py-3 gap-2">
        {PERIODS.map((p) => (
          <Pressable
            key={p.value}
            onPress={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-full ${
              period === p.value ? 'bg-primary' : 'bg-surface-elevated'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                period === p.value ? 'text-white' : 'text-text-muted'
              }`}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item, index }) => (
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center">
                  <Text className="text-primary font-bold text-sm">#{index + 1}</Text>
                </View>
                <TrendingUp size={14} color="#22c55e" />
              </View>
              <PostCard
                post={item}
                onLike={() => api.likePost(item.id)}
                onPress={() => router.push(`/(stack)/post/${item.id}`)}
                onAuthorPress={() => router.push(`/(stack)/user/${item.author.username}`)}
              />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-text-muted">No trending posts</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
