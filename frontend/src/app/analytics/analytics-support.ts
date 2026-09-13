export type AdminRole = "USER" | "MODERATOR" | "ADMIN" | "ANALYTICS"

export interface DailyGrowthPoint {
  date: string
  newUsers: number
  totalUsers: number
  growthRate?: number
  activeUsers?: number
}

export interface DailyOverviewPoint {
  day: string
  users: number
}

export interface ContentTag {
  tag: string
  value: number
}

export interface TopPage {
  page: string
  views: number
  users: number
}

export interface ContentChannel {
  name: string
  value: number
  users?: number
}

export interface RealtimeMetric {
  activeUsers: number
  pageViews: number
  newPosts: number
  newComments: number
  likes: number
  shares: number
  country: number
  device: number
}

export interface AnalyticsOverviewData {
  totalUsers: number
  activeUsers: number
  totalPosts: number
  engagementRate: number
  blockedUsers: number
  newUsersToday: number
  postsToday: number
  dailyActiveUsers?: number
  weeklyActiveUsers?: number
  weeklyRetention?: number
}

export interface AnalyticsContentData {
  posts: number
  comments: number
  avgEngagementRate: number
  moderated: number
  topTags: ContentTag[]
  contentVolume: DailyGrowthPoint[]
  topics: ContentChannel[]
}

export interface AnalyticsUserData {
  trends: DailyGrowthPoint[]
  countries: { country: string; users: number; percentage: number }[]
  acquisitionChannels: { source: string; users: number; percentage: number }[]
}

export interface AdminBotRecord {
  id: string
  username: string
  personality: "FRIENDLY" | "TECHNICAL" | "CASUAL" | "PROFESSIONAL"
  commentFrequency: number
  status: "running" | "stopped"
  comments: number
  replies: number
}

export const fallbackBotData: AdminBotRecord[] = [
  {
    id: "bot-admin-1",
    username: "mod-ally",
    personality: "FRIENDLY",
    commentFrequency: 12,
    status: "running",
    comments: 1840,
    replies: 640,
  },
  {
    id: "bot-admin-2",
    username: "code-nudge",
    personality: "TECHNICAL",
    commentFrequency: 8,
    status: "running",
    comments: 1290,
    replies: 418,
  },
  {
    id: "bot-admin-3",
    username: "community-helper",
    personality: "PROFESSIONAL",
    commentFrequency: 4,
    status: "stopped",
    comments: 560,
    replies: 220,
  },
  {
    id: "bot-admin-4",
    username: "snippet-buddy",
    personality: "CASUAL",
    commentFrequency: 16,
    status: "running",
    comments: 940,
    replies: 312,
  },
]

export const fallbackOverviewSummary: AnalyticsOverviewData = {
  totalUsers: 15420,
  activeUsers: 3240,
  totalPosts: 892,
  engagementRate: 68.5,
  blockedUsers: 17,
  newUsersToday: 125,
  postsToday: 54,
  dailyActiveUsers: 1180,
  weeklyActiveUsers: 2730,
  weeklyRetention: 73.4,
}

export const fallbackGrowthSeries: DailyGrowthPoint[] = [
  { date: "Jan 1", newUsers: 45, totalUsers: 1200, activeUsers: 312 },
  { date: "Jan 8", newUsers: 80, totalUsers: 1285, activeUsers: 348 },
  { date: "Jan 15", newUsers: 72, totalUsers: 1357, activeUsers: 390 },
  { date: "Jan 22", newUsers: 88, totalUsers: 1445, activeUsers: 410 },
  { date: "Jan 29", newUsers: 91, totalUsers: 1536, activeUsers: 450 },
]

export const fallbackContentData: AnalyticsContentData = {
  posts: 892,
  comments: 2140,
  avgEngagementRate: 6.7,
  moderated: 34,
  topTags: [
    { tag: "javascript", value: 245 },
    { tag: "react", value: 182 },
    { tag: "typescript", value: 140 },
    { tag: "nestjs", value: 112 },
    { tag: "devops", value: 86 },
  ],
  contentVolume: [
    { date: "Mon", newUsers: 22, totalUsers: 320 },
    { date: "Tue", newUsers: 35, totalUsers: 355 },
    { date: "Wed", newUsers: 41, totalUsers: 396 },
    { date: "Thu", newUsers: 28, totalUsers: 424 },
    { date: "Fri", newUsers: 55, totalUsers: 479 },
    { date: "Sat", newUsers: 62, totalUsers: 541 },
    { date: "Sun", newUsers: 47, totalUsers: 588 },
  ],
  topics: [
    { name: "Blog", value: 36 },
    { name: "Guides", value: 24 },
    { name: "Projects", value: 18 },
    { name: "Challenges", value: 12 },
    { name: "Q&A", value: 10 },
  ],
}

export const fallbackUserData: AnalyticsUserData = {
  trends: [
    { date: "Feb 01", newUsers: 210, totalUsers: 11200, activeUsers: 3900 },
    { date: "Feb 08", newUsers: 250, totalUsers: 11450, activeUsers: 4020 },
    { date: "Feb 15", newUsers: 196, totalUsers: 11646, activeUsers: 4090 },
    { date: "Feb 22", newUsers: 233, totalUsers: 11879, activeUsers: 4180 },
    { date: "Mar 01", newUsers: 266, totalUsers: 12145, activeUsers: 4270 },
    { date: "Mar 08", newUsers: 289, totalUsers: 12434, activeUsers: 4335 },
  ],
  countries: [
    { country: "United States", users: 456, percentage: 32 },
    { country: "United Kingdom", users: 234, percentage: 16 },
    { country: "Germany", users: 189, percentage: 13 },
    { country: "Canada", users: 156, percentage: 11 },
    { country: "Nigeria", users: 143, percentage: 10 },
  ],
  acquisitionChannels: [
    { source: "Organic Search", users: 3420, percentage: 35 },
    { source: "Social Media", users: 2890, percentage: 29 },
    { source: "Direct", users: 2340, percentage: 24 },
    { source: "Referrals", users: 1890, percentage: 12 },
  ],
}

export const fallbackRealtimeMetrics: RealtimeMetric = {
  activeUsers: 186,
  pageViews: 1240,
  newPosts: 12,
  newComments: 28,
  likes: 44,
  shares: 19,
  country: 8,
  device: 24,
}

export const fallbackTopPages: TopPage[] = [
  { page: "/feed", views: 2340, users: 1890 },
  { page: "/projects", views: 1890, users: 1456 },
  { page: "/knowledge-bank", views: 1560, users: 1234 },
  { page: "/referrals", views: 890, users: 678 },
  { page: "/challenges", views: 567, users: 445 },
]

export const fallbackDeviceDistribution: ContentChannel[] = [
  { name: "Desktop", value: 45 },
  { name: "Mobile", value: 38 },
  { name: "Tablet", value: 17 },
]

export function aggregateUserGrowth(
  raw: unknown,
): DailyGrowthPoint[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const grouped = new Map<string, number>()

  for (const item of raw as Array<Record<string, unknown>>) {
    const createdAt = typeof item.createdAt === "string" ? item.createdAt : null
    const day = createdAt ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null
    const count = extractGrowthCount(item)
    if (!day) continue
    grouped.set(day, (grouped.get(day) ?? 0) + count)
  }

  if (grouped.size === 0) {
    return []
  }

  let runningTotal = 0
  const sorted = [...grouped.entries()].sort((a, b) => {
    const dateA = Date.parse(a[0])
    const dateB = Date.parse(b[0])
    return Number.isFinite(dateA) && Number.isFinite(dateB) ? dateA - dateB : 0
  })

  return sorted.map(([date, newUsers]) => {
    runningTotal += newUsers
    return {
      date,
      newUsers,
      totalUsers: runningTotal,
      activeUsers: Math.max(0, Math.round(runningTotal * 0.25)),
    }
  })
}

export function toDashboardSummary(raw: unknown): {
  totalUsers: number
  activeUsers: number
  blockedUsers: number
  newUsersToday: number
  totalPosts: number
  postsToday: number
  engagementRate: number
} | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as {
    users?: { total?: number; active?: number; blocked?: number; newToday?: number }
    content?: { totalPosts?: number; postsToday?: number; totalComments?: number }
  }
  if (!value.users || !value.content) return null

  const users = value.users
  const content = value.content
  const totalUsers = users.total ?? 0
  const totalPosts = content.totalPosts ?? 0
  const totalComments = content.totalComments ?? Math.round(totalPosts * 2.4)
  const engagementRate =
    totalPosts > 0
      ? Number(((totalComments / Math.max(1, totalPosts)) * 100).toFixed(1))
      : 0

  return {
    totalUsers,
    activeUsers: users.active ?? 0,
    blockedUsers: users.blocked ?? 0,
    newUsersToday: users.newToday ?? 0,
    totalPosts,
    postsToday: content.postsToday ?? 0,
    engagementRate,
  }
}

export function calculateGrowthRate(points: DailyGrowthPoint[]): number {
  if (points.length < 2) return 0
  const latest = points[points.length - 1]
  const previous = points[points.length - 2]
  if (!previous.totalUsers || previous.totalUsers <= 0) return 0
  return Number(
    (((latest.totalUsers - previous.totalUsers) / previous.totalUsers) * 100).toFixed(1),
  )
}

function extractGrowthCount(item: Record<string, unknown>): number {
  const countCandidate = item._count
  if (typeof countCandidate === "number") return Number.isFinite(countCandidate) ? countCandidate : 0
  if (typeof countCandidate === "object" && countCandidate !== null) {
    const countValue = (countCandidate as { _all?: unknown })._all
    return typeof countValue === "number" ? countValue : 0
  }

  if (typeof (item as { count?: unknown }).count === "number") {
    return (item as { count: number }).count
  }

  return 0
}

export function normalizeRole(role: string): AdminRole {
  const upperRole = role.toUpperCase()
  switch (upperRole) {
    case "ADMIN":
    case "MODERATOR":
    case "ANALYTICS":
      return upperRole
    default:
      return "USER"
  }
}
