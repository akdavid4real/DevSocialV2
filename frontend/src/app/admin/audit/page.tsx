"use client"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, FileCode } from "lucide-react"
import { toast } from "sonner"
import { TableSkeleton } from "@/components/admin/TableSkeleton"
import { EmptyState } from "@/components/admin/EmptyState"

interface AuditLog {
  id: string
  adminId: string
  action: string
  targetType: string
  targetId: string
  reason: string | null
  createdAt: string
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { loadLogs() }, [page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/audit-logs', { params: { page, limit: 50 } })
      const data = response.data || response
      setLogs(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
    } catch (error) {
      toast.error('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('BAN') || action.includes('DELETE')) return 'bg-red-500/20 text-red-500 border-red-500/30'
    if (action.includes('UNBAN') || action.includes('APPROVED')) return 'bg-green-500/20 text-green-500 border-green-500/30'
    return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Audit Logs</h2><p className="text-sm text-muted-foreground">Track admin actions</p></div>
      {loading ? (
        <TableSkeleton rows={15} columns={5} />
      ) : logs.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={FileCode}
            title="No audit logs"
            description="No admin actions have been recorded yet. All moderation activities will appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold">Action</th>
                  <th className="text-left p-4 text-sm font-semibold">Target</th>
                  <th className="text-left p-4 text-sm font-semibold">Admin ID</th>
                  <th className="text-left p-4 text-sm font-semibold">Reason</th>
                  <th className="text-left p-4 text-sm font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium">{log.targetType}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {log.targetId.substring(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono text-muted-foreground">
                      {log.adminId.substring(0, 8)}...
                    </td>
                    <td className="p-4 text-sm text-muted-foreground max-w-md truncate">
                      {log.reason || '-'}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
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
