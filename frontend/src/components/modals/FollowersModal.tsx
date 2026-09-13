"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, Users, Search, UserCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'
import { useRouter } from '@/lib/navigation'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

interface User {
    id: string
    username: string
    displayName: string
    avatar: string
    level: number
    followersCount: number
    isFollowing?: boolean
    isMutual?: boolean
    isOnline?: boolean
}

interface FollowersModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
    username: string
    type: 'followers' | 'following'
}

export default function FollowersModal({ isOpen, onClose, userId, username, type }: FollowersModalProps) {
    const router = useRouter()
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
    const [followLoading, setFollowLoading] = useState<Set<string>>(new Set())
    const scrollRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Fetch current user's following list to determine mutual connections
    const fetchCurrentUserFollowing = async () => {
        if (!currentUser) return
        try {
            const response: any = await api.get(`/follow/${currentUser.id}/following?page=1&limit=1000`)
            const actualData = response.data || response
            const following = actualData.following || []
            const ids = new Set<string>(following.map((u: User) => u.id))
            setFollowingIds(ids)
        } catch (err) {
            console.error('Error fetching current user following:', err)
        }
    }

    const fetchUsers = async (pageNum: number = 1) => {
        try {
            setLoading(true)
            const endpoint = type === 'followers' 
                ? `/follow/${userId}/followers?page=${pageNum}&limit=20`
                : `/follow/${userId}/following?page=${pageNum}&limit=20`
            
            const response: any = await api.get(endpoint)
            const actualData = response.data || response
            const fetchedUsers = type === 'followers' ? actualData.followers : actualData.following
            
            // Enhance users with mutual and following status
            const enhancedUsers = fetchedUsers.map((user: User) => ({
                ...user,
                isFollowing: followingIds.has(user.id),
                isMutual: type === 'followers' ? followingIds.has(user.id) : false,
                isOnline: Math.random() > 0.5 // TODO: Replace with actual online status from backend
            }))
            
            if (pageNum === 1) {
                setUsers(enhancedUsers || [])
                setFilteredUsers(enhancedUsers || [])
            } else {
                setUsers(prev => [...prev, ...(enhancedUsers || [])])
                setFilteredUsers(prev => [...prev, ...(enhancedUsers || [])])
            }
            
            setHasMore(actualData.page < actualData.lastPage)
        } catch (err) {
            console.error(`Error fetching ${type}:`, err)
            setUsers([])
            setFilteredUsers([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            setPage(1)
            setSearchQuery('')
            fetchCurrentUserFollowing()
            fetchUsers(1)
        } else {
            setUsers([])
            setFilteredUsers([])
            setPage(1)
            setHasMore(true)
        }
    }, [isOpen, userId, type])

    // Search/Filter functionality
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredUsers(users)
        } else {
            const query = searchQuery.toLowerCase()
            const filtered = users.filter(user => 
                user.username.toLowerCase().includes(query) ||
                user.displayName?.toLowerCase().includes(query)
            )
            setFilteredUsers(filtered)
        }
    }, [searchQuery, users])

    // Infinite scroll with Intersection Observer
    useEffect(() => {
        if (!isOpen || !hasMore || loading) return

        const options = {
            root: scrollRef.current,
            rootMargin: '100px',
            threshold: 0.1
        }

        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading) {
                const nextPage = page + 1
                setPage(nextPage)
                fetchUsers(nextPage)
            }
        }, options)

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current)
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [isOpen, hasMore, loading, page])

    const handleUserClick = (username: string) => {
        onClose()
        router.push(`/@${username}`)
    }

    const handleFollowToggle = async (user: User, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!currentUser || currentUser.id === user.id) return

        setFollowLoading(prev => new Set(prev).add(user.id))

        try {
            if (followingIds.has(user.id)) {
                await api.delete(`/follow/${user.id}`)
                setFollowingIds(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(user.id)
                    return newSet
                })
                // Update user in list
                setUsers(prev => prev.map(u => 
                    u.id === user.id ? { ...u, isFollowing: false, isMutual: false } : u
                ))
                toast.success('Unfollowed')
            } else {
                await api.post(`/follow/${user.id}`)
                setFollowingIds(prev => new Set(prev).add(user.id))
                // Update user in list
                setUsers(prev => prev.map(u => 
                    u.id === user.id ? { ...u, isFollowing: true, isMutual: type === 'followers' } : u
                ))
                toast.success('Following')
            }
        } catch (err: any) {
            console.error('Error toggling follow:', err)
            toast.error(err.message || 'Failed to update follow status')
        } finally {
            setFollowLoading(prev => {
                const newSet = new Set(prev)
                newSet.delete(user.id)
                return newSet
            })
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-[#0A0A0B] border border-white/10 p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold uppercase tracking-widest text-foreground">
                            {type === 'followers' ? 'Followers' : 'Following'}
                        </DialogTitle>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mt-1">
                        @{username}
                    </p>
                </DialogHeader>

                {/* Search Bar */}
                <div className="px-6 py-4 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/60 rounded-xl"
                        />
                    </div>
                </div>

                <ScrollArea className="max-h-[500px]" ref={scrollRef}>
                    <div className="px-6 py-4">
                        {loading && page === 1 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/20 mb-4" />
                                <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">
                                    Loading...
                                </p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Users className="h-8 w-8 text-muted-foreground/60" />
                                </div>
                                <p className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">
                                    {searchQuery ? 'No Results' : `No ${type === 'followers' ? 'Followers' : 'Following'} Yet`}
                                </p>
                                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">
                                    {searchQuery 
                                        ? 'Try a different search term'
                                        : type === 'followers' 
                                            ? 'No one is following this user yet'
                                            : 'This user is not following anyone yet'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.map((user) => {
                                    const isCurrentUser = currentUser?.id === user.id
                                    const isLoadingFollow = followLoading.has(user.id)

                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => handleUserClick(user.username)}
                                            className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                                        >
                                            <div className="relative">
                                                <Avatar className="h-12 w-12 ring-2 ring-white/10 group-hover:ring-primary/30 transition-all">
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback className="bg-white/5 text-foreground font-semibold">
                                                        {user.username?.[0]?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {/* Online Status Indicator */}
                                                {user.isOnline && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0A0A0B]" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                        {user.displayName || user.username}
                                                    </p>
                                                    <Badge variant="outline" className="text-xs font-semibold border-white/10 bg-white/5 uppercase tracking-widest text-muted-foreground">
                                                        L{user.level}
                                                    </Badge>
                                                    {/* Mutual Follower Badge */}
                                                    {user.isMutual && (
                                                        <Badge className="text-xs font-semibold bg-primary/20 text-primary border-primary/30">
                                                            <UserCheck className="h-2.5 w-2.5 mr-1" />
                                                            Mutual
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">
                                                    @{user.username}
                                                </p>
                                                <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                                                    {user.followersCount} Followers
                                                </p>
                                            </div>

                                            {/* Follow/Unfollow Button */}
                                            {!isCurrentUser && currentUser && (
                                                <Button
                                                    onClick={(e) => handleFollowToggle(user, e)}
                                                    disabled={isLoadingFollow}
                                                    size="sm"
                                                    variant={user.isFollowing ? "outline" : "default"}
                                                    className={`rounded-full text-xs font-semibold uppercase tracking-widest transition-all ${
                                                        user.isFollowing 
                                                            ? 'bg-white/5 border-white/10 hover:bg-white/10 text-foreground' 
                                                            : 'bg-primary hover:bg-primary/90 text-foreground border-0'
                                                    }`}
                                                >
                                                    {isLoadingFollow ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : user.isFollowing ? (
                                                        'Following'
                                                    ) : (
                                                        'Follow'
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}

                                {/* Infinite Scroll Trigger */}
                                {hasMore && (
                                    <div ref={loadMoreRef} className="flex justify-center py-4">
                                        {loading && (
                                            <Loader2 className="h-6 w-6 animate-spin text-primary/20" />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
