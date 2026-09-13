import api from "@/lib/api";

export const REPORT_REASONS = ["SPAM", "HARASSMENT", "INAPPROPRIATE", "MISINFORMATION", "COPYRIGHT", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export async function createReport(input: {
    postId: string;
    reason: ReportReason;
    description?: string;
}) {
    const response = await api.post<any, ApiResponse<{ id: string }>>("/reports", input);
    return response.data;
}

export function formatReportReason(reason: string) {
    return reason.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
