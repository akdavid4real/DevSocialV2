"use client"

import React from 'react'
import { Zap, Target, Trophy, FileText } from 'lucide-react'

interface StatsData {
    totalXP: number
    challengesCompleted: number
    communityRank: number
    postsCreated: number
}

interface ProfileStatsProps {
    stats: StatsData
}

export default function ProfileStats({ stats }: ProfileStatsProps) {
    const statItems = [
        {
            label: 'Points',
            value: (stats?.totalXP || 0).toLocaleString(),
            icon: Zap,
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-400/10',
            suffix: 'PTS'
        },
        {
            label: 'Success Rate',
            value: stats?.challengesCompleted || 0,
            icon: Target,
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10',
            suffix: '%'
        },
        {
            label: 'Rank',
            value: `#${stats?.communityRank || 999}`,
            icon: Trophy,
            color: 'text-purple-400',
            bgColor: 'bg-purple-400/10',
            suffix: ''
        },
        {
            label: 'Broadcasts',
            value: stats?.postsCreated || 0,
            icon: FileText,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-400/10',
            suffix: ''
        }
    ]

    return (
        <div className="w-full">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                {statItems.map((item, index) => (
                    <div
                        key={index}
                        className="group relative"
                    >
                        <div className="flex flex-col space-y-2 sm:space-y-3 p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-card border-border hover:bg-card/80 transition-all duration-500">
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-2xl ${item.bgColor} flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner`}>
                                    <item.icon size={18} className={item.color} />
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                                    {item.label}
                                </span>
                            </div>

                            <div className="flex items-baseline space-x-1">
                                <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground tracking-tighter">
                                    {item.value}
                                </span>
                                {item.suffix && (
                                    <span className={`text-xs font-semibold uppercase tracking-widest ${item.color}`}>
                                        {item.suffix}
                                    </span>
                                )}
                            </div>

                            {/* Decorative underlying line */}
                            <div className="w-full h-px bg-white/5 relative overflow-hidden">
                                <div className={`absolute inset-0 w-0 group-hover:w-full transition-all duration-1000 ease-out bg-gradient-to-r from-transparent via-${item.color.split('-')[1]}-400/30 to-transparent`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
