"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Bot, Search, ToggleLeft, RefreshCcw, AlertTriangle } from "lucide-react"
import {
  fallbackBotData,
  type AdminBotRecord,
} from "@/app/analytics/analytics-support"
import api from "@/lib/api"
import { EmptyState } from "@/components/admin/EmptyState"

export default function AdminBotsPage() {
  const [bots, setBots] = useState<AdminBotRecord[]>(fallbackBotData)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    loadBots()
  }, [])

  const loadBots = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/bots')
      const payload = response.data || response
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : null

      if (Array.isArray(list)) {
        setBots(
          list.map((item: Partial<AdminBotRecord>) => ({
            id: item.id || `bot-${Math.random().toString(36).slice(2)}`,
            username: item.username || "unknown-bot",
            personality: (item.personality as AdminBotRecord["personality"]) || "FRIENDLY",
            commentFrequency: Number(item.commentFrequency ?? 0),
            status: item.status === "stopped" ? "stopped" : "running",
            comments: Number(item.comments ?? 0),
            replies: Number(item.replies ?? 0),
          })),
        )
        setIsFallback(false)
      } else {
        setBots(fallbackBotData)
        setIsFallback(true)
      }
      setLastSync(new Date().toLocaleTimeString())
    } catch {
      setBots(fallbackBotData)
      setIsFallback(true)
      setLastSync(new Date().toLocaleTimeString())
    } finally {
      setLoading(false)
    }
  }

  const filteredBots = useMemo(
    () =>
      bots.filter((bot) =>
        `${bot.username} ${bot.personality}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [bots, search],
  )

  const runningCount = bots.filter((bot) => bot.status === "running").length

  const handleToggle = (id: string) => {
    setBots((prev) =>
      prev.map((bot) =>
        bot.id === id
          ? { ...bot, status: bot.status === "running" ? "stopped" : "running" }
          : bot,
      ),
    )
    toast.info("Bot state updated in UI only. API action is not yet wired.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Bots</h1>
        <p className="text-sm text-muted-foreground">
          Bot registry and health metrics for community automation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total bots</p>
          <p className="text-2xl font-semibold mt-2">{bots.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Running</p>
          <p className="text-2xl font-semibold mt-2">{runningCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Stopped</p>
          <p className="text-2xl font-semibold mt-2">{bots.length - runningCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Last sync</p>
          <p className="text-sm text-muted-foreground mt-2">
            {lastSync || "Not synced yet"}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
              }}
              placeholder="Search bots by username or personality"
              className="pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={loadBots}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reload
          </Button>
        </div>
      </Card>

      {isFallback ? (
        <Card className="border border-amber-500/40 bg-amber-500/5">
          <div className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <p className="text-sm text-amber-500/90">
              Live bot endpoint is not available yet. Showing fallback bot registry and simulation controls.
            </p>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading bot registry...</Card>
      ) : filteredBots.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Bot}
            title="No bots found"
            description="Try another search term."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Bot</th>
                  <th className="text-left p-4 font-semibold">Personality</th>
                  <th className="text-left p-4 font-semibold">Comment freq/day</th>
                  <th className="text-left p-4 font-semibold">Activity</th>
                  <th className="text-right p-4 font-semibold">Runtime</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBots.map((bot) => (
                  <tr key={bot.id}>
                    <td className="p-4">
                      <p className="font-medium">@{bot.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {bot.comments} comments / {bot.replies} replies
                      </p>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{bot.personality}</Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">{bot.commentFrequency}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-muted-foreground">
                        {bot.comments + bot.replies} actions total
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className={`text-xs font-medium ${bot.status === "running" ? "text-green-500" : "text-muted-foreground"}`}
                        >
                          {bot.status}
                        </span>
                        <ToggleLeft className="h-4 w-4" />
                        <Switch
                          checked={bot.status === "running"}
                          onCheckedChange={() => handleToggle(bot.id)}
                          aria-label={`Toggle ${bot.username}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
