"use client"

import Link from "@/components/ui/link"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, Heart } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { renderContent } from "@/lib/render-content"
import PostMediaGrid from "./PostMediaGrid"
import CommentReply from "./CommentReply"
import CommentInput from "./CommentInput"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CommentItemProps {
    comment: any
    currentUserId?: string
    onDelete: (id: string) => void
    onReply: (id: string) => void
    depth?: number
    replyingTo: string | null
    onCancelReply: () => void
    onSubmitReply: () => void
    postId: string
}

export default function CommentItem({
    comment,
    currentUserId,
    onDelete,
    onReply,
    depth = 0,
    replyingTo,
    onCancelReply,
    onSubmitReply,
    postId
}: CommentItemProps) {
    const isOwner = currentUserId === comment.authorId
    const hasReplies = comment.repliesCount > 0
    const [liked, setLiked] = useState(comment.isLiked || false)
    const [likesCount, setLikesCount] = useState(comment.likesCount || 0)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [replies, setReplies] = useState<any[]>([])
    const [loadingReplies, setLoadingReplies] = useState(false)
    const [repliesPage, setRepliesPage] = useState(1)
    const [hasMoreReplies, setHasMoreReplies] = useState(false)

    const loadReplies = async () => {
        if (loadingReplies) return
        setLoadingReplies(true)
        try {
            const response = await api.get(`/posts/comments/${comment.id}/replies?page=${repliesPage}&limit=10`)
            const data = response.data || response
            setReplies(prev => [...prev, ...data.replies])
            setHasMoreReplies(data.hasMore)
            setRepliesPage(prev => prev + 1)
        } catch (error) {
            toast.error("Failed to load replies")
        } finally {
            setLoadingReplies(false)
        }
    }

    const handleDelete = async () => {
        try {
            await api.delete(`/posts/comments/${comment.id}`)
            onDelete(comment.id)
            toast.success("Comment deleted")
        } catch (error) {
            toast.error("Failed to delete comment")
        }
        setShowDeleteDialog(false)
    }

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const previousLiked = liked
        const previousCount = likesCount

        // Optimistic update
        setLiked(!liked)
        setLikesCount((prev: number) => liked ? prev - 1 : prev + 1)

        try {
            const response = await api.post(`/posts/comments/${comment.id}/like`)
            const data = response.data || response
            
            // Show XP notification if user earned XP (only when liking, not own comment)
            if (!previousLiked && data.xpChange > 0 && !data.isOwnComment) {
                toast.success(
                    <div className="flex items-center gap-2">
                        <span>Comment liked</span>
                        <span className="text-primary font-semibold">+{data.xpChange} XP</span>
                    </div>,
                    {
                        duration: 2000,
                        icon: '❤️',
                    }
                )
            }
        } catch (error) {
            setLiked(previousLiked)
            setLikesCount(previousCount)
            toast.error("Failed to update like status")
        }
    }

    return (
        <div className="group/comment">
            <div className="flex gap-3">
                <Link href={`/@${comment.author?.username}`}>
                    <Avatar className="h-8 w-8 rounded-lg shrink-0 border border-white/5 hover:border-primary/50 transition-colors">
                        <AvatarImage src={comment.author?.avatar} />
                        <AvatarFallback className="text-xs">{comment.author?.username?.[0]}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/@${comment.author?.username}`}
                            className="text-xs font-semibold tracking-tight text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                            {comment.author?.displayName || comment.author?.username}
                        </Link>
                        <span className="text-xs font-semibold text-muted-foreground/60 tracking-tighter">
                            {formatDistanceToNow(new Date(comment.createdAt))} ago
                        </span>
                    </div>

                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                        {renderContent(comment.content)}
                    </p>

                    <PostMediaGrid
                        imageUrls={comment.imageUrls}
                        videoUrls={comment.videoUrls}
                        maxHeight="max-h-48"
                        className="mt-2 max-w-sm"
                    />

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLike}
                            className={cn(
                                "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors p-1 -ml-1 rounded-lg",
                                liked ? "text-red-500" : "text-muted-foreground/60 hover:text-red-500"
                            )}
                        >
                            <Heart className={cn("h-3 w-3", liked && "fill-current")} />
                            {likesCount > 0 && <span>{likesCount}</span>}
                        </button>
                        <button
                            onClick={() => onReply(comment.id)}
                            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors p-1"
                        >
                            Reply
                        </button>
                        {isOwner && (
                            <button
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-xs font-semibold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors p-1"
                            >
                                Purge
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Inline reply input */}
            {replyingTo === comment.id && (
                <div className="ml-11 mt-3 animate-in slide-in-from-top-2 duration-200">
                    <CommentInput
                        postId={postId}
                        parentId={comment.id}
                        onSubmitSuccess={() => {
                            onCancelReply()
                            onSubmitReply()
                        }}
                        currentUserId={currentUserId}
                        placeholder="Add to transmission..."
                    />
                </div>
            )}

            {hasReplies && replies.length === 0 && (
                <div className="ml-8 mt-4">
                    <button
                        onClick={loadReplies}
                        disabled={loadingReplies}
                        className="text-xs font-semibold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors flex items-center gap-2"
                    >
                        {loadingReplies ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            `View ${comment.repliesCount} ${comment.repliesCount === 1 ? 'reply' : 'replies'}`
                        )}
                    </button>
                </div>
            )}

            {replies.length > 0 && (
                <div className="ml-8 mt-4 space-y-4">
                    {replies.map((reply: any) => (
                        <div key={reply.id}>
                            <CommentReply
                                reply={reply}
                                currentUserId={currentUserId}
                                onDelete={onDelete}
                                onReply={onReply}
                            />
                            {replyingTo === reply.id && (
                                <div className="ml-9 mt-3 animate-in slide-in-from-top-2 duration-200">
                                    <CommentInput
                                        postId={postId}
                                        parentId={comment.id}
                                        onSubmitSuccess={() => {
                                            onCancelReply()
                                            onSubmitReply()
                                            setReplies([])
                                            setRepliesPage(1)
                                        }}
                                        currentUserId={currentUserId}
                                        placeholder="Add to transmission..."
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                    {hasMoreReplies && (
                        <button
                            onClick={loadReplies}
                            disabled={loadingReplies}
                            className="ml-3 text-xs font-semibold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors flex items-center gap-2"
                        >
                            {loadingReplies ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                'Load more replies'
                            )}
                        </button>
                    )}
                </div>
            )}

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your comment.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
