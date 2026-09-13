"use client"

import { useEffect, useMemo, useState } from "react"
import { Bug, Lightbulb, Loader2, MessageSquareText, Plus, Search, Star } from "lucide-react"
import { FeedbackItem, FEEDBACK_STATUSES, FEEDBACK_TYPES, formatFeedbackStatus, formatFeedbackType, getFeedback } from "@/lib/feedback"
import { useRouter } from "@/lib/navigation"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function statusClass(status: string) {
    if (status === "SOLVED") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    if (status === "IN_PROGRESS") return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    return "bg-sky-500/10 text-sky-600 border-sky-500/20"
}

function TypeIcon({ type }: { type: string }) {
    if (type === "BUG") return <Bug className="h-4 w-4" />
    if (type === "FEATURE" || type === "IMPROVEMENT") return <Lightbulb className="h-4 w-4" />
    return <MessageSquareText className="h-4 w-4" />
}

export default function FeedbackPage() {
    const router = useRouter()
    const [items, setItems] = useState<FeedbackItem[]>([])
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("")
    const [type, setType] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const loadFeedback = async () => {
            setLoading(true)
            try {
                const data = await getFeedback({ search, status, type, limit: 30 })
                if (!cancelled) setItems(data.feedback)
            } catch (error) {
                console.error("Failed to load feedback:", error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        const timeout = window.setTimeout(loadFeedback, 200)
        return () => {
            cancelled = true
            window.clearTimeout(timeout)
        }
    }, [search, status, type])

    const solvedCount = useMemo(() => items.filter((item) => item.status === "SOLVED").length, [items])
    const commentCount = useMemo(() => items.reduce((sum, item) => sum + item.commentsCount, 0), [items])

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Feedback</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track your bug reports, ideas, improvement requests, and support notes.
                    </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/feedback/create">
                        <Plus className="h-4 w-4" />
                        Submit Feedback
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{items.length}</div><div className="text-sm text-muted-foreground">Visible items</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{solvedCount}</div><div className="text-sm text-muted-foreground">Solved</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{commentCount}</div><div className="text-sm text-muted-foreground">Comments</div></CardContent></Card>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search feedback..." className="pl-10" />
                </div>
                <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All types</option>
                    {FEEDBACK_TYPES.map((item) => <option key={item} value={item}>{formatFeedbackType(item)}</option>)}
                </select>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">All statuses</option>
                    {FEEDBACK_STATUSES.map((item) => <option key={item} value={item}>{formatFeedbackStatus(item)}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : items.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <MessageSquareText className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h2 className="text-lg font-semibold text-foreground">No feedback yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Submit the first item when something needs attention.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => (
                        <Card key={item.id} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/feedback/${item.id}`)}>
                            <CardHeader className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="line-clamp-2 flex items-center gap-2 text-xl">
                                        <TypeIcon type={item.type} />
                                        {item.subject}
                                    </CardTitle>
                                    <Badge variant="outline" className={statusClass(item.status)}>{formatFeedbackStatus(item.status)}</Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">{formatFeedbackType(item.type)}</Badge>
                                    {item.rating ? <Badge variant="outline" className="gap-1"><Star className="h-3 w-3" />{item.rating}/5</Badge> : null}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={item.user?.avatar || undefined} />
                                            <AvatarFallback>{item.user?.displayName?.[0] || item.user?.username?.[0] || "?"}</AvatarFallback>
                                        </Avatar>
                                        <span>{item.user?.displayName || item.user?.username || "Unknown"}</span>
                                    </div>
                                    <span>{item.commentsCount} comments</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
