import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Trophy, Medal, Crown } from 'lucide-react-native'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap, formatCount } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

const PERIODS = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'all', label: 'All Time' },
]

export default function LeaderboardScreen() {
  const router = useRouter()
  const [period, setPeriod] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: async () => {
      const response = await api.getLeaderboard(period)
      return unwrap(response)
    },
  })

  const users = (data as any[]) || []

  const renderUser = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const rank = index + 1
      const isTop3 = rank <= 3

      return (
        <Pressable
          onPress={() => router.push(`/(stack)/user/${item.username}`)}
          className={`flex-row items-center gap-3 px-4 py-3 border-b border-border ${
            isTop3 ? 'bg-primary/5' : ''
          }`}
        >
          {/* Rank */}
          <View className="w-8 items-center">
            {rank === 1 ? (
              <Crown size={20} color="#f59e0b" />
            ) : rank === 2 ? (
              <Medal size={20} color="#94a3b8" />
            ) : rank === 3 ? (
              <Medal size={20} color="#cd7c2f" />
            ) : (
              <Text className="text-text-muted font-bold">#{rank}</Text>
            )}
          </View>

          <Avatar uri={item.avatar} name={item.displayName} username={item.username} size="md" />

          <View className="flex-1">
            <Text className="text-text-primary font-semibold">
              {item.displayName || item.username}
            </Text>
            <Text className="text-text-muted text-sm">@{item.username}</Text>
          </View>

          <View className="items-end">
            <Text className="text-primary font-bold">{formatCount(item.points)}</Text>
            <Text className="text-text-muted text-xs">points</Text>
          </View>

          <Badge>Lvl {item.level}</Badge>
        </Pressable>
      )
    },
    []
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Trophy size={22} color="#f59e0b" />
        <Text className="text-xl font-bold text-text-primary">Leaderboard</Text>
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
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-text-muted">No leaderboard data</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
