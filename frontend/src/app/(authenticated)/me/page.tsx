"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/lib/navigation'
import { Loader2, Activity as ActivityIcon, Settings, Award, Heart, MessageCircle, FileText, Pin } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileStats from '@/components/profile/ProfileStats'
import PostCard from '@/components/home/PostCard'
import ActivityFeed from '@/components/profile/ActivityFeed'
import ActivityHeatmap from '@/components/profile/ActivityHeatmap'
import AboutSection from '@/components/profile/AboutSection'
import EditProfileModal from '@/components/modals/EditProfileModal'
import FollowersModal from '@/components/modals/FollowersModal'
import api from '@/lib/api'

export default function PersonalProfilePage() {
    const router = useRouter()
    const { user: currentUser, loading: authLoading } = useAuth()

    const [profile, setProfile] = useState<any>(null)
    const [posts, setPosts] = useState<any[]>([])
    const [pinnedPosts, setPinnedPosts] = useState<any[]>([])
    const [likedPosts, setLikedPosts] = useState<any[]>([])
    const [commentedPosts, setCommentedPosts] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [heatmapData, setHeatmapData] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [postsLoading, setPostsLoading] = useState(false)
    const [likedLoading, setLikedLoading] = useState(false)
    const [commentedLoading, setCommentedLoading] = useState(false)
    const [activitiesLoading, setActivitiesLoading] = useState(false)
    const [heatmapLoading, setHeatmapLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('posts')
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [followersModalOpen, setFollowersModalOpen] = useState(false)
    const [followingModalOpen, setFollowingModalOpen] = useState(false)

    const fetchMyProfile = useCallback(async () => {
        if (!currentUser) return
        
        try {
            setLoading(true)
            const [profileRes, statsRes, heatmapRes]: any = await Promise.all([
                api.get(`/users/${currentUser.username}`),
                api.get(`/users/${currentUser.username}/stats`),
                api.get(`/users/${currentUser.username}/activity-heatmap`)
            ])
            
            const profileData = profileRes.data || profileRes
            const statsData = statsRes.data || statsRes
            const heatmapDataRaw = Array.isArray(heatmapRes) ? heatmapRes : (heatmapRes.data || [])
            
            setProfile(profileData)
            setStats(statsData)
            setHeatmapData(heatmapDataRaw)
            fetchMyPosts(currentUser.username)
            fetchPinnedPosts(currentUser.username)
        } catch (err: any) {
            console.error('Error fetching personal profile:', err)
            setError('Unable to load your profile')
        } finally {
            setLoading(false)
        }
    }, [currentUser])

    const fetchMyPosts = async (username: string) => {
        try {
            setPostsLoading(true)
            const response: any = await api.get(`/users/${username}/posts`)
            const postsData = Array.isArray(response) ? response : (response.data || [])
            setPosts(postsData)
        } catch (err) {
            console.error('Error fetching own posts:', err)
            setPosts([])
        } finally {
            setPostsLoading(false)
        }
    }

    const fetchLikedPosts = async (username: string) => {
        try {
            setLikedLoading(true)
            const response: any = await api.get(`/users/${username}/liked-posts`)
            
            // Handle double-wrapped response: { success: true, data: { success: true, data: [...] } }
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

    const fetchCommentedPosts = async (username: string) => {
        try {
            setCommentedLoading(true)
            const response: any = await api.get(`/users/${username}/commented-posts`)
            
            // Handle double-wrapped response: { success: true, data: { success: true, data: [...] } }
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

    const fetchActivities = async (username: string) => {
        try {
            setActivitiesLoading(true)
            const response: any = await api.get(`/users/${username}/activities`)
            
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

    const fetchPinnedPosts = async (username: string) => {
        try {
            const response: any = await api.get(`/users/${username}/pinned-posts`)
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

    const handlePinPost = async (postId: string) => {
        if (!currentUser) return
        try {
            await api.post(`/users/${currentUser.username}/pin-post`, { postId })
            fetchPinnedPosts(currentUser.username)
            fetchMyPosts(currentUser.username)
        } catch (err: any) {
            console.error('Error pinning post:', err)
            alert(err.response?.data?.message || 'Failed to pin post')
        }
    }

    const handleUnpinPost = async (postId: string) => {
        if (!currentUser) return
        try {
            await api.delete(`/users/${currentUser.username}/unpin-post/${postId}`)
            fetchPinnedPosts(currentUser.username)
            fetchMyPosts(currentUser.username)
        } catch (err) {
            console.error('Error unpinning post:', err)
        }
    }

    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/auth/login')
            return
        }
        if (currentUser) {
            fetchMyProfile()
        }
    }, [currentUser, authLoading, fetchMyProfile, router])

    if (loading || authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0B]">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Loading Your Profile...</p>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0B] p-6 text-center">
                <h1 className="text-4xl font-semibold text-foreground tracking-tighter uppercase mb-4 opacity-20">Profile Error</h1>
                <p className="text-muted-foreground uppercase tracking-widest text-xs mb-8">{error || 'Failed to load profile'}</p>
                <button
                    onClick={() => router.push('/')}
                    className="rounded-full px-10 h-12 text-xs font-semibold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    Return to Hub
                </button>
            </div>
        )
    }

    const tabs = [
        { id: 'posts', label: 'Posts', icon: FileText, count: stats?.postsCount || posts.length },
        { id: 'liked', label: 'Liked', icon: Heart, count: stats?.likesGiven || 0 },
        { id: 'commented', label: 'Commented', icon: MessageCircle, count: stats?.commentsCount || 0 },
        { id: 'activity', label: 'Activity', icon: ActivityIcon, count: 0 },
        { id: 'achievements', label: 'Achievements', icon: Award, count: 0 },
    ]

    return (
        <div className="max-w-[1200px] mx-auto space-y-12">
            {/* Personal Profile Header */}
            <ProfileHeader
                profile={{
                    ...profile,
                    name: profile.displayName || profile.username,
                    userId: profile.id,
                    isFollowing: false,
                    affiliation: profile.affiliation,
                    linkedinUrl: profile.linkedinUrl,
                    joinDate: new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }}
                isOwnProfile={true}
                onEdit={() => setIsEditModalOpen(true)}
                onFollowersClick={() => setFollowersModalOpen(true)}
                onFollowingClick={() => setFollowingModalOpen(true)}
            />

            <div className="space-y-12">
                {/* About Section */}
                <AboutSection
                    bio={profile.bio}
                    skills={profile.techStack}
                    interests={profile.interests}
                    currentLearning={[]}
                    affiliation={profile.affiliation}
                    experienceLevel={profile.experienceLevel}
                />

                {/* Personal Stats Section */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                            Your Stats
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-12 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                    <ProfileStats
                        stats={{
                            totalXP: profile.points,
                            challengesCompleted: 0,
                            communityRank: 0,
                            postsCreated: posts.length
                        }}
                    />
                </section>

                {/* Tech Stack Section */}
                <section className="space-y-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                        Your Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2 p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                        {profile.techStack?.length > 0 ? (
                            profile.techStack.map((tech: string) => (
                                <span key={tech} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-foreground uppercase tracking-wider">
                                    {tech}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">No stack added yet</span>
                        )}
                    </div>
                </section>

                {/* Activity Heatmap */}
                <section className="space-y-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                        Activity Overview
                    </h3>
                    <ActivityHeatmap activities={heatmapData} loading={heatmapLoading} />
                </section>

                {/* Tabs Section */}
                <section className="space-y-8">
                    <nav className="flex items-center gap-8 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    if (tab.id === 'liked' && likedPosts.length === 0 && currentUser) {
                                        fetchLikedPosts(currentUser.username)
                                    } else if (tab.id === 'commented' && commentedPosts.length === 0 && currentUser) {
                                        fetchCommentedPosts(currentUser.username)
                                    } else if (tab.id === 'activity' && activities.length === 0 && currentUser) {
                                        fetchActivities(currentUser.username)
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
                                            <PostCard 
                                                key={post.id} 
                                                post={post} 
                                                currentUserId={currentUser?.id}
                                                isPinned={true}
                                                onUnpin={() => handleUnpinPost(post.id)}
                                            />
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
                                        <PostCard 
                                            key={post.id} 
                                            post={post} 
                                            currentUserId={currentUser?.id}
                                            canPin={pinnedPosts.length < 3 && !pinnedPosts.find(p => p.id === post.id)}
                                            onPin={() => handlePinPost(post.id)}
                                        />
                                    ))
                                ) : (
                                    <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <FileText className="h-6 w-6 text-muted-foreground/60" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">No Posts Yet</h4>
                                        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">Start sharing your thoughts!</p>
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
                                    <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <Heart className="h-6 w-6 text-muted-foreground/60" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">No Liked Posts</h4>
                                        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">Posts you like will appear here</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'commented' && (
                            <div className="space-y-6 animate-in fade-in-slide-in-from-bottom-4 duration-700">
                                {commentedLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                                    </div>
                                ) : commentedPosts.length > 0 ? (
                                    commentedPosts.map(post => (
                                        <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                                    ))
                                ) : (
                                    <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <MessageCircle className="h-6 w-6 text-muted-foreground/60" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">No Commented Posts</h4>
                                        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">Posts you comment on will appear here</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <ActivityFeed activities={activities} loading={activitiesLoading} />
                            </div>
                        )}

                        {activeTab === 'achievements' && (
                            <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                                <Award className="h-12 w-12 text-muted-foreground/60 mb-4" />
                                <h4 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">Achievements</h4>
                                <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">Coming soon...</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Modals */}
            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onSave={(updatedProfile) => {
                    setProfile((prev: any) => prev ? ({ ...prev, ...updatedProfile }) : null)
                    setIsEditModalOpen(false)
                }}
            />

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
