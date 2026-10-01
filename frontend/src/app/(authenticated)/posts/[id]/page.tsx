"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "@/lib/navigation"
import { ArrowLeft, Loader2, Signal, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import PostCard from "@/components/home/PostCard"
import CommentCard from "@/components/comments/CommentCard"
import CommentInput from "@/components/comments/CommentInput"
import api from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface Comment {
    id: string
    author: {
        id: string
        username: string
        displayName: string
        avatar: string
        level: number
    }
    content: string
    imageUrls?: string[]
    videoUrls?: string[]
    likesCount: number
    isLiked: boolean
    createdAt: string
    repliesCount?: number
}

export default function PostDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [post, setPost] = useState<any>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [replies, setReplies] = useState<Record<string, Comment[]>>({})
    const [loading, setLoading] = useState(true)
    const [loadingComments, setLoadingComments] = useState(false)
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({})

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await api.get<any>(`/posts/${id}`)
                const postData = response.data || response
                setPost(postData)
                
            } catch (error) {
                console.error("Failed to fetch post:", error)
                toast.error("Post not found")
                router.push("/")
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            fetchPost()
        }
    }, [id, router])

    const loadedPostId = post?.id

    useEffect(() => {
        const fetchComments = async () => {
            if (!loadedPostId) return
            
            setLoadingComments(true)
            try {
                const response: any = await api.get(`/posts/${id}/comments?limit=50`)
                console.log('[COMMENTS] Response:', response)
                const commentsData = response.data?.comments || response.comments || []
                setComments(commentsData)
            } catch (error) {
                console.error('Failed to fetch comments:', error)
            } finally {
                setLoadingComments(false)
            }
        }

        if (loadedPostId) {
            fetchComments()
        }
    }, [loadedPostId, id])

    const fetchReplies = async (commentId: string) => {
        if (loadingReplies[commentId]) return
        
        setLoadingReplies(prev => ({ ...prev, [commentId]: true }))
        try {
            const response: any = await api.get(`/posts/comments/${commentId}/replies`)
            console.log('[REPLIES] Response:', response)
            const repliesData = response.data?.replies || response.replies || []
            setReplies(prev => ({ ...prev, [commentId]: repliesData }))
        } catch (error) {
            console.error('Failed to fetch replies:', error)
        } finally {
            setLoadingReplies(prev => ({ ...prev, [commentId]: false }))
        }
    }

    const handleCommentSubmit = async (content: string, imageUrls?: string[]) => {
        try {
            await api.post(`/posts/${id}/comments`, { content, imageUrls: imageUrls || [] })
            toast.success('Comment posted!')
            
            // Refetch comments
            const response: any = await api.get(`/posts/${id}/comments?limit=50`)
            const commentsData = response.data?.comments || response.comments || []
            setComments(commentsData)
            
            // Update post comment count
            setPost((prev: any) => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null)
        } catch (error) {
            console.error('Failed to post comment:', error)
            toast.error('Failed to post comment')
            throw error
        }
    }

    const handleReplySubmit = async (parentId: string, content: string, imageUrls?: string[]) => {
        try {
            await api.post(`/posts/${id}/comments`, { content, parentId, imageUrls: imageUrls || [] })
            toast.success('Reply posted!')
            setReplyingTo(null)
            
            // Refetch replies for this comment
            await fetchReplies(parentId)
            
            // Update post comment count
            setPost((prev: any) => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : null)
        } catch (error) {
            console.error('Failed to post reply:', error)
            toast.error('Failed to post reply')
            throw error
        }
    }

    const handleCommentLike = async (commentId: string) => {
        try {
            const response: any = await api.post(`/posts/comments/${commentId}/like`)
            const { liked, likesCount } = response.data || response
            
            // Update comment in list
            setComments(prev => prev.map(c => 
                c.id === commentId ? { ...c, isLiked: liked, likesCount } : c
            ))
            
            // Update reply in nested list
            setReplies(prev => {
                const updated = { ...prev }
                Object.keys(updated).forEach(parentId => {
                    updated[parentId] = updated[parentId].map(r =>
                        r.id === commentId ? { ...r, isLiked: liked, likesCount } : r
                    )
                })
                return updated
            })
        } catch (error) {
            console.error('Failed to like comment:', error)
            toast.error('Failed to like comment')
        }
    }

    const handleCommentDelete = async (commentId: string) => {
        try {
            await api.delete(`/posts/comments/${commentId}`)
            toast.success('Comment deleted')
            
            // Remove from list
            setComments(prev => prev.filter(c => c.id !== commentId))
            
            // Update post comment count
            setPost((prev: any) => prev ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) - 1) } : null)
        } catch (error) {
            console.error('Failed to delete comment:', error)
            toast.error('Failed to delete comment')
        }
    }

    const handleReplyClick = (commentId: string) => {
        if (replyingTo === commentId) {
            setReplyingTo(null)
        } else {
            setReplyingTo(commentId)
            // Fetch replies if not already loaded
            if (!replies[commentId]) {
                fetchReplies(commentId)
            }
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
                    <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/50">Loading</span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 italic">Fetching Post...</span>
                </div>
            </div>
        )
    }

    if (!post) return null

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="group flex items-center gap-3 rounded-2xl hover:bg-white/5 pr-6"
                >
                    <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-[background-color,color]">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Back</span>
                </Button>

                <div className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-primary/10 border border-primary/20">
                    <Signal className="h-3 w-3 text-primary animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-primary">Post View</span>
                </div>
            </div>

            {/* Post */}
            <PostCard post={post} currentUserId={user?.id} isDetailPage={true} />

            {/* Comments Section */}
            <div className="space-y-6">
                {/* Comments Header */}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Comments</h2>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                            {post.commentsCount || 0} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
                        </p>
                    </div>
                </div>

                {/* Comment Input */}
                {user && (
                    <CommentInput
                        currentUserAvatar={user.avatar}
                        placeholder="Share your thoughts..."
                        onSubmit={handleCommentSubmit}
                    />
                )}

                {/* Comments List */}
                {loadingComments ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed text-center">
                        <MessageCircle className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-2">
                            No Comments Yet
                        </h3>
                        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">
                            Be the first to comment
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {comments.map((comment) => (
                            <div key={comment.id} className="space-y-4">
                                <CommentCard
                                    comment={comment}
                                    currentUserId={user?.id}
                                    onLike={handleCommentLike}
                                    onReply={handleReplyClick}
                                    onDelete={handleCommentDelete}
                                />

                                {/* Replies */}
                                {replyingTo === comment.id && (
                                    <div className="ml-12">
                                        <CommentInput
                                            currentUserAvatar={user?.avatar}
                                            placeholder={`Reply to @${comment.author.username}...`}
                                            onSubmit={(content) => handleReplySubmit(comment.id, content)}
                                            onCancel={() => setReplyingTo(null)}
                                            autoFocus
                                        />
                                    </div>
                                )}

                                {/* Show Replies */}
                                {replies[comment.id] && replies[comment.id].length > 0 && (
                                    <div className="space-y-4">
                                        {replies[comment.id].map((reply) => (
                                            <CommentCard
                                                key={reply.id}
                                                comment={reply}
                                                currentUserId={user?.id}
                                                onLike={handleCommentLike}
                                                onReply={() => {}}
                                                onDelete={handleCommentDelete}
                                                isReply
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Load Replies Button */}
                                {!replies[comment.id] && comment.repliesCount && comment.repliesCount > 0 && (
                                    <button
                                        onClick={() => fetchReplies(comment.id)}
                                        disabled={loadingReplies[comment.id]}
                                        className="ml-12 flex items-center gap-2 px-4 py-2 rounded-[12px] text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/10 transition-[background-color] disabled:opacity-50"
                                    >
                                        {loadingReplies[comment.id] ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                <span>Loading...</span>
                                            </>
                                        ) : (
                                            <span>View {comment.repliesCount} {comment.repliesCount === 1 ? 'Reply' : 'Replies'}</span>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
