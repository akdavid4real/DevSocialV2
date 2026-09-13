"use client"

import { useCallback, useEffect, useState } from "react"
import { Hash, Loader2, Zap } from "lucide-react"
import { useParams } from "@/lib/navigation"
import api from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PostCard from "@/components/home/PostCard"
import { useAuth } from "@/contexts/auth-context"

interface TagFeedResponse {
    tag: {
        name: string
        slug: string
        usageCount: number
        description?: string | null
        color?: string
    }
    posts: any[]
    total: number
    page: number
    lastPage: number
}

export default function TagPage() {
    const params = useParams()
    const tagName = String(params.tagName || "")
    const { user } = useAuth()
    const [data, setData] = useState<TagFeedResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState("")

    const fetchTagPosts = useCallback(async (page = 1) => {
        if (!tagName) return

        try {
            if (page === 1) {
                setLoading(true)
            } else {
                setLoadingMore(true)
            }

            const response = await api.get<any, TagFeedResponse>(`/posts/tag/${encodeURIComponent(tagName)}?page=${page}&limit=10`)
            setData((previous) => {
                if (page === 1 || !previous) return response
                return {
                    ...response,
                    posts: [...previous.posts, ...response.posts],
                }
            })
            setError("")
        } catch (err: any) {
            setError(err?.error || err?.message || "Failed to load tag feed")
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [tagName])

    useEffect(() => {
        fetchTagPosts(1)
    }, [fetchTagPosts])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
                <p className="text-muted-foreground animate-pulse">Loading tagged posts...</p>
            </div>
        )
    }

    const posts = data?.posts || []
    const tag = data?.tag
    const totalEngagement = posts.reduce((sum, post) => sum + (post.likesCount || 0) + (post.commentsCount || 0), 0)
    const canLoadMore = data ? data.page < data.lastPage : false

    return (
        <div className="mx-auto max-w-[650px] space-y-5">
            <Card className="overflow-hidden border-border bg-card">
                <CardHeader className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Hash className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="truncate text-2xl font-bold text-foreground">
                                #{tag?.name || tagName}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {data?.total || 0} posts · {totalEngagement} engagements
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{tag?.usageCount || 0} uses</Badge>
                        {tag?.description && <Badge variant="secondary">{tag.description}</Badge>}
                    </div>
                </CardHeader>
            </Card>

            {error && (
                <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
                </Card>
            )}

            {posts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Hash className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h2 className="text-lg font-semibold text-foreground">No posts found</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            No active posts have been tagged with #{tagName} yet.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-5">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} currentUserId={user?.id} />
                    ))}
                </div>
            )}

            {canLoadMore && (
                <div className="flex justify-center py-4">
                    <button
                        type="button"
                        onClick={() => fetchTagPosts((data?.page || 1) + 1)}
                        disabled={loadingMore}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                    >
                        {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Load more
                    </button>
                </div>
            )}
        </div>
    )
}
