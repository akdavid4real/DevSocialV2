"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, FileText, MessageSquare, Flag, TrendingUp, UserX, FileCode, Activity } from "lucide-react"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  users: {
    total: number
    active: number
    blocked: number
    newToday: number
  }
  content: {
    totalPosts: number
    totalComments: number
    postsToday: number
  }
  moderation: {
    pendingReports: number
  }
}

// Mock data for charts - replace with real API data later
const userGrowthData = [
  { day: 'Mon', users: 45 },
  { day: 'Tue', users: 52 },
  { day: 'Wed', users: 49 },
  { day: 'Thu', users: 63 },
  { day: 'Fri', users: 58 },
  { day: 'Sat', users: 71 },
  { day: 'Sun', users: 67 },
]

const activityData = [
  { name: 'Posts', value: 245 },
  { name: 'Comments', value: 487 },
  { name: 'Likes', value: 823 },
  { name: 'Shares', value: 156 },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/dashboard/stats')
      setStats(response.data || response)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load dashboard statistics
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total.toLocaleString(),
      change: '+12%',
      icon: Users,
      description: `${stats.users.active} active (last 7 days)`,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: 'up'
    },
    {
      title: 'New Today',
      value: stats.users.newToday.toLocaleString(),
      change: '+23%',
      icon: TrendingUp,
      description: 'Registered today',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: 'up'
    },
    {
      title: 'Blocked',
      value: stats.users.blocked.toLocaleString(),
      change: '-5%',
      icon: UserX,
      description: 'Currently banned',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      trend: 'down'
    },
    {
      title: 'Total Posts',
      value: stats.content.totalPosts.toLocaleString(),
      change: '+18%',
      icon: FileText,
      description: `${stats.content.postsToday} today`,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      trend: 'up'
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Platform Overview</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Real-time platform analytics and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.title}
              className="p-6 hover:shadow-lg transition-all hover:scale-[1.02] animate-in slide-in-from-bottom duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">
                      {stat.value}
                    </h3>
                    <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-1">User Growth</h3>
            <p className="text-sm text-muted-foreground">New user registrations this week</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={userGrowthData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Activity Chart */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-1">Platform Activity</h3>
            <p className="text-sm text-muted-foreground">Engagement metrics overview</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/reports"
            className="group relative px-6 py-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="relative flex items-center justify-between mb-2">
              <Flag className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-500">
                {stats.moderation.pendingReports}
              </span>
            </div>
            <div className="relative text-sm font-medium">Review Reports</div>
            <div className="relative text-xs text-muted-foreground">Pending review</div>
          </a>

          <a
            href="/admin/users"
            className="group relative px-6 py-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="relative flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-500">
                {stats.users.total}
              </span>
            </div>
            <div className="relative text-sm font-medium">Manage Users</div>
            <div className="relative text-xs text-muted-foreground">View all users</div>
          </a>

          <a
            href="/admin/posts"
            className="group relative px-6 py-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="relative flex items-center justify-between mb-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold text-purple-500">
                {stats.content.totalPosts}
              </span>
            </div>
            <div className="relative text-sm font-medium">Moderate Content</div>
            <div className="relative text-xs text-muted-foreground">Review posts</div>
          </a>

          <a
            href="/admin/audit"
            className="group relative px-6 py-4 bg-gradient-to-br from-gray-500/10 to-slate-500/10 hover:from-gray-500/20 hover:to-slate-500/20 rounded-xl border border-gray-500/20 hover:border-gray-500/40 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="relative flex items-center justify-between mb-2">
              <FileCode className="h-5 w-5 text-gray-500" />
            </div>
            <div className="relative text-sm font-medium">Audit Logs</div>
            <div className="relative text-xs text-muted-foreground">View activity</div>
          </a>
        </div>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    </div>
  )
}
