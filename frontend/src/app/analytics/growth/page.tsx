"use client"

import { useEffect, useMemo, useState } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from "recharts"
import { aggregateUserGrowth, fallbackGrowthSeries, type DailyGrowthPoint } from "@/app/analytics/analytics-support"

export default function AnalyticsGrowthPage() {
  const [growthSeries, setGrowthSeries] = useState<DailyGrowthPoint[]>(fallbackGrowthSeries)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSeries()
  }, [])

  const loadSeries = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/dashboard/user-growth', { params: { days: 45 } })
      const payload = response.data || response
      const mapped = aggregateUserGrowth(payload)
      setGrowthSeries(mapped.length > 0 ? mapped : fallbackGrowthSeries)
    } catch {
      setGrowthSeries(fallbackGrowthSeries)
    } finally {
      setLoading(false)
    }
  }

  const latest = useMemo(() => {
    const latestPoint = growthSeries.at(-1)
    const previousPoint = growthSeries.at(-2)
    if (!latestPoint || !previousPoint) return 0
    return Number(
      (((latestPoint.totalUsers - previousPoint.totalUsers) / Math.max(previousPoint.totalUsers, 1)) * 100).toFixed(1),
    )
  }, [growthSeries])

  const totalNewUsers = useMemo(() => growthSeries.reduce((sum, point) => sum + point.newUsers, 0), [growthSeries])

  const channelBreakdown = [
    { label: "Growth", value: growthSeries.length },
    { label: "Plateaus", value: growthSeries.filter((item) => item.newUsers <= 60).length },
    { label: "Surges", value: growthSeries.filter((item) => item.newUsers > 60).length },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Growth Analytics</h1>
        <p className="text-sm text-muted-foreground">
          User registration trend by day with summary of momentum and distribution.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">New users (45d)</p>
          <p className="text-3xl font-bold mt-2">{totalNewUsers}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Daily growth rate</p>
          <p className="text-3xl font-bold mt-2">{latest}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Current active users</p>
          <p className="text-3xl font-bold mt-2">{growthSeries.at(-1)?.activeUsers ?? 0}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">New users by day</h3>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthSeries}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="newUsers"
                stroke="#06b6d4"
                fill="url(#growthFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cumulative users</h3>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={growthSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalUsers" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Growth pacing</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={channelBreakdown}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {channelBreakdown.map((item, index) => (
                  <Cell key={item.label} fill={index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : "#f97316"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
