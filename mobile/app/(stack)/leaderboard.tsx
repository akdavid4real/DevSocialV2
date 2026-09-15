import { useState, useCallback } from 'react'
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Trophy, Medal, Crown } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { formatCount } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { User } from '@/lib/types'

const PERIODS = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'all', label: 'All Time' },
]

export default function LeaderboardScreen() {
  const router = useRouter()
  const [period, setPeriod] = useState('all')

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => api.getLeaderboard(period, 50),
  })

  const renderUser = useCallback(
    ({ item, index }: { item: User; index: number }) => {
      const rank = index + 1
      return (
        <Pressable
          onPress={() => router.push(`/(stack)/user/${item.username}`)}
          className={`flex-row items-center gap-3 px-4 py-3 border-b border-border ${rank <= 3 ? 'bg-primary/5' : ''}`}
        >
          <View className="w-8 items-center">
            {rank === 1 ? <Crown size={20} color="#f59e0b" /> : rank <= 3 ? <Medal size={20} color={rank === 2 ? '#94a3b8' : '#cd7c2f'} /> : <Text className="text-text-muted font-bold">#{rank}</Text>}
          </View>
          <Avatar uri={item.avatar} name={item.displayName || undefined} username={item.username} size="md" />
          <View className="flex-1">
            <Text className="text-text-primary font-semibold">{item.displayName || item.username}</Text>
            <Text className="text-text-muted text-sm">@{item.username}</Text>
          </View>
          <View className="items-end">
            <Text className="text-primary font-bold">{formatCount(item.points || 0)}</Text>
            <Text className="text-text-muted text-xs">points</Text>
          </View>
          <Badge>Lvl {item.level || 1}</Badge>
        </Pressable>
      )
    },
    [router],
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}><ArrowLeft size={24} color="#FAFAFA" /></Pressable>
        <Trophy size={22} color="#f59e0b" />
        <Text className="text-xl font-bold text-text-primary">Leaderboard</Text>
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
          <Text className="text-text-primary font-semibold">Couldn't load leaderboard</Text>
          <Pressable onPress={() => refetch()} className="mt-4 px-4 py-2 bg-primary rounded-xl"><Text className="text-white">Retry</Text></Pressable>
        </View>
      ) : (
        <FlatList data={users} renderItem={renderUser} keyExtractor={(item) => item.id} ListEmptyComponent={<View className="items-center py-20"><Text className="text-text-muted">No leaderboard data</Text></View>} />
      )}
    </SafeAreaView>
  )
}
