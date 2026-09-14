import { useState } from 'react'
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, TrendingUp, Flame } from 'lucide-react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { PostCard } from '@/components/home/PostCard'

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

export default function TrendingScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState('week')

  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['trending', period],
    queryFn: () => api.getTrending(period),
  })

  const posts = data?.trendingPosts || []

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
        <Flame size={22} color="#f59e0b" />
        <Text className="text-xl font-bold text-text-primary">Trending</Text>
      </View>

      <View className="flex-row px-4 py-3 gap-2">
        {PERIODS.map((item) => (
          <Pressable key={item.value} onPress={() => setPeriod(item.value)} className={`px-3 py-1.5 rounded-full ${period === item.value ? 'bg-primary' : 'bg-surface-elevated'}`}>
            <Text className={`text-sm font-medium ${period === item.value ? 'text-white' : 'text-text-muted'}`}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#6366f1" size="large" /></View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text-primary font-semibold">Couldn't load trending posts</Text>
          <Text className="text-text-muted text-sm mt-2 text-center">{error.message}</Text>
          <Pressable onPress={() => refetch()} className="mt-4 px-4 py-2 bg-primary rounded-xl"><Text className="text-white">Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item, index }) => (
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center"><Text className="text-primary font-bold text-sm">#{index + 1}</Text></View>
                <TrendingUp size={14} color="#22c55e" />
              </View>
              <PostCard
                post={item}
                onLike={() => void api.likePost(item.id).then(() => queryClient.invalidateQueries({ queryKey: ['trending', period] }))}
                onPress={() => router.push(`/(stack)/post/${item.id}`)}
                onAuthorPress={() => router.push(`/(stack)/user/${item.author.username}`)}
              />
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" colors={['#6366f1']} />}
          ListEmptyComponent={<View className="items-center py-20"><Text className="text-text-muted">No trending posts</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}
