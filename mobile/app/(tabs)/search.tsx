import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Search as SearchIcon, X } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { unwrap } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

export default function SearchScreen() {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users')
  const router = useRouter()

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      const response = await api.searchUsers(query)
      return unwrap(response)
    },
    enabled: query.length >= 2 && activeTab === 'users',
  })

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['search-posts', query],
    queryFn: async () => {
      const response = await api.searchPosts(query)
      return unwrap(response)
    },
    enabled: query.length >= 2 && activeTab === 'posts',
  })

  const renderUser = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        onPress={() => router.push(`/(stack)/user/${item.username}`)}
        className="flex-row items-center gap-3 px-4 py-3 border-b border-border"
      >
        <Avatar uri={item.avatar} name={item.displayName} username={item.username} size="md" />
        <View className="flex-1">
          <Text className="text-text-primary font-semibold">{item.displayName || item.username}</Text>
          <Text className="text-text-muted text-sm">@{item.username}</Text>
        </View>
        <Badge>Lvl {item.level}</Badge>
      </Pressable>
    ),
    []
  )

  const renderPost = useCallback(
    ({ item }: { item: any }) => (
      <Pressable
        onPress={() => router.push(`/(stack)/post/${item.id}`)}
        className="px-4 py-3 border-b border-border"
      >
        <View className="flex-row items-center gap-2 mb-1">
          <Avatar uri={item.author?.avatar} username={item.author?.username} size="sm" />
          <Text className="text-text-muted text-sm">@{item.author?.username}</Text>
        </View>
        <Text className="text-text-primary" numberOfLines={3}>
          {item.content}
        </Text>
      </Pressable>
    ),
    []
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Search Input */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row items-center bg-surface border border-border rounded-xl px-3">
          <SearchIcon size={18} color="#71717A" />
          <Input
            placeholder="Search users, posts..."
            value={query}
            onChangeText={setQuery}
            className="flex-1 border-0 bg-transparent"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <X size={18} color="#71717A" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-border">
        {(['users', 'posts'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 items-center ${
              activeTab === tab ? 'border-b-2 border-primary' : ''
            }`}
          >
            <Text
              className={`font-semibold capitalize ${
                activeTab === tab ? 'text-primary' : 'text-text-muted'
              }`}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Results */}
      {query.length < 2 ? (
        <View className="flex-1 items-center justify-center">
          <SearchIcon size={48} color="#27272A" />
          <Text className="text-text-muted mt-4">Search for users or posts</Text>
        </View>
      ) : (loadingUsers || loadingPosts) ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : activeTab === 'users' ? (
        <FlatList
          data={users || []}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-text-muted">No users found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={(posts as any)?.posts || posts || []}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-text-muted">No posts found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
