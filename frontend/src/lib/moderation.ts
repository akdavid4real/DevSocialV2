import api from "@/lib/api"

export type ReportStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED"
export type ReportAction = "NONE" | "WARNING" | "POST_REMOVED" | "USER_SUSPENDED" | "USER_BANNED"

export interface ModerationUser {
    id: string
    username: string
    displayName?: string
    avatar?: string
    level?: number
    isBlocked?: boolean
}

export interface ModerationPost {
    id: string
    content: string
    status: string
    createdAt: string
    author?: ModerationUser | null
}

export interface ModerationReport {
    id: string
    reporterId: string
    reportedPostId: string
    reportedUserId: string
    reason: string
    description?: string | null
    status: ReportStatus
    action?: ReportAction | null
    createdAt: string
    reviewedAt?: string | null
    reporter?: ModerationUser | null
    reportedUser?: ModerationUser | null
    reportedPost?: ModerationPost | null
}

interface ApiResponse<T> {
    data: T
    meta?: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

export async function getModerationReports(params?: { status?: string; page?: number; limit?: number }) {
    const response = await api.get<any, { data: ApiResponse<ModerationReport[]> }>("/admin/reports", {
        params: {
            status: params?.status || undefined,
            page: params?.page || 1,
            limit: params?.limit || 20,
        },
    })

    return response.data
}

export async function resolveModerationReport(reportId: string, input: {
    status: ReportStatus
    action: ReportAction
    reviewNote?: string
}) {
    const response = await api.put<any, { data: ModerationReport }>(`/admin/reports/${reportId}/resolve`, input)
    return response.data
}

export function formatReportLabel(value: string) {
    return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}
