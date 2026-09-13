"use client"

import { useState } from 'react'
import { Heart, MessageCircle, MoreVertical, Trash2 } from 'lucide-react'
import Image from '@/components/ui/image'
import Link from '@/components/ui/link'

interface CommentAuthor {
    id: string
    username: string
    displayName: string
    avatar: string
    level: number
}

interface Comment {
    id: string
    author: CommentAuthor
    content: string
    imageUrls?: string[]
    videoUrls?: string[]
    likesCount: number
    isLiked: boolean
    createdAt: string
    repliesCount?: number
}

interface CommentCardProps {
    comment: Comment
    currentUserId?: string
    onLike: (commentId: string) => void
    onReply: (commentId: string) => void
    onDelete?: (commentId: string) => void
    isReply?: boolean
}

export default function CommentCard({
    comment,
    currentUserId,
    onLike,
    onReply,
    onDelete,
    isReply = false
}: CommentCardProps) {
    const [showMenu, setShowMenu] = useState(false)

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const isOwnComment = currentUserId === comment.author.id

    return (
        <div className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}>
            {/* Avatar */}
            <Link href={`/@${comment.author.username}`}>
                <Image
                    src={comment.author.avatar || '/default-avatar.png'}
                    alt={comment.author.displayName}
                    width={isReply ? 32 : 40}
                    height={isReply ? 32 : 40}
                    className="rounded-full border-2 border-white/10 hover:border-primary/50 transition-colors flex-shrink-0"
                />
            </Link>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="p-4 rounded-[20px] bg-card border-border">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/@${comment.author.username}`}>
                                <span className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                                    {comment.author.displayName}
                                </span>
                            </Link>
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase">
                                LVL {comment.author.level}
                            </span>
                            <Link href={`/@${comment.author.username}`}>
                                <span className="text-xs font-semibold text-muted-foreground/60 tracking-wider hover:text-primary transition-colors">
                                    @{comment.author.username}
                                </span>
                            </Link>
                            <span className="text-xs text-muted-foreground/60">•</span>
                            <span className="text-xs text-muted-foreground/60">
                                {formatTimestamp(comment.createdAt)}
                            </span>
                        </div>

                        {/* Menu */}
                        {isOwnComment && onDelete && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="h-6 w-6 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
                                >
                                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                {showMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowMenu(false)}
                                        />
                                        <div className="absolute right-0 top-8 z-20 p-1 rounded-[16px] bg-[#0A0A0A] border border-white/10 shadow-xl min-w-[140px]">
                                            <button
                                                onClick={() => {
                                                    onDelete(comment.id)
                                                    setShowMenu(false)
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] text-xs font-semibold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-[background-color]"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Comment Text */}
                    <p className="text-sm text-foreground/90 leading-relaxed mb-3 break-words">
                        {comment.content}
                    </p>

                    {/* Images */}
                    {comment.imageUrls && comment.imageUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {comment.imageUrls.map((url, index) => (
                                <Image
                                    key={index}
                                    src={url}
                                    alt={`Comment image ${index + 1}`}
                                    width={400}
                                    height={300}
                                    className="rounded-[12px] border border-white/5 w-full h-auto"
                                />
                            ))}
                        </div>
                    )}

                    {/* Videos */}
                    {comment.videoUrls && comment.videoUrls.length > 0 && (
                        <div className="space-y-2 mb-3">
                            {comment.videoUrls.map((url, index) => (
                                <video
                                    key={index}
                                    controls
                                    className="w-full rounded-[12px] border border-white/5"
                                >
                                    <source src={url} type="video/mp4" />
                                </video>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onLike(comment.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-[background-color,color] ${
                                comment.isLiked
                                    ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                                    : 'text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                        >
                            <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-current' : ''}`} />
                            <span>{comment.likesCount}</span>
                        </button>

                        {!isReply && (
                            <button
                                onClick={() => onReply(comment.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-[background-color,color]"
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>Reply</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
