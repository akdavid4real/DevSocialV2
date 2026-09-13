"use client"

import React from 'react'
import { MessageCircle, Heart, UserPlus, FileText, Award, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
    id: string
    type: 'POST_CREATED' | 'COMMENT_CREATED' | 'LIKE_GIVEN' | 'USER_FOLLOWED' | 'BADGE_EARNED' | 'LEVEL_UP' | 'QUALITY_BONUS'
    description: string
    metadata?: any
    xpEarned: number
    createdAt: string
}

interface ActivityFeedProps {
    activities: Activity[]
    loading?: boolean
}

const activityConfig = {
    POST_CREATED: {
        icon: FileText,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        label: 'Posted',
    },
    COMMENT_CREATED: {
        icon: MessageCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        label: 'Commented',
    },
    LIKE_GIVEN: {
        icon: Heart,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
        label: 'Liked',
    },
    USER_FOLLOWED: {
        icon: UserPlus,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        label: 'Followed',
    },
    BADGE_EARNED: {
        icon: Award,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        label: 'Achievement',
    },
    LEVEL_UP: {
        icon: TrendingUp,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        label: 'Level Up',
    },
    QUALITY_BONUS: {
        icon: Award,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        label: 'Quality Bonus',
    },
}

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 animate-pulse">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-white/5" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-white/5 rounded w-3/4" />
                                <div className="h-3 bg-white/5 rounded w-1/2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (!activities || activities.length === 0) {
        return (
            <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">No Activity Yet</h4>
                <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">Start engaging to see your activity here</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {activities.map((activity) => {
                const config = activityConfig[activity.type] || activityConfig.POST_CREATED
                const Icon = config.icon
                const isReply = activity.metadata?.isReply
                const authorUsername = activity.metadata?.authorUsername

                return (
                    <div
                        key={activity.id}
                        className={`group p-6 rounded-[32px] bg-white/[0.02] border ${config.borderColor} hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-full ${config.bgColor} border ${config.borderColor} flex items-center justify-center shrink-0`}>
                                <Icon className={`h-6 w-6 ${config.color}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${config.color}`}>
                                                {config.label}
                                            </span>
                                            {isReply && (
                                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                                    Reply
                                                </span>
                                            )}
                                            {authorUsername && (
                                                <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                                    @{authorUsername}'s post
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4 rounded-[20px] bg-white/[0.02] border border-white/5">
                                            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                                                {activity.description}
                                            </p>
                                        </div>
                                    </div>

                                    {activity.xpEarned > 0 && (
                                        <div className="px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 shrink-0">
                                            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                                                +{activity.xpEarned} XP
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground/60 uppercase tracking-widest">
                                    <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                                    {activity.metadata?.postId && (
                                        <a
                                            href={`/posts/${activity.metadata.postId}`}
                                            className="hover:text-primary transition-colors flex items-center gap-1"
                                        >
                                            View Post →
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
