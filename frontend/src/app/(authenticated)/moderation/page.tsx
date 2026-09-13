"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, Loader2, Shield, ShieldX, Trash2, UserX, XCircle } from "lucide-react"
import {
    formatReportLabel,
    getModerationReports,
    ModerationReport,
    ReportAction,
    ReportStatus,
    resolveModerationReport,
} from "@/lib/moderation"
import { useAuth } from "@/contexts/auth-context"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

const FILTERS: Array<ReportStatus | "ALL"> = ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED", "ALL"]

function canModerate(role?: string) {
    const normalized = role?.toUpperCase()
    return normalized === "ADMIN" || normalized === "MODERATOR"
}

function statusClass(status: string) {
    if (status === "PENDING") return "border-amber-500/20 bg-amber-500/10 text-amber-600"
    if (status === "REVIEWED") return "border-blue-500/20 bg-blue-500/10 text-blue-600"
    if (status === "RESOLVED") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
    return "border-muted bg-muted text-muted-foreground"
}

function reasonClass(reason: string) {
    if (reason === "HARASSMENT") return "border-red-500/20 bg-red-500/10 text-red-600"
    if (reason === "SPAM") return "border-orange-500/20 bg-orange-500/10 text-orange-600"
    if (reason === "MISINFORMATION") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
    if (reason === "COPYRIGHT") return "border-blue-500/20 bg-blue-500/10 text-blue-600"
    return "border-purple-500/20 bg-purple-500/10 text-purple-600"
}

function userLabel(user?: { username?: string; displayName?: string } | null) {
    return user?.displayName || user?.username || "Unknown user"
}

export default function ModerationPage() {
    const { user } = useAuth()
    const [reports, setReports] = useState<ModerationReport[]>([])
    const [status, setStatus] = useState<ReportStatus | "ALL">("PENDING")
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState("")

    const allowed = canModerate(user?.role)

    const loadReports = async () => {
        if (!allowed) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const response = await getModerationReports({ status: status === "ALL" ? undefined : status, limit: 30 })
            setReports(response.data || [])
        } catch (error) {
            console.error("Failed to load moderation reports:", error)
            toast.error("Failed to load reports")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadReports()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, allowed])

    const counts = useMemo(() => {
        return reports.reduce<Record<string, number>>((acc, report) => {
            acc[report.status] = (acc[report.status] || 0) + 1
            return acc
        }, {})
    }, [reports])

    const handleResolve = async (report: ModerationReport, action: ReportAction, nextStatus: ReportStatus) => {
        setBusyId(report.id)
        try {
            await resolveModerationReport(report.id, {
                action,
                status: nextStatus,
                reviewNote: `Moderation action: ${formatReportLabel(action)}`,
            })
            toast.success("Report updated")
            await loadReports()
        } catch (error) {
            console.error("Failed to update report:", error)
            toast.error("Failed to update report")
        } finally {
            setBusyId("")
        }
    }

    if (!allowed) {
        return (
            <div className="mx-auto max-w-3xl">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <ShieldX className="mb-4 h-14 w-14 text-muted-foreground/40" />
                        <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
                        <p className="mt-2 text-sm text-muted-foreground">You need an admin or moderator role to review reports.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
                        <Shield className="h-7 w-7 text-primary" />
                        Moderation
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Review reported posts and apply a clear moderation action.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/reports">Admin Reports</Link>
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{reports.length}</div><div className="text-sm text-muted-foreground">Loaded</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{counts.PENDING || 0}</div><div className="text-sm text-muted-foreground">Pending</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{counts.RESOLVED || 0}</div><div className="text-sm text-muted-foreground">Resolved</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-2xl font-bold">{counts.DISMISSED || 0}</div><div className="text-sm text-muted-foreground">Dismissed</div></CardContent></Card>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                    <Button key={item} variant={status === item ? "default" : "outline"} size="sm" onClick={() => setStatus(item)}>
                        {item === "ALL" ? "All Reports" : formatReportLabel(item)}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : reports.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h2 className="text-lg font-semibold text-foreground">No reports here</h2>
                        <p className="mt-2 text-sm text-muted-foreground">There are no {status === "ALL" ? "" : formatReportLabel(status).toLowerCase()} reports to review.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <Card key={report.id}>
                            <CardHeader className="space-y-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-2">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <AlertTriangle className="h-5 w-5 text-primary" />
                                            {formatReportLabel(report.reason)}
                                        </CardTitle>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline" className={reasonClass(report.reason)}>{formatReportLabel(report.reason)}</Badge>
                                            <Badge variant="outline" className={statusClass(report.status)}>{formatReportLabel(report.status)}</Badge>
                                            <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{new Date(report.createdAt).toLocaleDateString()}</Badge>
                                        </div>
                                    </div>
                                    {report.action ? <Badge variant="secondary">{formatReportLabel(report.action)}</Badge> : null}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="space-y-3 rounded-lg border border-border p-4">
                                        <div className="text-sm font-semibold text-foreground">Reporter</div>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={report.reporter?.avatar || undefined} />
                                                <AvatarFallback>{userLabel(report.reporter)[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium text-foreground">{userLabel(report.reporter)}</div>
                                                <div className="text-xs text-muted-foreground">@{report.reporter?.username || "unknown"}</div>
                                            </div>
                                        </div>
                                        {report.description ? (
                                            <p className="rounded-md bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">{report.description}</p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No extra description was provided.</p>
                                        )}
                                    </div>

                                    <div className="space-y-3 rounded-lg border border-border p-4">
                                        <div className="text-sm font-semibold text-foreground">Reported Post</div>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={report.reportedUser?.avatar || report.reportedPost?.author?.avatar || undefined} />
                                                <AvatarFallback>{userLabel(report.reportedUser || report.reportedPost?.author)[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium text-foreground">{userLabel(report.reportedUser || report.reportedPost?.author)}</div>
                                                <div className="text-xs text-muted-foreground">@{report.reportedUser?.username || report.reportedPost?.author?.username || "unknown"}</div>
                                            </div>
                                        </div>
                                        <p className="line-clamp-4 rounded-md bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                                            {report.reportedPost?.content || "Reported post is no longer available."}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {report.reportedPost ? (
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/posts/${report.reportedPost.id}`}>Open Post</Link>
                                                </Button>
                                            ) : null}
                                            <Badge variant="secondary">Post {report.reportedPost?.status || "missing"}</Badge>
                                            {report.reportedUser?.isBlocked ? <Badge variant="destructive">User blocked</Badge> : null}
                                        </div>
                                    </div>
                                </div>

                                {report.status === "PENDING" ? (
                                    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                                        <Button variant="outline" size="sm" disabled={busyId === report.id} onClick={() => handleResolve(report, "NONE", "DISMISSED")}>
                                            <XCircle className="h-4 w-4" />
                                            Dismiss
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={busyId === report.id} onClick={() => handleResolve(report, "WARNING", "RESOLVED")}>
                                            <AlertTriangle className="h-4 w-4" />
                                            Warn
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={busyId === report.id} onClick={() => handleResolve(report, "POST_REMOVED", "RESOLVED")}>
                                            <Trash2 className="h-4 w-4" />
                                            Remove Post
                                        </Button>
                                        <Button variant="destructive" size="sm" disabled={busyId === report.id} onClick={() => handleResolve(report, "USER_BANNED", "RESOLVED")}>
                                            <UserX className="h-4 w-4" />
                                            Block User
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
