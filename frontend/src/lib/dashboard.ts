import api from "@/lib/api"

export interface DashboardActivity {
    id?: string
    type?: string
    description?: string
    xpEarned?: number
    createdAt: string
}

export interface DashboardData {
    user: {
        id: string
        username: string
        displayName?: string
        points: number
        level: number
        loginStreak: number
        rank: number
    } | null
    stats: {
        posts: {
            totalPosts: number
            totalLikes: number
            totalComments: number
            totalViews: number
            avgLikes: number
            avgComments: number
            lifetimePosts: number
            lifetimeLikes: number
            lifetimeComments: number
            lifetimeViews: number
            lifetimeAvgEngagement: number
        }
        engagement: {
            commentsCount: number
            likesGiven: number
            likesReceived: number
            followersCount: number
            followingCount: number
            topPost: {
                id: string
                content: string
                likesCount: number
                commentsCount: number
                viewsCount: number
                engagement: number
            } | null
        }
        xp: {
            total: number
            breakdown: Array<{ type: string; totalXP: number; count: number }>
        }
        challenges: {
            completed: number
        }
        notifications: {
            unreadCount: number
        }
    }
    charts: {
        period: string
        dailyActivity: Array<{ date: string; totalActivities: number }>
    }
    recentActivities: DashboardActivity[]
}

interface ApiResponse<T> {
    data: T
}

export async function getDashboard(period = "week") {
    const response = await api.get<unknown, ApiResponse<DashboardData | ApiResponse<DashboardData>>>("/users/dashboard", {
        params: { period },
    })
    // UsersService supplies its own data envelope inside the global response envelope.
    const payload = response.data
    const dashboard = payload && "data" in payload ? payload.data : payload
    if (!dashboard?.stats || !dashboard.charts || !Array.isArray(dashboard.charts.dailyActivity)) {
        throw new Error("Invalid dashboard response")
    }
    return dashboard
}
