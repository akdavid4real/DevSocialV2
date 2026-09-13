"use client"

import Link from "@/components/ui/link"
import { useState } from "react"
import { Heart, CornerDownRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { renderContent } from "@/lib/render-content"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CommentReplyProps {
    reply: any
    currentUserId?: string
    onDelete: (id: string) => void
    onReply: (id: string) => void
}

export default function CommentReply({ reply, currentUserId, onDelete, onReply }: CommentReplyProps) {
    const [replyLiked, setReplyLiked] = useState(reply.isLiked || false)
    const [replyLikesCount, setReplyLikesCount] = useState(reply.likesCount || 0)

    const handleReplyLike = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const previousLiked = replyLiked
        const previousCount = replyLikesCount

        setReplyLiked(!replyLiked)
        setReplyLikesCount((prev: number) => replyLiked ? prev - 1 : prev + 1)

        try {
            const response = await api.post(`/posts/comments/${reply.id}/like`)
            const data = response.data || response
            
            // Show XP notification if user earned XP (only when liking, not own comment)
            if (!previousLiked && data.xpChange > 0 && !data.isOwnComment) {
                toast.success(
                    <div className="flex items-center gap-2">
                        <span>Reply liked</span>
                        <span className="text-primary font-semibold">+{data.xpChange} XP</span>
                    </div>,
                    {
                        duration: 2000,
                        icon: '❤️',
                    }
                )
            }
        } catch (error) {
            setReplyLiked(previousLiked)
            setReplyLikesCount(previousCount)
            toast.error("Failed to update like status")
        }
    }

    return (
        <div className="flex gap-3 relative before:absolute before:-left-5 before:top-4 before:bottom-0 before:w-[1px] before:bg-white/5">
            <CornerDownRight className="h-3 w-3 text-muted-foreground/60 absolute -left-5 top-0" />
            <Link href={`/@${reply.author?.username}`}>
                <Avatar className="h-6 w-6 rounded-md shrink-0 border border-white/5 hover:border-primary/50 transition-colors">
                    <AvatarImage src={reply.author?.avatar} />
                    <AvatarFallback className="text-[8px]">{reply.author?.username?.[0]}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <Link 
                        href={`/@${reply.author?.username}`}
                        className="text-xs font-semibold uppercase tracking-tight text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                        {reply.author?.displayName || reply.author?.username}
                    </Link>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed font-medium">
                    {renderContent(reply.content)}
                </p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReplyLike}
                        className={cn(
                            "flex items-center gap-1 text-[8px] font-semibold uppercase tracking-widest transition-colors p-1 -ml-1 rounded-lg",
                            replyLiked ? "text-red-500" : "text-muted-foreground/60 hover:text-red-500"
                        )}
                    >
                        <Heart className={cn("h-2.5 w-2.5", replyLiked && "fill-current")} />
                        {replyLikesCount > 0 && <span>{replyLikesCount}</span>}
                    </button>
                    <button
                        onClick={() => onReply(reply.id)}
                        className="text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors"
                    >
                        Reply
                    </button>
                    {currentUserId === reply.authorId && (
                        <button
                            onClick={() => onDelete(reply.id)}
                            className="text-[8px] font-semibold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors"
                        >
                            Purge
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
