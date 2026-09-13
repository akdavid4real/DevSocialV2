"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from '@/lib/navigation'
import { Loader2, Activity as ActivityIcon, Heart, MessageCircle, FileText, Pin } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileStats from '@/components/profile/ProfileStats'
import PostCard from '@/components/home/PostCard'
import AboutSection from '@/components/profile/AboutSection'
import MutualConnections from '@/components/profile/MutualConnections'
import ActivityHeatmap from '@/components/profile/ActivityHeatmap'
import ActivityFeed from '@/components/profile/ActivityFeed'
import api from '@/lib/api'
import EditProfileModal from '@/components/modals/EditProfileModal'
import FollowersModal from '@/components/modals/FollowersModal'
import { toast } from 'sonner'

interface ProfileData {
    id: string
    username: string
    displayName: string
    bio: string
    avatar: string
    bannerUrl: string
    affiliation: string
    techStack: string[]
    points: number
    level: number
    badges: string[]
    location: string
    website: string
    githubUsername: string
    linkedinUrl: string
    interests?: string[]
    experienceLevel?: string
    createdAt: string
    followersCount: number
    followingCount: number
}

export default function PublicProfilePage() {
    const params = useParams()
    const rawUsername = params.username as string
    const router = useRouter()
    const { user: currentUser, loading: authLoading } = useAuth()

    // Enforce @ prefix for public profiles
    if (!rawUsername?.startsWith('%40') && !rawUsername?.startsWith('@')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0B] p-6 text-center">
                <h1 className="text-4xl font-semibold text-foreground tracking-tighter uppercase mb-4 opacity-20">Signal Lost</h1>
                <p className="text-muted-foreground uppercase tracking-widest text-xs mb-8">Public handles must be prefixed with @</p>
                <button
                    onClick={() => router.push('/')}
                    className="rounded-full px-10 h-12 text-xs font-semibold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    Return to Hub
                </button>
            </div>
        )
    }

    const username = rawUsername.replace('%40', '').replace('@', '')

    // IMPORTANT: Redirect to /me if viewing own profile
    useEffect(() => {
        if (currentUser && currentUser.username === username) {
            router.replace('/me')
        }
    }, [currentUser, username, router])

    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [posts, setPosts] = useState<any[]>([])
    const [pinnedPosts, setPinnedPosts] = useState<any[]>([])
    const [likedPosts, setLikedPosts] = useState<any[]>([])
    const [commentedPosts, setCommentedPosts] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [heatmapData, setHeatmapData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [postsLoading, setPostsLoading] = useState(false)
    const [likedLoading, setLikedLoading] = useState(false)
    const [commentedLoading, setCommentedLoading] = useState(false)
    const [activitiesLoading, setActivitiesLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('posts')
    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [blockLoading, setBlockLoading] = useState(false)
    const [followersModalOpen, setFollowersModalOpen] = useState(false)
    const [followingModalOpen, setFollowingModalOpen] = useState(false)

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true)
            const [profileRes, heatmapRes]: any = await Promise.all([
                api.get(`/users/${username}`),
                api.get(`/users/${username}/activity-heatmap`)
            ])
            
            if (profileRes.success && profileRes.data) {
                setProfile(profileRes.data)
                const heatmapDataRaw = Array.isArray(heatmapRes) ? heatmapRes : (heatmapRes.data || [])
                setHeatmapData(heatmapDataRaw)
                fetchPosts(username)
                fetchPinnedPosts(username)
                if (currentUser && currentUser.username !== username) {
                    checkFollowStatus(profileRes.data.id)
                }
            } else {
                setError(profileRes.message || 'Failed to fetch profile')
            }
        } catch (err: any) {
            console.error('Error fetching profile:', err)
            setError(err.response?.data?.message || 'User not found')
        } finally {
            setLoading(false)
        }
    }, [username, currentUser])

    const checkFollowStatus = async (userId: string) => {
        try {
            const response: any = await api.get(`/follow/${userId}/is-following`)
            // API returns { success: true, data: { isFollowing: boolean } }
            const isFollowingStatus = response.data?.isFollowing || response.isFollowing || false
            setIsFollowing(isFollowingStatus)
        } catch (err) {
            console.error('Error checking follow status:', err)
            setIsFollowing(false)
        }
    }

    const handleFollowToggle = async () => {
        if (!profile || !currentUser) return
        
        try {
            setFollowLoading(true)
            if (isFollowing) {
                await api.delete(`/follow/${profile.id}`)
                setIsFollowing(false)
                setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount - 1 } : null)
                toast.success('Unfollowed')
            } else {
                await api.post(`/follow/${profile.id}`)
                setIsFollowing(true)
                setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null)
                toast.success('Following')
            }
        } catch (err: any) {
            console.error('Error toggling follow:', err)
            
            // Handle "already following" error gracefully
            if (err.message?.includes('Already following')) {
                setIsFollowing(true)
                toast.info('You are already following this user')
            } else if (err.message?.includes('Not following')) {
                setIsFollowing(false)
                toast.info('You are not following this user')
            } else {
                toast.error(err.message || 'Failed to update follow status')
            }
        } finally {
            setFollowLoading(false)
        }
    }

    const handleBlockUser = async () => {
        if (!profile || !currentUser) return

        const confirmed = window.confirm(
            `Block @${profile.username}? They will be removed from your connections and added to your blocked users.`,
        )

        if (!confirmed) return

        try {
            setBlockLoading(true)
            await api.post(`/users/block/${profile.id}`)
            toast.success(`Blocked @${profile.username}`)
            router.push('/')
        } catch (err: any) {
            console.error('Error blocking user:', err)
            toast.error(err.message || 'Failed to block user')
        } finally {
            setBlockLoading(false)
        }
    }

    const fetchPosts = async (uname: string) => {
        try {
            setPostsLoading(true)
            const response: any = await api.get(`/users/${uname}/posts`)
            const postsData = Array.isArray(response) ? response : (response.data || [])
            console.log('[DEBUG] Fetched posts count:', postsData.length)
            setPosts(postsData)
        } catch (err) {
            console.error('Error fetching posts:', err)
            setPosts([])
        } finally {
            setPostsLoading(false)
        }
    }

    const fetchPinnedPosts = async (uname: string) => {
        try {
            const response: any = await api.get(`/users/${uname}/pinned-posts`)
            let postsData = []
            if (response?.data?.data && Array.isArray(response.data.data)) {
                postsData = response.data.data
            } else if (response?.data && Array.isArray(response.data)) {
                postsData = response.data
            } else if (Array.isArray(response)) {
                postsData = response
            }
            setPinnedPosts(postsData)
        } catch (err) {
            console.error('Error fetching pinned posts:', err)
            setPinnedPosts([])
        }
    }

    const fetchLikedPosts = async (uname: string) => {
        try {
            setLikedLoading(true)
            const response: any = await api.get(`/users/${uname}/liked-posts`)
            let postsData = []
            if (response?.data?.data && Array.isArray(response.data.data)) {
                postsData = response.data.data
            } else if (response?.data && Array.isArray(response.data)) {
                postsData = response.data
            } else if (Array.isArray(response)) {
                postsData = response
            }
            setLikedPosts(postsData)
        } catch (err) {
            console.error('Error fetching liked posts:', err)
            setLikedPosts([])
        } finally {
            setLikedLoading(false)
        }
    }

    const fetchCommentedPosts = async (uname: string) => {
        try {
            setCommentedLoading(true)
            const response: any = await api.get(`/users/${uname}/commented-posts`)
            let postsData = []
            if (response?.data?.data && Array.isArray(response.data.data)) {
                postsData = response.data.data
            } else if (response?.data && Array.isArray(response.data)) {
                postsData = response.data
            } else if (Array.isArray(response)) {
                postsData = response
            }
            setCommentedPosts(postsData)
        } catch (err) {
            console.error('Error fetching commented posts:', err)
            setCommentedPosts([])
        } finally {
            setCommentedLoading(false)
        }
    }

    const fetchActivities = async (uname: string) => {
        try {
            setActivitiesLoading(true)
            const response: any = await api.get(`/users/${uname}/activities`)
            
            // Handle different response formats
            let activitiesData = []
            if (response?.data?.data && Array.isArray(response.data.data)) {
                activitiesData = response.data.data
            } else if (response?.data && Array.isArray(response.data)) {
                activitiesData = response.data
            } else if (Array.isArray(response)) {
                activitiesData = response
            }
            
            setActivities(activitiesData)
        } catch (err) {
            console.error('Error fetching activities:', err)
            setActivities([])
        } finally {
            setActivitiesLoading(false)
        }
    }

    useEffect(() => {
        if (username) {
            fetchProfile()
        }
    }, [username, fetchProfile])

    if (loading || authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0B]">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Initializing Sector...</p>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0B] p-6 text-center">
                <h1 className="text-4xl font-semibold text-foreground tracking-tighter uppercase mb-4 opacity-20">Transmission Lost</h1>
                <p className="text-muted-foreground uppercase tracking-widest text-xs mb-8">{error || 'Sector unreachable'}</p>
                <button
                    onClick={() => router.push('/')}
                    className="rounded-full px-10 h-12 text-xs font-semibold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    Return to Hub
                </button>
            </div>
        )
    }

    const isOwnProfile = false // This page is ONLY for viewing other users

    const tabs = [
        { id: 'posts', label: 'Posts', icon: FileText, count: posts.length },
        { id: 'liked', label: 'Liked', icon: Heart, count: 0 },
        { id: 'commented', label: 'Commented', icon: MessageCircle, count: 0 },
        { id: 'activity', label: 'Activity', icon: ActivityIcon, count: 0 },
    ]

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
            <ProfileHeader
                profile={{
                    ...profile,
                    name: profile.displayName || profile.username,
                    userId: profile.id,
                    isFollowing,
                    affiliation: profile.affiliation,
                    linkedinUrl: profile.linkedinUrl,
                    joinDate: new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }}
                isOwnProfile={false}
                onFollowToggle={handleFollowToggle}
                followLoading={followLoading}
                onBlockUser={handleBlockUser}
                blockLoading={blockLoading}
                onFollowersClick={() => setFollowersModalOpen(true)}
                onFollowingClick={() => setFollowingModalOpen(true)}
            />

            <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
                {/* About Section */}
                <AboutSection
                    bio={profile.bio}
                    skills={profile.techStack}
                    interests={profile.interests}
                    currentLearning={[]}
                    affiliation={profile.affiliation}
                    experienceLevel={profile.experienceLevel}
                />

                {/* Mutual Connections */}
                <MutualConnections userId={profile.id} currentUserId={currentUser?.id} />

                <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 mb-8 ml-1">
                        Stats
                    </h3>
                    <ProfileStats
                        stats={{
                            totalXP: profile.points,
                            challengesCompleted: 0,
                            communityRank: 0,
                            postsCreated: posts.length
                        }}
                    />
                </section>

                <section className="space-y-4 sm:space-y-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                        Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2 p-4 sm:p-5 md:p-6 rounded-[32px] bg-card border-border">
                        {profile.techStack?.length > 0 ? (
                            profile.techStack.map(tech => (
                                <span key={tech} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-foreground tracking-wider">
                                    {tech}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">No stack detected</span>
                        )}
                    </div>
                </section>

                {/* Activity Heatmap */}
                <section className="space-y-4 sm:space-y-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                        Activity Overview
                    </h3>
                    <ActivityHeatmap activities={heatmapData} loading={false} />
                </section>

                <section className="space-y-4 sm:space-y-6 md:space-y-8">
                    <nav className="flex items-center gap-8 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    if (tab.id === 'liked' && likedPosts.length === 0) {
                                        fetchLikedPosts(username)
                                    } else if (tab.id === 'commented' && commentedPosts.length === 0) {
                                        fetchCommentedPosts(username)
                                    } else if (tab.id === 'activity' && activities.length === 0) {
                                        fetchActivities(username)
                                    }
                                }}
                                className={`group relative py-2 text-sm font-semibold tracking-widest uppercase transition-all flex items-center gap-2 whitespace-nowrap ${
                                    activeTab === tab.id ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.id && (
                                    <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="min-h-[400px]">
                        {activeTab === 'posts' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* Pinned Posts */}
                                {pinnedPosts.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 ml-1">
                                            <Pin className="h-3.5 w-3.5 text-primary" />
                                            <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Pinned Posts</h4>
                                        </div>
                                        {pinnedPosts.map(post => (
                                            <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                                        ))}
                                        <div className="border-t border-white/5 pt-6 mt-6">
                                            <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1 mb-4">All Posts</h4>
                                        </div>
                                    </div>
                                )}

                                {postsLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                                    </div>
                                ) : posts.length > 0 ? (
                                    posts.map(post => (
                                        <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                                    ))
                                ) : (
                                    <div className="p-12 rounded-[40px] bg-card border-border border-dashed flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <FileText className="h-6 w-6 text-muted-foreground/60" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">Awaiting Transmissions</h4>
                                        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">No public activities recorded.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'liked' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {likedLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                                    </div>
                                ) : likedPosts.length > 0 ? (
                                    likedPosts.map(post => (
                                        <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                                    ))
                                ) : (
                                    <div className="p-12 rounded-[40px] bg-card border-border border-dashed flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <Heart className="h-6 w-6 text-muted-foreground/60" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">No Liked Posts</h4>
                                        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">Posts liked will appear here</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'commented' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {commentedLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                                    </div>
                                ) : commentedPosts.length > 0 ? (
                                    commentedPosts.map(post => (
                                        <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                                    ))
                                ) : (
                                    <div className="p-12 rounded-[40px] bg-card border-border border-dashed flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <MessageCircle className="h-6 w-6 text-muted-foreground/60" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">No Commented Posts</h4>
                                        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">Posts commented on will appear here</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <ActivityFeed activities={activities} loading={activitiesLoading} />
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <FollowersModal
                isOpen={followersModalOpen}
                onClose={() => setFollowersModalOpen(false)}
                userId={profile.id}
                username={profile.username}
                type="followers"
            />

            <FollowersModal
                isOpen={followingModalOpen}
                onClose={() => setFollowingModalOpen(false)}
                userId={profile.id}
                username={profile.username}
                type="following"
            />
        </div>
    )
}
