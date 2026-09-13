"use client"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Check, X, Flag } from "lucide-react"
import { toast } from "sonner"
import { TableSkeleton } from "@/components/admin/TableSkeleton"
import { EmptyState } from "@/components/admin/EmptyState"

interface Report {
  id: string
  reason: string
  description: string | null
  status: string
  createdAt: string
}

export default function ReportsManagement() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { loadReports() }, [page, statusFilter])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/reports', { params: { status: statusFilter === "ALL" ? undefined : statusFilter, page, limit: 20 } })
      const data = response.data || response
      setReports(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
    } catch (error) {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (reportId: string, action: string, status: string) => {
    try {
      await api.put(`/admin/reports/${reportId}/resolve`, { status, action, reviewNote: `Resolved: ${action}` })
      toast.success('Report resolved')
      loadReports()
    } catch (error: any) {
      toast.error(error?.error || 'Failed to resolve')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
      case 'REVIEWED': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      case 'RESOLVED': return 'bg-green-500/20 text-green-500 border-green-500/30'
      case 'DISMISSED': return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Reports Management</h2><p className="text-sm text-muted-foreground">Review user reports</p></div>
      <Card className="p-4"><Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Reports</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="REVIEWED">Reviewed</SelectItem><SelectItem value="RESOLVED">Resolved</SelectItem><SelectItem value="DISMISSED">Dismissed</SelectItem></SelectContent></Select></Card>
      {loading ? (
        <TableSkeleton rows={10} columns={5} />
      ) : reports.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Flag}
            title="No reports found"
            description={
              statusFilter === "ALL"
                ? "No user reports have been submitted yet."
                : statusFilter === "PENDING"
                ? "No pending reports. Great job keeping the platform safe!"
                : statusFilter === "RESOLVED"
                ? "No resolved reports yet."
                : statusFilter === "DISMISSED"
                ? "No dismissed reports."
                : "No reports in this category."
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold">Reason</th>
                  <th className="text-left p-4 text-sm font-semibold">Description</th>
                  <th className="text-left p-4 text-sm font-semibold">Status</th>
                  <th className="text-left p-4 text-sm font-semibold">Date</th>
                  <th className="text-right p-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-500 border border-orange-500/30">
                        {report.reason}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="max-w-md truncate text-sm">
                        {report.description || 'No description'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {report.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleResolve(report.id, 'WARNING', 'RESOLVED')}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(report.id, 'NONE', 'DISMISSED')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
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
