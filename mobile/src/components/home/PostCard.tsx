import { View, Text, Image, Pressable } from 'react-native'
import { Heart, MessageCircle, Eye, MoreHorizontal } from 'lucide-react-native'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { timeAgo, formatCount } from '@/lib/utils'
import type { Post } from '@/lib/types'

interface PostCardProps {
  post: Post
  onLike: () => void
  onPress: () => void
  onAuthorPress: () => void
}

export function PostCard({ post, onLike, onPress, onAuthorPress }: PostCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
        <Pressable onPress={onAuthorPress}>
          <Avatar
            uri={post.author?.avatar}
            name={post.author?.displayName}
            username={post.author?.username}
            size="md"
          />
        </Pressable>
        <Pressable onPress={onAuthorPress} className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-text-primary font-semibold">
              {post.isAnonymous ? 'Anonymous' : post.author?.displayName || post.author?.username}
            </Text>
            {!post.isAnonymous && post.author?.level && (
              <Badge>Lvl {post.author.level}</Badge>
            )}
          </View>
          <Text className="text-text-muted text-xs">{timeAgo(post.createdAt)}</Text>
        </Pressable>
        <Pressable className="p-1">
          <MoreHorizontal size={18} color="#71717A" />
        </Pressable>
      </View>

      {/* Content */}
      <View className="px-4 py-2">
        <Text className="text-text-primary text-base leading-6" numberOfLines={6}>
          {post.content}
        </Text>
      </View>

      {/* Images */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <View className="px-4 pb-2">
          {post.imageUrls.length === 1 ? (
            <Image
              source={{ uri: post.imageUrls[0] }}
              className="w-full h-52 rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {post.imageUrls.slice(0, 4).map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  className="w-[48%] h-32 rounded-xl"
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row items-center gap-6 px-4 py-3 border-t border-border">
        <Pressable onPress={onLike} className="flex-row items-center gap-1.5">
          <Heart
            size={18}
            color={post.isLiked ? '#ef4444' : '#71717A'}
            fill={post.isLiked ? '#ef4444' : 'transparent'}
          />
          <Text className={`text-sm ${post.isLiked ? 'text-destructive' : 'text-text-muted'}`}>
            {formatCount(post.likesCount)}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          <MessageCircle size={18} color="#71717A" />
          <Text className="text-text-muted text-sm">{formatCount(post.commentsCount)}</Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Eye size={18} color="#71717A" />
          <Text className="text-text-muted text-sm">{formatCount(post.viewsCount)}</Text>
        </View>
      </View>
    </Pressable>
  )
}
