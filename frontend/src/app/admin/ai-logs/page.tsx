"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bot, ChevronLeft, ChevronRight, Clock, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { TableSkeleton } from "@/components/admin/TableSkeleton"
import { EmptyState } from "@/components/admin/EmptyState"

type AiLogUser = {
  id: string
  username: string
  displayName: string | null
  avatar: string
}

type AiLog = {
  id: string
  service: "MISTRAL" | "GEMINI"
  aiModel: string
  taskType: string
  inputLength: number
  outputSummary: string
  userId: string | null
  success: boolean
  errorMessage: string | null
  executionTime: number
  createdAt: string
  user: AiLogUser | null
}

type AiLogStats = {
  service: "MISTRAL" | "GEMINI"
  taskType: string
  count: number
  avgExecutionTime: number
}

const TASK_FILTERS = [
  "post_summarize",
  "post_explain",
  "text_enhance_professional",
  "text_enhance_casual",
  "text_enhance_funny",
  "text_enhance_hashtags",
]

export default function AdminAiLogsPage() {
  const [logs, setLogs] = useState<AiLog[]>([])
  const [stats, setStats] = useState<AiLogStats[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [service, setService] = useState("all")
  const [taskType, setTaskType] = useState("all")

  useEffect(() => {
    loadLogs()
  }, [page, service, taskType])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const response = await api.get("/admin/ai-logs", {
        params: {
          page,
          limit: 50,
          service: service === "all" ? undefined : service,
          taskType: taskType === "all" ? undefined : taskType,
        },
      })
      const payload = response.data || response
      setLogs(payload.data || [])
      setStats(payload.stats || [])
      setTotal(payload.meta?.total || 0)
      setTotalPages(payload.meta?.totalPages || 1)
    } catch (error) {
      toast.error("Failed to load AI logs")
    } finally {
      setLoading(false)
    }
  }

  const handleServiceChange = (value: string) => {
    setService(value)
    setPage(1)
  }

  const handleTaskTypeChange = (value: string) => {
    setTaskType(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Activity Logs</h2>
          <p className="text-sm text-muted-foreground">Inspect AI helper usage, timing, and generated output summaries</p>
        </div>
        <Button variant="outline" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="mt-1 text-3xl font-bold">{total.toLocaleString()}</p>
            </div>
            <Bot className="h-8 w-8 text-primary" />
          </div>
        </Card>
        {stats.slice(0, 2).map((stat) => (
          <Card key={`${stat.service}-${stat.taskType}`} className="p-5">
            <p className="truncate text-sm font-medium">{formatTaskType(stat.taskType)}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-xs text-muted-foreground">{stat.service}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {stat.avgExecutionTime}ms avg
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <Select value={service} onValueChange={handleServiceChange}>
            <SelectTrigger className="md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              <SelectItem value="GEMINI">Gemini</SelectItem>
              <SelectItem value="MISTRAL">Mistral</SelectItem>
            </SelectContent>
          </Select>

          <Select value={taskType} onValueChange={handleTaskTypeChange}>
            <SelectTrigger className="md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All task types</SelectItem>
              {TASK_FILTERS.map((task) => (
                <SelectItem key={task} value={task}>{formatTaskType(task)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : logs.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Bot}
            title="No AI logs found"
            description="AI helper calls will appear here after users summarize, explain, or enhance content."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold">Task</th>
                  <th className="p-4 text-left text-sm font-semibold">Service</th>
                  <th className="p-4 text-left text-sm font-semibold">User</th>
                  <th className="p-4 text-left text-sm font-semibold">Input</th>
                  <th className="p-4 text-left text-sm font-semibold">Output</th>
                  <th className="p-4 text-left text-sm font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{formatTaskType(log.taskType)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={log.service === "GEMINI" ? "default" : "secondary"}>{log.service}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">{log.aiModel}</div>
                    </td>
                    <td className="p-4 text-sm">
                      {log.user ? (
                        <div>
                          <div className="font-medium">{log.user.displayName || log.user.username}</div>
                          <div className="text-xs text-muted-foreground">@{log.user.username}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{log.inputLength.toLocaleString()} chars</td>
                    <td className="max-w-md p-4 text-sm">
                      <div className="line-clamp-3">{log.outputSummary}</div>
                      {log.errorMessage ? <div className="mt-1 text-xs text-red-500">{log.errorMessage}</div> : null}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium">{log.executionTime}ms</div>
                      <Badge variant={log.success ? "outline" : "destructive"} className="mt-1">
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function formatTaskType(taskType: string) {
  return taskType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
