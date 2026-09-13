import { useState, useCallback } from 'react'
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
import Toast from 'react-native-toast-message'
import * as api from '@/lib/api'
import { unwrap, timeAgo } from '@/lib/utils'
import { PostCard } from '@/components/home/PostCard'
import { Avatar } from '@/components/ui/Avatar'
import type { Post, Comment } from '@/lib/types'

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')

  const { data: post, isLoading: loadingPost } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await api.getPost(id!)
      return unwrap(response) as Post
    },
    enabled: !!id,
  })

  const { data: comments, isLoading: loadingComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const response = await api.getComments(id!)
      const data = unwrap(response)
      return (data?.comments || data || []) as Comment[]
    },
    enabled: !!id,
  })

  const commentMutation = useMutation({
    mutationFn: () => api.createComment(id!, { content: commentText }),
    onSuccess: () => {
      setCommentText('')
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to post comment' })
    },
  })

  const likeMutation = useMutation({
    mutationFn: () => api.likePost(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', id] }),
  })

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <View className="flex-row gap-3 px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.push(`/(stack)/user/${item.author.username}`)}>
          <Avatar
            uri={item.author?.avatar}
            name={item.author?.displayName}
            username={item.author?.username}
            size="sm"
          />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-text-primary font-semibold text-sm">
              {item.author?.displayName || item.author?.username}
            </Text>
            <Text className="text-text-muted text-xs">{timeAgo(item.createdAt)}</Text>
          </View>
          <Text className="text-text-secondary mt-1">{item.content}</Text>
        </View>
      </View>
    ),
    []
  )

  if (loadingPost) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </SafeAreaView>
    )
  }

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
          <Text className="text-lg font-bold text-text-primary">Post</Text>
        </View>

        <FlatList
          data={comments || []}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            post ? (
              <View className="px-4 pt-4">
                <PostCard
                  post={post}
                  onLike={() => likeMutation.mutate()}
                  onPress={() => {}}
                  onAuthorPress={() => router.push(`/(stack)/user/${post.author.username}`)}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            loadingComments ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#6366f1" />
              </View>
            ) : (
              <View className="items-center py-10">
                <Text className="text-text-muted">No comments yet</Text>
              </View>
            )
          }
        />

        {/* Comment Input */}
        <View className="flex-row items-center gap-2 px-4 py-3 border-t border-border">
          <TextInput
            placeholder="Write a comment..."
            placeholderTextColor="#71717A"
            value={commentText}
            onChangeText={setCommentText}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-text-primary"
          />
          <Pressable
            onPress={() => commentMutation.mutate()}
            disabled={!commentText.trim() || commentMutation.isPending}
            className={`p-2.5 rounded-xl ${commentText.trim() ? 'bg-primary' : 'bg-surface-elevated'}`}
          >
            <Send size={18} color={commentText.trim() ? '#fff' : '#71717A'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
