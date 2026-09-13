"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, FileText, Eye, Zap, TrendingUp } from "lucide-react"
import {
  LineChart,
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts"
import {
  aggregateUserGrowth,
  calculateGrowthRate,
  fallbackOverviewSummary,
  fallbackGrowthSeries,
  toDashboardSummary,
  type DailyGrowthPoint,
} from "@/app/analytics/analytics-support"

interface DashboardSummary {
  totalUsers: number
  activeUsers: number
  blockedUsers: number
  newUsersToday: number
  totalPosts: number
  postsToday: number
  engagementRate: number
}

const trafficMix = [
  { name: "Direct", value: 42, color: "#3b82f6" },
  { name: "Social", value: 28, color: "#14b8a6" },
  { name: "Search", value: 17, color: "#f97316" },
  { name: "Referrals", value: 13, color: "#a855f7" },
]

export default function AnalyticsDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>({
    totalUsers: fallbackOverviewSummary.totalUsers,
    activeUsers: fallbackOverviewSummary.activeUsers,
    blockedUsers: fallbackOverviewSummary.blockedUsers,
    newUsersToday: fallbackOverviewSummary.newUsersToday,
    totalPosts: fallbackOverviewSummary.totalPosts,
    postsToday: fallbackOverviewSummary.postsToday,
    engagementRate: fallbackOverviewSummary.engagementRate,
  })
  const [growthData, setGrowthData] = useState<DailyGrowthPoint[]>(fallbackGrowthSeries)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    const [statsResponse, growthResponse] = await Promise.allSettled([
      api.get('/admin/dashboard/stats'),
      api.get('/admin/dashboard/user-growth', { params: { days: 30 } }),
    ])

    const statsPayload = statsResponse.status === 'fulfilled' ? (statsResponse.value.data || statsResponse.value) : null
    const parsedSummary = toDashboardSummary(statsPayload)
    if (parsedSummary) {
      setSummary(parsedSummary)
    } else {
      setSummary({
        totalUsers: fallbackOverviewSummary.totalUsers,
        activeUsers: fallbackOverviewSummary.activeUsers,
        blockedUsers: fallbackOverviewSummary.blockedUsers,
        newUsersToday: fallbackOverviewSummary.newUsersToday,
        totalPosts: fallbackOverviewSummary.totalPosts,
        postsToday: fallbackOverviewSummary.postsToday,
        engagementRate: fallbackOverviewSummary.engagementRate,
      })
    }

    const growthPayload = growthResponse.status === 'fulfilled' ? (growthResponse.value.data || growthResponse.value) : null
    const mapped = aggregateUserGrowth(growthPayload)
    setGrowthData(mapped.length > 0 ? mapped : fallbackGrowthSeries)

    setLoading(false)
  }

  const growthTrend = useMemo(() => calculateGrowthRate(growthData), [growthData])
  const blockedPercent = useMemo(
    () => Math.min(100, Math.round((summary.blockedUsers / Math.max(summary.totalUsers, 1)) * 100)),
    [summary],
  )
  const growthDelta = summary.newUsersToday > 0 ? Math.round((summary.newUsersToday / Math.max(summary.totalUsers, 1)) * 1000) / 10 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Platform-level overview with KPI snapshots and growth trend from live dashboard endpoints.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Total users</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-green-500 mt-2">+{summary.newUsersToday} today</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Active users</p>
            <p className="mt-2 text-3xl font-bold">{summary.activeUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-2">{growthDelta}% of total users online recently</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Engagement score</p>
            <p className="mt-2 text-3xl font-bold">{summary.engagementRate}%</p>
            <p className="text-xs text-muted-foreground mt-2">Based on comments-to-post ratio</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Blocked users</p>
            <p className="mt-2 text-3xl font-bold">{blockedPercent}%</p>
            <p className="text-xs text-muted-foreground mt-2">{summary.blockedUsers} suspended / deactivated</p>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">User Growth (30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="growthLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="newUsers"
                stroke="#3b82f6"
                fill="url(#growthLine)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3">
            Growth momentum: {growthTrend >= 0 ? "+" : ""}{growthTrend}%
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Traffic Mix (fallback proxy)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={trafficMix}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {trafficMix.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Fast links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <a
            href="/analytics/growth"
            className="rounded-lg border border-border p-4 hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Growth breakdown</p>
                <p className="text-xs text-muted-foreground">Daily user growth + trend details</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
          <a
            href="/analytics/content"
            className="rounded-lg border border-border p-4 hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Content analytics</p>
                <p className="text-xs text-muted-foreground">Posts, tags, and activity patterns</p>
              </div>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
          <a
            href="/analytics/users"
            className="rounded-lg border border-border p-4 hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Users analytics</p>
                <p className="text-xs text-muted-foreground">Geography and acquisition channels</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
          <a
            href="/analytics/realtime"
            className="rounded-lg border border-border p-4 hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Realtime metrics</p>
                <p className="text-xs text-muted-foreground">Simulated live counters and health</p>
              </div>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
          <a
            href="/admin/roles"
            className="rounded-lg border border-border p-4 hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Role operations</p>
                <p className="text-xs text-muted-foreground">Assign user permissions</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
          <a
            href="/admin/bots"
            className="rounded-lg border border-border p-4 hover:bg-muted/60 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Bots governance</p>
                <p className="text-xs text-muted-foreground">Registry and runtime states</p>
              </div>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
        </div>
      </Card>
    </div>
  )
}
