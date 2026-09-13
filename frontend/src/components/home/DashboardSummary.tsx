"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Eye, FileText, Heart, Loader2, MessageCircle, Trophy, Zap } from "lucide-react"
import { DashboardData, getDashboard } from "@/lib/dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "@/components/ui/link"

const PERIODS = ["week", "month", "year"] as const

function formatNumber(value: number) {
    return new Intl.NumberFormat().format(value || 0)
}

function formatDecimal(value: number) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value || 0)
}

export default function DashboardSummary() {
    const [period, setPeriod] = useState<(typeof PERIODS)[number]>("week")
    const [dashboard, setDashboard] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const loadDashboard = async () => {
            setLoading(true)
            try {
                const data = await getDashboard(period)
                if (!cancelled) setDashboard(data)
            } catch (error) {
                console.error("Failed to load dashboard summary:", error)
                if (!cancelled) setDashboard(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadDashboard()
        return () => {
            cancelled = true
        }
    }, [period])

    const activityTotal = useMemo(() => {
        return dashboard?.charts.dailyActivity.reduce((sum, item) => sum + item.totalActivities, 0) || 0
    }, [dashboard])

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    if (!dashboard) {
        return null
    }

    const stats = dashboard.stats
    const rank = dashboard.user?.rank || 0
    const points = dashboard.user?.points || stats.xp.total
    const progress = Math.min(points % 100, 100)

    return (
        <Card>
            <CardContent className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Your Dashboard</h2>
                        <p className="text-sm text-muted-foreground">Activity, reach, and XP for this {period}.</p>
                    </div>
                    <div className="flex gap-1 rounded-md bg-muted p-1">
                        {PERIODS.map((item) => (
                            <Button
                                key={item}
                                variant={period === item ? "default" : "ghost"}
                                size="sm"
                                className="h-8 px-3 text-xs capitalize"
                                onClick={() => setPeriod(item)}
                            >
                                {item}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border p-3">
                        <FileText className="mb-2 h-4 w-4 text-primary" />
                        <div className="text-xl font-bold">{formatNumber(stats.posts.totalPosts)}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <Heart className="mb-2 h-4 w-4 text-primary" />
                        <div className="text-xl font-bold">{formatNumber(stats.posts.totalLikes)}</div>
                        <div className="text-xs text-muted-foreground">Post likes</div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <MessageCircle className="mb-2 h-4 w-4 text-primary" />
                        <div className="text-xl font-bold">{formatNumber(stats.posts.totalComments)}</div>
                        <div className="text-xs text-muted-foreground">Comments</div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <Eye className="mb-2 h-4 w-4 text-primary" />
                        <div className="text-xl font-bold">{formatNumber(stats.posts.totalViews)}</div>
                        <div className="text-xs text-muted-foreground">Views</div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 font-medium"><Zap className="h-4 w-4 text-primary" />XP</span>
                            <span>{formatNumber(points)}</span>
                        </div>
                        <Progress value={progress} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm">
                        <span className="flex items-center gap-2 font-medium"><Trophy className="h-4 w-4 text-primary" />Rank</span>
                        <span>#{formatNumber(rank)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm">
                        <span className="flex items-center gap-2 font-medium"><Bell className="h-4 w-4 text-primary" />Unread</span>
                        <span>{formatNumber(stats.notifications.unreadCount)}</span>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border p-3">
                        <div className="text-xs text-muted-foreground">Avg likes/post</div>
                        <div className="mt-1 text-lg font-semibold">{formatDecimal(stats.posts.avgLikes)}</div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <div className="text-xs text-muted-foreground">Avg comments/post</div>
                        <div className="mt-1 text-lg font-semibold">{formatDecimal(stats.posts.avgComments)}</div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <div className="text-xs text-muted-foreground">Lifetime engagement</div>
                        <div className="mt-1 text-lg font-semibold">{formatDecimal(stats.posts.lifetimeAvgEngagement)}</div>
                    </div>
                </div>

                {stats.engagement.topPost && (
                    <Link
                        href={`/posts/${stats.engagement.topPost.id}`}
                        className="block rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top post</div>
                                <p className="mt-1 truncate text-sm text-foreground">
                                    {stats.engagement.topPost.content || "Media post"}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <div className="text-lg font-semibold">{formatNumber(stats.engagement.topPost.engagement)}</div>
                                <div className="text-xs text-muted-foreground">engagement</div>
                            </div>
                        </div>
                    </Link>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatNumber(activityTotal)} tracked actions</span>
                    <span>{formatNumber(stats.challenges.completed)} challenges completed</span>
                    <span>{formatNumber(stats.engagement.likesReceived)} lifetime likes received</span>
                </div>
            </CardContent>
        </Card>
    )
}
