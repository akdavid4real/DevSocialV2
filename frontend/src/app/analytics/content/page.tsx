"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fallbackContentData,
  type AnalyticsContentData,
} from "@/app/analytics/analytics-support"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function AnalyticsContentPage() {
  const [contentData, setContentData] = useState<AnalyticsContentData>(fallbackContentData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/dashboard/stats')
      const payload = response.data || response
      if (payload?.users && payload?.content) {
        setContentData((previous) => ({
          ...previous,
          posts: payload.content.totalPosts ?? previous.posts,
          comments: payload.content.totalComments ?? previous.comments,
        }))
      }
    } catch {
      setContentData(fallbackContentData)
    } finally {
      setLoading(false)
    }
  }

  const channelColors = ["#3b82f6", "#14b8a6", "#f97316", "#a855f7", "#ef4444"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Content engagement and post activity view with fallback data where API coverage is partial.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Total posts</p>
            <p className="text-3xl font-bold mt-2">{contentData.posts.toLocaleString()}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Total comments</p>
            <p className="text-3xl font-bold mt-2">{contentData.comments.toLocaleString()}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Moderation touches</p>
            <p className="text-3xl font-bold mt-2">{contentData.moderated}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Engagement rate</p>
            <p className="text-3xl font-bold mt-2">{contentData.avgEngagementRate}%</p>
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top tags</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={contentData.topTags}
                dataKey="value"
                nameKey="tag"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {contentData.topTags.map((entry, index) => (
                  <Cell key={entry.tag} fill={channelColors[index % channelColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Topics by contribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={contentData.topics}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Weekly content volume</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={contentData.contentVolume}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="newUsers"
              name="Items"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="totalUsers"
              name="Cumulative"
              stroke="#ef4444"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
