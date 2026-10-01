"use client"

import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "@/components/ui/link"
import api from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { aggregateUserGrowth } from "./analytics-support"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

type View = "overview" | "growth" | "users" | "content" | "realtime"
interface Stats {
    users: { total: number; active: number; blocked: number; newToday: number }
    content: { totalPosts: number; totalComments: number; postsToday: number }
    moderation: { pendingReports: number }
}
const titles: Record<View, string> = {
    overview: "Analytics Dashboard", growth: "Growth Analytics", users: "Users Analytics",
    content: "Content Analytics", realtime: "Activity Snapshot",
}

export default function BackendAnalytics({ view }: { view: View }) {
    const { user } = useAuth()
    const canReadGrowth = user?.role === "ADMIN" || user?.role === "ANALYTICS"
    const stats = useQuery({
        queryKey: ["admin", "dashboard", user?.id],
        queryFn: async () => {
            const response = await api.get<unknown, { data: Stats }>("/admin/dashboard/stats")
            return response.data
        },
        refetchInterval: view === "realtime" ? 15000 : false,
    })
    const showGrowth = view === "overview" || view === "growth" || view === "users"
    const growth = useQuery({
        queryKey: ["admin", "growth", user?.id],
        enabled: showGrowth && canReadGrowth,
        queryFn: async () => {
            const response = await api.get<unknown, { data: unknown }>("/admin/dashboard/user-growth", { params: { days: 45 } })
            return aggregateUserGrowth(response.data)
        },
    })
    const data = stats.data
    const metrics = data ? view === "content" ? [
        ["Total posts", data.content.totalPosts], ["Total comments", data.content.totalComments],
        ["Posts today", data.content.postsToday], ["Pending reports", data.moderation.pendingReports],
    ] : view === "growth" || view === "users" ? [
        ["Total users", data.users.total], ["Active users (last 7 days)", data.users.active],
        ["New users today", data.users.newToday], ["Blocked users", data.users.blocked],
    ] : [
        ["Total users", data.users.total], ["Active users (last 7 days)", data.users.active],
        ["New users today", data.users.newToday], ["Total posts", data.content.totalPosts],
        ["Posts today", data.content.postsToday], ["Total comments", data.content.totalComments],
    ] : []

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h1 className="text-2xl font-bold">{titles[view]}</h1><p className="text-sm text-muted-foreground">Metrics from the Spring backend and your existing database.</p></div>
                <Button variant="outline" onClick={() => { stats.refetch(); if (showGrowth && canReadGrowth) growth.refetch() }}>Refresh metrics</Button>
            </div>
            <nav className="flex flex-wrap gap-4 text-sm text-primary">
                <Link href="/analytics">Overview</Link><Link href="/analytics/users">Users</Link><Link href="/analytics/content">Content</Link>
                {canReadGrowth && <Link href="/analytics/growth">Growth</Link>}<Link href="/analytics/realtime">Activity snapshot</Link>
            </nav>
            {stats.isPending ? <p role="status">Loading metrics...</p>
                : stats.isError ? <p role="alert">Unable to load backend metrics. Use Refresh metrics to retry.</p>
                : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => <Card key={String(label)} className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-bold mt-2">{Number(value).toLocaleString()}</p></Card>)}</div>}
            {stats.isSuccess && <p className="text-xs text-muted-foreground">Last successful fetch: {new Date(stats.dataUpdatedAt).toLocaleTimeString()}{view === "realtime" ? ". Refreshed every 15 seconds; these are database counts, not live online presence." : ""}</p>}
            {showGrowth && (canReadGrowth ? <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Registrations by day (last 45 days)</h2>
                {growth.isPending ? <p role="status">Loading registrations...</p>
                    : growth.isError ? <p role="alert">Unable to load registration history.</p>
                    : growth.data?.length ? <ResponsiveContainer width="100%" height={280}><AreaChart data={growth.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="newUsers" name="Registrations" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} /></AreaChart></ResponsiveContainer>
                    : <p className="text-sm text-muted-foreground">No registrations in this period.</p>}
            </Card> : <p className="text-sm text-muted-foreground">Registration history requires an administrator or analytics role.</p>)}
            {(view === "overview" || view === "users" || view === "realtime") && <Card className="p-5"><h2 className="font-semibold">Metrics not collected</h2><p className="mt-2 text-sm text-muted-foreground">Traffic sources, country/device breakdowns, page visits, and live online presence are not recorded by the current backend. No estimated or demo values are displayed.</p></Card>}
        </div>
    )
}
