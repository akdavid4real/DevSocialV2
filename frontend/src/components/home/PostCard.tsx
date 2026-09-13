"use client"

import Link from "@/components/ui/link"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "@/lib/navigation"
import { Flag, Heart, MessageCircle, Share2, MoreHorizontal, Eye, Loader2, Pin, PinOff, BarChart3, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { renderContent } from "@/lib/render-content"
import { createReport, formatReportReason, ReportReason, REPORT_REASONS } from "@/lib/reports"
import PostMediaGrid from "./PostMediaGrid"
import CommentItem from "./CommentItem"
import CommentInput from "./CommentInput"
import { PostAIActions } from "@/components/shared/PostAIActions"

interface PostCardProps {
    post: any;
    currentUserId?: string;
    isDetailPage?: boolean;
    isPinned?: boolean;
    canPin?: boolean;
    onPin?: () => void;
    onUnpin?: () => void;
}

type PollOption = {
    id: string
    text: string
    votes: number
    voters?: string[]
}

type PostPoll = {
    question: string
    options: PollOption[]
    totalVotes: number
    settings?: {
        multipleChoice?: boolean
        maxChoices?: number
    }
}

export default function PostCard({ post: initialPost, currentUserId, isDetailPage = false, isPinned = false, canPin = false, onPin, onUnpin }: PostCardProps) {
    const [post, setPost] = useState(initialPost)
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(initialPost.likesCount || 0)
    const [showComments, setShowComments] = useState(isDetailPage)
    const [comments, setComments] = useState<any[]>([])
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [loadingComments, setLoadingComments] = useState(false)
    const [commentsPage, setCommentsPage] = useState(1)
    const [hasMoreComments, setHasMoreComments] = useState(false)
    const [totalComments, setTotalComments] = useState(initialPost.commentCount || 0)
    const [reportOpen, setReportOpen] = useState(false)
    const [reportReason, setReportReason] = useState<ReportReason>("SPAM")
    const [reportDescription, setReportDescription] = useState("")
    const [reporting, setReporting] = useState(false)
    const [selectedPollOptions, setSelectedPollOptions] = useState<string[]>([])
    const [votingPoll, setVotingPoll] = useState(false)
    const router = useRouter()

    // Sync post prop changes
    useEffect(() => {
        console.log('PostCard: Post prop changed', initialPost)
        setPost(initialPost)
        if (initialPost.comments && initialPost.comments.length > 0) {
            console.log('PostCard: Setting comments from prop', initialPost.comments)
            setComments(initialPost.comments)
        }
    }, [initialPost])

    const author = post.author || {}
    const displayName = author.displayName || author.username || "Unknown"
    const handle = `@${author.username || "unknown"}`
    const createdAt = post.createdAt ? new Date(post.createdAt) : new Date()

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const previousLiked = liked
        const previousCount = likesCount

        setLiked(!liked)
        setLikesCount((prev: number) => liked ? prev - 1 : prev + 1)

        try {
            await api.post(`/posts/${post.id}/like`)
        } catch (error) {
            setLiked(previousLiked)
            setLikesCount(previousCount)
            toast.error("Failed to update like status")
        }
    }

    const fetchComments = async (page = 1, append = false) => {
        setLoadingComments(true)
        try {
            const response = await api.get<any>(`/posts/${post.id}/comments?page=${page}&limit=20`)
            if (response) {
                const data = response.data || response
                const newComments = Array.isArray(data) ? data : (data.comments || [])
                
                if (append) {
                    setComments(prev => [...prev, ...newComments])
                } else {
                    setComments(newComments)
                }
                
                setHasMoreComments(data.hasMore || false)
                setTotalComments(data.total || newComments.length)
                setCommentsPage(page)
            }
        } catch (error) {
            console.error("Failed to fetch comments", error)
        } finally {
            setLoadingComments(false)
        }
    }

    const loadMoreComments = () => {
        if (!loadingComments && hasMoreComments) {
            fetchComments(commentsPage + 1, true)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to purge this data?")) return
        try {
            await api.delete(`/posts/${post.id}`)
            toast.success("Post successfully purged.")
            window.location.reload()
        } catch (error) {
            toast.error("Deletion protocol failed.")
        }
    }

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation()
        const url = `${window.location.origin}/posts/${post.id}`
        navigator.clipboard.writeText(url)
        toast.success("Signal link copied.")
    }

    const handleReport = async () => {
        setReporting(true)
        try {
            await createReport({
                postId: post.id,
                reason: reportReason,
                description: reportDescription,
            })
            toast.success("Report submitted.")
            setReportOpen(false)
            setReportDescription("")
            setReportReason("SPAM")
        } catch (error: any) {
            toast.error(error?.message || "Failed to submit report.")
        } finally {
            setReporting(false)
        }
    }

    const poll = post.poll as PostPoll | undefined
    const votedOptionIds = poll?.options
        ?.filter((option) => currentUserId && option.voters?.includes(currentUserId))
        .map((option) => option.id) || []
    const hasVotedPoll = votedOptionIds.length > 0

    const togglePollOption = (optionId: string) => {
        if (!poll || hasVotedPoll) return
        setSelectedPollOptions((prev) => {
            if (poll.settings?.multipleChoice) {
                if (prev.includes(optionId)) return prev.filter((id) => id !== optionId)
                const maxChoices = poll.settings.maxChoices || poll.options.length
                return prev.length >= maxChoices ? prev : [...prev, optionId]
            }
            return [optionId]
        })
    }

    const submitPollVote = async (event: React.MouseEvent) => {
        event.stopPropagation()
        if (!poll || selectedPollOptions.length === 0) return

        setVotingPoll(true)
        try {
            const response = await api.post<any>(`/posts/${post.id}/poll/vote`, { optionIds: selectedPollOptions })
            const data = response.data || response
            setPost((prev: any) => ({ ...prev, poll: data.poll }))
            setSelectedPollOptions([])
            toast.success(data.xpAwarded ? `Vote counted. +${data.xpAwarded} XP` : "Vote counted.")
        } catch (error: any) {
            toast.error(error?.message || "Failed to submit vote")
        } finally {
            setVotingPoll(false)
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm("Are you sure?")) return
        try {
            await api.delete(`/posts/comments/${commentId}`)
            toast.success("Signal purged.")
            fetchComments()
        } catch (error) {
            toast.error("Deletion failed.")
        }
    }

    useEffect(() => {
        if (showComments && comments.length === 0 && !isDetailPage) {
            fetchComments()
        }
    }, [showComments])

    return (
        <>
        <Card className={cn(
            "bg-card border-border overflow-hidden transition-colors duration-500 hover:bg-card/80 group rounded-3xl",
            !showComments && "mb-4"
        )}>
            <CardContent className="p-0">
                <div
                    className={cn("p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4", !isDetailPage && "cursor-pointer")}
                    onClick={isDetailPage ? undefined : () => router.push(`/posts/${post.id}`)}
                >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Link 
                                    href={`/@${author.username}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="transition-transform duration-500 hover:scale-110"
                                >
                                    <Avatar className="h-11 w-11 border-2 border-primary/20 shadow-xl">
                                        <AvatarImage src={author.avatar} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold tracking-tighter">
                                            {displayName[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                    <Link
                                        href={`/@${author.username}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-sm font-bold tracking-tight text-foreground hover:text-primary transition-colors"
                                    >
                                        {displayName}
                                    </Link>
                                        {author.level && (
                                            <Badge variant="outline" className="h-4 px-1.5 bg-primary/10 border-primary/20 text-xs font-bold uppercase tracking-widest text-primary">
                                                Lvl {author.level}
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium tracking-wide text-muted-foreground/60">
                                        {handle} • {formatDistanceToNow(createdAt, { addSuffix: true })}
                                    </span>
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900/90 backdrop-blur-xl border-white/10 rounded-2xl p-1.5">
                                    {canPin && onPin && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin(); }} className="rounded-xl text-xs font-semibold uppercase tracking-widest focus:bg-primary/20 focus:text-primary cursor-pointer">
                                            <Pin className="h-3 w-3 mr-2" />
                                            Pin Post
                                        </DropdownMenuItem>
                                    )}
                                    {isPinned && onUnpin && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnpin(); }} className="rounded-xl text-xs font-semibold uppercase tracking-widest focus:bg-orange-500/20 focus:text-orange-400 cursor-pointer">
                                            <PinOff className="h-3 w-3 mr-2" />
                                            Unpin Post
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={handleShare} className="rounded-xl text-xs font-semibold uppercase tracking-widest focus:bg-primary/20 focus:text-primary cursor-pointer">
                                        Copy Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setReportOpen(true); }} className="rounded-xl text-xs font-semibold uppercase tracking-widest focus:bg-orange-500/20 focus:text-orange-400 cursor-pointer">
                                        <Flag className="h-3 w-3 mr-2" />
                                        Report Signal
                                    </DropdownMenuItem>
                                    {currentUserId === author.id && (
                                        <DropdownMenuItem onClick={handleDelete} className="rounded-xl text-xs font-semibold uppercase tracking-widest focus:bg-red-500/20 focus:text-red-500 cursor-pointer text-red-500/80">
                                            Purge Post
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-medium tracking-tight">
                            {renderContent(post.content)}
                        </p>

                        {post.content?.trim()?.length >= 10 ? (
                            <PostAIActions postContent={post.content} />
                        ) : null}

                    {poll?.options?.length ? (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-start gap-2">
                                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <div>
                                    <div className="text-sm font-bold text-foreground">{poll.question}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {poll.totalVotes || 0} vote{(poll.totalVotes || 0) === 1 ? "" : "s"}
                                        {poll.settings?.multipleChoice ? ` - choose up to ${poll.settings.maxChoices || poll.options.length}` : ""}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {poll.options.map((option) => {
                                    const votes = option.votes || 0
                                    const totalVotes = poll.totalVotes || 0
                                    const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                                    const selected = selectedPollOptions.includes(option.id)
                                    const votedForOption = votedOptionIds.includes(option.id)

                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            disabled={hasVotedPoll}
                                            onClick={() => togglePollOption(option.id)}
                                            className={cn(
                                                "relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3 text-left text-sm transition-colors",
                                                selected && "border-primary/50 bg-primary/10",
                                                hasVotedPoll ? "cursor-default" : "hover:bg-white/5"
                                            )}
                                        >
                                            {hasVotedPoll ? (
                                                <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${percent}%` }} />
                                            ) : null}
                                            <div className="relative flex items-center justify-between gap-3">
                                                <span className="font-medium text-foreground">{option.text}</span>
                                                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                    {votedForOption ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : null}
                                                    {hasVotedPoll ? `${percent}%` : selected ? "Selected" : ""}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                            {!hasVotedPoll ? (
                                <Button
                                    size="sm"
                                    disabled={selectedPollOptions.length === 0 || votingPoll}
                                    onClick={submitPollVote}
                                    className="w-full rounded-xl"
                                >
                                    {votingPoll ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                                    Vote
                                </Button>
                            ) : (
                                <div className="text-xs font-semibold uppercase tracking-widest text-primary">You voted</div>
                            )}
                        </div>
                    ) : null}

                    <PostMediaGrid imageUrls={post.imageUrls} videoUrls={post.videoUrls} />
                </div>
            </CardContent>

            <CardFooter className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-t border-white/5 flex flex-col gap-3 sm:gap-4">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-10 px-4 gap-2 rounded-full transition-[background-color,transform,color] active:scale-95",
                                liked ? "bg-red-500/10 text-red-500" : "text-muted-foreground/60 hover:bg-white/5 hover:text-foreground"
                            )}
                            onClick={handleLike}
                        >
                            <Heart className={cn("h-4 w-4", liked && "fill-current animate-pulse")} />
                            <span className="text-xs font-semibold uppercase tracking-widest">{likesCount}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (!isDetailPage) {
                                    setShowComments(!showComments)
                                }
                            }}
                            className={cn(
                                "h-10 px-4 gap-2 rounded-full transition-colors",
                                showComments ? "bg-primary/10 text-primary" : "text-muted-foreground/60 hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-widest">{post.commentsCount || 0}</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            className="flex-1 rounded-2xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors group/btn"
                        >
                            <Share2 className="h-5 w-5 mr-3 group-hover/btn:scale-110 transition-transform" />
                            <span className="text-xs font-semibold uppercase tracking-widest">Transmit</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                        <Eye className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">{post.viewsCount || 0} Flux</span>
                    </div>
                </div>

                {showComments && !isDetailPage && (
                    <div className="w-full pt-4 space-y-6 animate-in slide-in-from-top-4 duration-500">
                        {!replyingTo && (
                            <CommentInput
                                postId={post.id}
                                parentId={null}
                                onSubmitSuccess={() => {
                                    fetchComments()
                                }}
                                authorAvatar={currentUserId === post.authorId ? author.avatar : ""}
                                currentUserId={currentUserId}
                                placeholder="Signal back..."
                            />
                        )}

                        <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 pr-2">
                            {loadingComments && commentsPage === 1 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4 opacity-30">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em]">Querying Database</span>
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-8 opacity-20 flex flex-col items-center gap-3">
                                    <MessageCircle className="h-8 w-8" />
                                    <p className="text-xs font-semibold uppercase tracking-widest leading-loose">No signals detected.<br />Be the first to interact.</p>
                                </div>
                            ) : (
                                <>
                                    {comments.map((comment) => (
                                        <CommentItem
                                            key={comment.id}
                                            comment={comment}
                                            currentUserId={currentUserId}
                                            onDelete={handleDeleteComment}
                                            onReply={(id) => setReplyingTo(id)}
                                            replyingTo={replyingTo}
                                            onCancelReply={() => setReplyingTo(null)}
                                            onSubmitReply={() => fetchComments()}
                                            postId={post.id}
                                        />
                                    ))}
                                    {hasMoreComments && (
                                        <div className="flex justify-center pt-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={loadMoreComments}
                                                disabled={loadingComments}
                                                className="text-xs font-semibold uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl"
                                            >
                                                {loadingComments ? (
                                                    <>
                                                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    `Load More Signals (${totalComments - comments.length} remaining)`
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </CardFooter>
        </Card>
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogContent onClick={(event) => event.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Report Signal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Select value={reportReason} onValueChange={(value) => setReportReason(value as ReportReason)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {REPORT_REASONS.map((reason) => (
                                <SelectItem key={reason} value={reason}>{formatReportReason(reason)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Textarea
                        value={reportDescription}
                        onChange={(event) => setReportDescription(event.target.value)}
                        maxLength={500}
                        rows={4}
                        placeholder="Optional context for moderators"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reporting}>Cancel</Button>
                    <Button onClick={handleReport} disabled={reporting}>
                        {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                        Submit Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
