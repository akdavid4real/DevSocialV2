"use client"

import { Flame, TrendingUp, Target } from 'lucide-react'

interface Activity {
    date: string
    count: number
}

interface ActivityHeatmapProps {
    activities: Activity[]
    loading?: boolean
}

export default function ActivityHeatmap({ activities, loading }: ActivityHeatmapProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-[32px] bg-white/[0.02] border border-white/5 animate-pulse">
                    <div className="h-32 bg-white/5 rounded" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 rounded-[24px] bg-white/[0.02] border border-white/5 animate-pulse">
                            <div className="h-16 bg-white/5 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const totalActions = activities.reduce((sum, a) => sum + a.count, 0)
    const maxCount = Math.max(...activities.map(a => a.count), 1)
    
    // Calculate streak
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    const sortedActivities = [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    for (let i = 0; i < sortedActivities.length; i++) {
        if (sortedActivities[i].count > 0) {
            tempStreak++
            if (i === 0) currentStreak = tempStreak
            longestStreak = Math.max(longestStreak, tempStreak)
        } else {
            if (i === 0) currentStreak = 0
            tempStreak = 0
        }
    }

    // Get last 8 weeks for compact view
    const weeks = 8
    const daysPerWeek = 7
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - (weeks * daysPerWeek))

    const activityMap = new Map(activities.map(a => [a.date, a.count]))

    const getIntensity = (count: number) => {
        if (count === 0) return 'bg-white/5'
        const ratio = count / maxCount
        if (ratio > 0.75) return 'bg-primary'
        if (ratio > 0.5) return 'bg-primary/70'
        if (ratio > 0.25) return 'bg-primary/40'
        return 'bg-primary/20'
    }

    const grid: { date: Date; count: number }[][] = []

    for (let week = 0; week < weeks; week++) {
        const weekData: { date: Date; count: number }[] = []
        for (let day = 0; day < daysPerWeek; day++) {
            const date = new Date(startDate)
            date.setDate(startDate.getDate() + (week * daysPerWeek) + day)
            const dateStr = date.toISOString().split('T')[0]
            const count = activityMap.get(dateStr) || 0
            weekData.push({ date, count })
        }
        grid.push(weekData)
    }

    const avgPerWeek = (totalActions / weeks).toFixed(1)
    const mostActiveDay = activities.reduce((max, a) => a.count > max.count ? a : max, { date: '', count: 0 })

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Compact Heatmap */}
            <div className="lg:col-span-2 p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Flame className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">Activity Heatmap</h4>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Last {weeks} Weeks</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-semibold text-primary">{totalActions}</div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Total Actions</div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Day labels */}
                    <div className="flex flex-col gap-1 justify-around pr-2">
                        {['Mon', 'Wed', 'Fri'].map((day) => (
                            <div key={day} className="text-[8px] font-semibold text-muted-foreground/60 uppercase tracking-wider h-3 flex items-center">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Heatmap grid */}
                    <div className="flex-1 flex gap-1">
                        {grid.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex-1 flex flex-col gap-1">
                                {week.map((day, dayIndex) => {
                                    const intensity = getIntensity(day.count)
                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`aspect-square rounded-sm ${intensity} hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group relative`}
                                            title={`${day.date.toLocaleDateString()}: ${day.count} actions`}
                                        >
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-foreground text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                {day.count} on {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="h-3 w-3 rounded-sm bg-white/5" />
                            <div className="h-3 w-3 rounded-sm bg-primary/20" />
                            <div className="h-3 w-3 rounded-sm bg-primary/40" />
                            <div className="h-3 w-3 rounded-sm bg-primary/70" />
                            <div className="h-3 w-3 rounded-sm bg-primary" />
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
                {/* Current Streak */}
                <div className="p-5 rounded-[24px] bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                    <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Flame className="h-5 w-5 text-orange-400" />
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-semibold text-orange-400">{currentStreak}</div>
                            <div className="text-xs font-semibold uppercase tracking-widest text-orange-400/50">Days</div>
                        </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400/70">Current Streak</div>
                    {longestStreak > currentStreak && (
                        <div className="text-xs font-semibold text-muted-foreground/60 mt-1">Best: {longestStreak} days</div>
                    )}
                </div>

                {/* Weekly Average */}
                <div className="p-5 rounded-[24px] bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                    <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-semibold text-blue-400">{avgPerWeek}</div>
                            <div className="text-xs font-semibold uppercase tracking-widest text-blue-400/50">Per Week</div>
                        </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400/70">Weekly Average</div>
                </div>

                {/* Most Active Day */}
                <div className="p-5 rounded-[24px] bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Target className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-semibold text-purple-400">{mostActiveDay.count}</div>
                            <div className="text-xs font-semibold uppercase tracking-widest text-purple-400/50">Actions</div>
                        </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400/70">Best Day</div>
                    {mostActiveDay.date && (
                        <div className="text-xs font-semibold text-muted-foreground/60 mt-1">
                            {new Date(mostActiveDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
