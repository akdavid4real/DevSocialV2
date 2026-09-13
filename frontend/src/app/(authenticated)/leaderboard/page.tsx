"use client"

import { useEffect, useState } from "react"
import { Trophy, TrendingUp, Zap, Crown, Medal, Award, Flame, Target } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import api from "@/lib/api"
import Link from "@/components/ui/link"

interface LeaderboardUser {
    id: string
    username: string
    displayName: string
    avatar: string
    level: number
    points: number
    rank?: number
}

export default function LeaderboardPage() {
    const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all')

    useEffect(() => {
        fetchLeaderboard()
    }, [period])

    const fetchLeaderboard = async () => {
        setLoading(true)
        try {
            const response = await api.get(`/users/leaderboard?period=${period}&limit=50`)
            console.log('Leaderboard response:', response)
            
            // Handle both wrapped and unwrapped responses
            const data = response.data?.data || response.data || response
            console.log('Leaderboard parsed data:', data)
            
            const users = data.users || data || []
            console.log('Parsed users:', users)
            setTopUsers(users.map((u: any, idx: number) => ({ ...u, rank: idx + 1 })))
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />
        if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
        if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
        return null
    }

    const getRankBadge = (rank: number) => {
        if (rank === 1) return "bg-gradient-to-r from-yellow-500 to-orange-500"
        if (rank === 2) return "bg-gradient-to-r from-gray-400 to-gray-500"
        if (rank === 3) return "bg-gradient-to-r from-amber-600 to-amber-700"
        return "bg-white/5"
    }

    return (
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                        <Trophy className="h-7 w-7 text-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-foreground">Leaderboard</h1>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Top Performers</p>
                    </div>
                </div>

                {/* Period Filter */}
                <div className="flex gap-2">
                    {(['all', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors ${
                                period === p
                                    ? 'bg-primary text-foreground'
                                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                            }`}
                        >
                            {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : 'This Month'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                            <Crown className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Top User</p>
                            <p className="text-lg font-bold text-foreground">{topUsers[0]?.displayName || '-'}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Top XP</p>
                            <p className="text-lg font-bold text-foreground">{topUsers[0]?.points.toLocaleString() || 0}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Target className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Total Users</p>
                            <p className="text-lg font-bold text-foreground">{topUsers.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <Flame className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Avg Level</p>
                            <p className="text-lg font-bold text-foreground">
                                {topUsers.length > 0 ? Math.round(topUsers.reduce((sum, u) => sum + u.level, 0) / topUsers.length) : 0}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Top 3 Podium */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Loading Rankings...</p>
                    </div>
                </div>
            ) : topUsers.length === 0 ? (
                <Card className="p-12 bg-card border-border text-center">
                    <Trophy className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-2">No Users Found</h3>
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">Be the first to climb the ranks</p>
                </Card>
            ) : topUsers.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* 2nd Place */}
                    <Link href={`/@${topUsers[1].username}`}>
                        <Card className="p-6 bg-gradient-to-br from-gray-400/10 to-gray-500/10 border-gray-400/20 hover:scale-105 transition-[transform] cursor-pointer">
                            <div className="flex flex-col items-center gap-3">
                                <Medal className="h-8 w-8 text-gray-400" />
                                <Avatar className="h-20 w-20 border-4 border-gray-400/30">
                                    <AvatarImage src={topUsers[1].avatar} />
                                    <AvatarFallback>{topUsers[1].displayName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-foreground">{topUsers[1].displayName}</p>
                                    <p className="text-xs text-muted-foreground">@{topUsers[1].username}</p>
                                </div>
                                <Badge className="bg-gray-400/20 text-gray-300 border-gray-400/30">
                                    Lvl {topUsers[1].level}
                                </Badge>
                                <p className="text-lg font-bold text-foreground">{topUsers[1].points.toLocaleString()} XP</p>
                            </div>
                        </Card>
                    </Link>

                    {/* 1st Place */}
                    <Link href={`/@${topUsers[0].username}`}>
                        <Card className="p-8 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:scale-105 transition-[transform] cursor-pointer">
                            <div className="flex flex-col items-center gap-4">
                                <Crown className="h-10 w-10 text-yellow-400 animate-pulse" />
                                <Avatar className="h-24 w-24 border-4 border-yellow-400/50">
                                    <AvatarImage src={topUsers[0].avatar} />
                                    <AvatarFallback>{topUsers[0].displayName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-foreground">{topUsers[0].displayName}</p>
                                    <p className="text-xs text-muted-foreground">@{topUsers[0].username}</p>
                                </div>
                                <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                                    Lvl {topUsers[0].level}
                                </Badge>
                                <p className="text-2xl font-bold text-foreground">{topUsers[0].points.toLocaleString()} XP</p>
                            </div>
                        </Card>
                    </Link>

                    {/* 3rd Place */}
                    <Link href={`/@${topUsers[2].username}`}>
                        <Card className="p-6 bg-gradient-to-br from-amber-600/10 to-amber-700/10 border-amber-600/20 hover:scale-105 transition-[transform] cursor-pointer">
                            <div className="flex flex-col items-center gap-3">
                                <Award className="h-8 w-8 text-amber-600" />
                                <Avatar className="h-20 w-20 border-4 border-amber-600/30">
                                    <AvatarImage src={topUsers[2].avatar} />
                                    <AvatarFallback>{topUsers[2].displayName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-foreground">{topUsers[2].displayName}</p>
                                    <p className="text-xs text-muted-foreground">@{topUsers[2].username}</p>
                                </div>
                                <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30">
                                    Lvl {topUsers[2].level}
                                </Badge>
                                <p className="text-lg font-bold text-foreground">{topUsers[2].points.toLocaleString()} XP</p>
                            </div>
                        </Card>
                    </Link>
                </div>
            )}

            {/* Full Leaderboard List */}
            {!loading && topUsers.length > 3 && (
                <Card className="p-6 bg-card border-border">
                    <div className="space-y-3">
                        {topUsers.slice(3).map((user) => (
                            <Link key={user.id} href={`/@${user.username}`}>
                                <div className={`flex items-center justify-between p-4 rounded-2xl ${getRankBadge(user.rank!)} hover:bg-white/10 transition-[background-color,border-color] cursor-pointer group`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 text-center">
                                            <span className="text-2xl font-bold text-foreground/50">#{user.rank}</span>
                                        </div>
                                        <Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/30 transition-[border-color]">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{user.displayName}</p>
                                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                                            Lvl {user.level}
                                        </Badge>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-foreground">{user.points.toLocaleString()}</p>
                                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">XP</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
