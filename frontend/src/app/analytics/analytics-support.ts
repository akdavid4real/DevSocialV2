export type AdminRole = "USER" | "MODERATOR" | "ADMIN" | "ANALYTICS"

export interface DailyGrowthPoint {
  date: string
  newUsers: number
  totalUsers: number
}

export function aggregateUserGrowth(raw: unknown): DailyGrowthPoint[] {
  if (!Array.isArray(raw)) return []
  const grouped = new Map<string, number>()
  for (const item of raw as Array<Record<string, unknown>>) {
    if (typeof item.createdAt !== "string") continue
    const date = new Date(item.createdAt)
    if (!Number.isFinite(date.getTime())) continue
    const day = date.toISOString().slice(0, 10)
    const candidate = item._count
    const count = typeof candidate === "number" ? candidate
      : candidate && typeof candidate === "object" ? (candidate as { _all?: number })._all
      : typeof item.count === "number" ? item.count : undefined
    if (typeof count !== "number" || !Number.isFinite(count)) continue
    grouped.set(day, (grouped.get(day) ?? 0) + count)
  }
  let runningTotal = 0
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, newUsers]) => {
    runningTotal += newUsers
    return { date, newUsers, totalUsers: runningTotal }
  })
}

export function normalizeRole(role: string): AdminRole {
  const value = role.toUpperCase()
  return value === "ADMIN" || value === "MODERATOR" || value === "ANALYTICS" ? value : "USER"
}
