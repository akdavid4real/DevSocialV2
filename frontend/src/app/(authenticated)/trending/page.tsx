"use client"

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Flame, Heart, Eye, Loader2, Hash, User as UserIcon } from 'lucide-react'
import PostCard from '@/components/home/PostCard'
import { useAuth } from '@/contexts/auth-context'
import api from '@/lib/api'
import Link from '@/components/ui/link'
import Image from '@/components/ui/image'

interface TrendingPost {
    id: string
    author: {
        id: string
        username: string
        displayName: string
        avatar: string
        level: number
    }
    content: string
    imageUrls?: string[]
    videoUrls?: string[]
    likesCount: number
    commentsCount: number
    createdAt: string
    isLiked?: boolean
}

interface TrendingTopic {
    tag: string
    posts: number
    growth?: string
}

interface TrendingUser {
    id: string
    username: string
    displayName: string
    avatar: string
    level: number
    points: number
    postsCount: number
}

interface TrendingStats {
    hotPosts: number
    totalViews: string
    engagements: string
}

export default function TrendingPage() {
    const { user: currentUser } = useAuth()
    const [activeTab, setActiveTab] = useState('posts')
    const [timeFilter, setTimeFilter] = useState('today')
    const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([])
    const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
    const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([])
    const [stats, setStats] = useState<TrendingStats>({
        hotPosts: 0,
        totalViews: '0',
        engagements: '0'
    })
    const [loading, setLoading] = useState(true)

    const fetchTrendingData = useCallback(async () => {
        setLoading(true)
        console.log('[TRENDING] Fetching data for:', timeFilter)
        try {
            const response: any = await api.get(`/trending?period=${timeFilter}`)
            console.log('[TRENDING] Response:', response)
            
            // Handle both wrapped and unwrapped responses
            const data = response.data?.data || response.data || response
            console.log('[TRENDING] Parsed data:', data)
            
            setTrendingPosts(data.trendingPosts || [])
            setTrendingTopics(data.trendingTopics || [])
            setTrendingUsers(data.risingUsers || [])
            setStats(data.stats || stats)
        } catch (error) {
            console.error('[TRENDING] Error:', error)
        } finally {
            setLoading(false)
        }
    }, [timeFilter])

    useEffect(() => {
        fetchTrendingData()
    }, [timeFilter, fetchTrendingData])

    return (
        <div className="max-w-[1200px] mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <TrendingUp className="h-8 w-8 text-foreground" />
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-bold uppercase tracking-tighter text-foreground mb-2">Trending</h1>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                        What's hot in the community
                    </p>
                </div>
            </div>

            {/* Time Filter */}
            <div className="flex justify-center">
                <div className="flex gap-2 p-2 rounded-[20px] bg-white/[0.02] border border-white/5">
                    {['today', 'week', 'month'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTimeFilter(filter)}
                            className={`px-6 py-2 rounded-[16px] text-xs font-semibold uppercase tracking-widest transition-[background-color,color] ${
                                timeFilter === filter
                                    ? 'bg-primary text-foreground'
                                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5'
                            }`}
                        >
                            {filter === 'today' ? 'Today' : `This ${filter}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { icon: Flame, label: 'Hot Posts', value: stats.hotPosts, color: 'from-orange-500 to-red-500' },
                    { icon: Eye, label: 'Total Views', value: stats.totalViews, color: 'from-blue-500 to-cyan-500' },
                    { icon: Heart, label: 'Engagements', value: stats.engagements, color: 'from-pink-500 to-rose-500' },
                ].map((stat) => (
                    <div key={stat.label} className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                <stat.icon className="h-5 w-5 text-foreground" />
                            </div>
                            <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <nav className="flex items-center gap-6 border-b border-white/5 pb-4">
                {[
                    { id: 'posts', label: 'Trending Posts', count: trendingPosts.length },
                    { id: 'topics', label: 'Hot Topics', count: trendingTopics.length },
                    { id: 'users', label: 'Rising Stars', count: trendingUsers.length },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative py-2 text-sm font-semibold tracking-widest uppercase transition-colors flex items-center gap-2 ${
                            activeTab === tab.id ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                                {tab.count}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                        )}
                    </button>
                ))}
            </nav>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Trending Posts */}
                    {activeTab === 'posts' && (
                        <div className="space-y-6">
                            {trendingPosts.length === 0 ? (
                                <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed text-center">
                                    <Flame className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-2">
                                        No Trending Posts
                                    </h3>
                                    <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">
                                        Check back later for hot content
                                    </p>
                                </div>
                            ) : (
                                trendingPosts.map((post, index) => (
                                    <div key={post.id} className="relative">
                                        <div className="absolute -top-3 -left-3 z-10">
                                            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center gap-1.5">
                                                <Flame className="h-3 w-3 text-foreground" />
                                                <span className="text-xs font-semibold text-foreground uppercase">
                                                    #{index + 1} Trending
                                                </span>
                                            </div>
                                        </div>
                                        <PostCard post={post} currentUserId={currentUser?.id} />
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Hot Topics */}
                    {activeTab === 'topics' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trendingTopics.length === 0 ? (
                                <div className="col-span-2 p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed text-center">
                                    <Hash className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-2">
                                        No Trending Topics
                                    </h3>
                                    <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">
                                        Topics will appear here
                                    </p>
                                </div>
                            ) : (
                                trendingTopics.map((topic, index) => (
                                    <Link
                                        key={topic.tag}
                                        href={`/search?q=%23${topic.tag}`}
                                        className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/50 transition-[background-color,border-color] cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-bold text-primary/30">#{index + 1}</span>
                                                <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">#{topic.tag}</span>
                                            </div>
                                            {topic.growth && <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold uppercase">
                                                {topic.growth}
                                            </span>}
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-3xl font-bold text-foreground">{topic.posts}</p>
                                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                                                    Posts
                                                </p>
                                            </div>
                                            <TrendingUp className="h-6 w-6 text-green-400" />
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}

                    {/* Rising Stars */}
                    {activeTab === 'users' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {trendingUsers.length === 0 ? (
                                <div className="col-span-3 p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed text-center">
                                    <UserIcon className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-2">
                                        No Rising Stars
                                    </h3>
                                    <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">
                                        Active users will appear here
                                    </p>
                                </div>
                            ) : (
                                trendingUsers.map((user, index) => (
                                    <Link
                                        key={user.id}
                                        href={`/@${user.username}`}
                                        className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/50 transition-[background-color,border-color] group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Image
                                                        src={user.avatar || '/default-avatar.png'}
                                                        alt={user.displayName || user.username}
                                                        width={48}
                                                        height={48}
                                                        className="rounded-full border-2 border-white/10 group-hover:border-primary/50 transition-colors"
                                                    />
                                                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                                                        <span className="text-xs font-semibold text-foreground">{index + 1}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {user.displayName || user.username}
                                                    </p>
                                                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                                        @{user.username}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">Level</span>
                                                <span className="text-sm font-bold text-foreground">{user.level}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">Posts</span>
                                                <span className="text-sm font-bold text-foreground">{user.postsCount}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">XP</span>
                                                <span className="text-sm font-bold text-primary">{user.points}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
