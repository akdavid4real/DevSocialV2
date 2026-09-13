"use client"

import { FormEvent, useEffect, useState } from "react"
import { ArrowLeft, Loader2, MessageSquareText, Send, Star } from "lucide-react"
import { createFeedbackComment, FeedbackItem, formatFeedbackStatus, formatFeedbackType, getFeedbackItem } from "@/lib/feedback"
import { useParams } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

function statusClass(status: string) {
    if (status === "SOLVED") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    if (status === "IN_PROGRESS") return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    return "bg-sky-500/10 text-sky-600 border-sky-500/20"
}

export default function FeedbackDetailPage() {
    const { id } = useParams() as { id?: string }
    const [feedback, setFeedback] = useState<FeedbackItem | null>(null)
    const [comment, setComment] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!id) return
        setLoading(true)
        getFeedbackItem(id)
            .then(setFeedback)
            .catch((error) => {
                console.error("Failed to load feedback:", error)
                setFeedback(null)
            })
            .finally(() => setLoading(false))
    }, [id])

    const submitComment = async (event: FormEvent) => {
        event.preventDefault()
        if (!id || !comment.trim()) return

        setError("")
        setSaving(true)
        try {
            const created = await createFeedbackComment(id, comment)
            setFeedback((current) => current
                ? {
                    ...current,
                    commentsCount: current.commentsCount + 1,
                    comments: [...(current.comments || []), created],
                }
                : current)
            setComment("")
        } catch (error: any) {
            setError(error?.message || "Failed to add comment")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!feedback) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 text-center">
                <MessageSquareText className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <h1 className="text-2xl font-bold text-foreground">Feedback not found</h1>
                <Button asChild><Link href="/feedback">Back to feedback</Link></Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <Button variant="ghost" asChild className="px-0">
                <Link href="/feedback">
                    <ArrowLeft className="h-4 w-4" />
                    Back to feedback
                </Link>
            </Button>

            <Card>
                <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{formatFeedbackType(feedback.type)}</Badge>
                        <Badge variant="outline" className={statusClass(feedback.status)}>{formatFeedbackStatus(feedback.status)}</Badge>
                        {feedback.rating ? <Badge variant="outline" className="gap-1"><Star className="h-3 w-3" />{feedback.rating}/5</Badge> : null}
                    </div>
                    <CardTitle className="text-2xl">{feedback.subject}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={feedback.user?.avatar || undefined} />
                            <AvatarFallback>{feedback.user?.displayName?.[0] || feedback.user?.username?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <span>{feedback.user?.displayName || feedback.user?.username || "Unknown"}</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{feedback.description}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {(feedback.comments || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No comments yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {(feedback.comments || []).map((item) => (
                                <div key={item.id} className="rounded-md border border-border p-4">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={item.user?.avatar || undefined} />
                                                <AvatarFallback>{item.user?.displayName?.[0] || item.user?.username?.[0] || "?"}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium text-foreground">{item.user?.displayName || item.user?.username || "Unknown"}</span>
                                        </div>
                                        {item.isAdminComment && <Badge variant="secondary">Staff</Badge>}
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.content}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <form onSubmit={submitComment} className="space-y-3">
                        <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={1000} placeholder="Add a follow-up comment..." />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" disabled={saving || !comment.trim()}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Comment
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
