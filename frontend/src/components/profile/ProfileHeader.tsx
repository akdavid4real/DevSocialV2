"use client"

import React, { useEffect, useState } from 'react'
import { MapPin, Calendar, Edit2, Link as LinkIcon, Github, Linkedin, Loader2, Briefcase, MessageSquare, UserX, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import ShareProfileButton from './ShareProfileButton'
import NextLink from '@/components/ui/link'
import api from '@/lib/api'
import { toast } from 'sonner'

interface ProfileData {
    name: string
    title?: string
    location?: string
    joinDate?: string
    bio?: string
    avatar: string
    bannerUrl?: string
    techStack?: string[]
    website?: string
    githubUsername?: string
    linkedinUrl?: string
    affiliation?: string
    userId: string
    username: string
    followersCount: number
    followingCount: number
    isFollowing: boolean
    followRequested?: boolean
    requestId?: string | null
    requestStatus?: string | null
    points?: number
    level?: number
    badges?: string[]
}

type ProfileHeaderProps = {
    profile: ProfileData
    onEdit?: () => void
    isOwnProfile: boolean
    onFollowToggle?: () => void
    followLoading?: boolean
    onBlockUser?: () => void
    blockLoading?: boolean
    onFollowersClick?: () => void
    onFollowingClick?: () => void
};

export default function ProfileHeader({
    profile,
    onEdit,
    isOwnProfile,
    onFollowToggle: _onFollowToggle,
    followLoading: parentFollowLoading,
    onBlockUser,
    blockLoading,
    onFollowersClick,
    onFollowingClick,
}: ProfileHeaderProps) {
    const [isFollowing, setIsFollowing] = useState(profile.isFollowing)
    const [followRequested, setFollowRequested] = useState(Boolean(profile.followRequested || profile.requestStatus === 'PENDING'))
    const [requestId, setRequestId] = useState<string | null>(profile.requestId || null)
    const [followersCount, setFollowersCount] = useState(profile.followersCount)
    const [localFollowLoading, setLocalFollowLoading] = useState(false)

    useEffect(() => {
        setIsFollowing(profile.isFollowing)
        setFollowRequested(Boolean(profile.followRequested || profile.requestStatus === 'PENDING'))
        setRequestId(profile.requestId || null)
        setFollowersCount(profile.followersCount)
    }, [profile.isFollowing, profile.followRequested, profile.requestId, profile.requestStatus, profile.followersCount])

    const handleFollowToggle = async () => {
        if (isOwnProfile || localFollowLoading) return
        setLocalFollowLoading(true)
        try {
            if (isFollowing) {
                await api.delete(`/follow/${profile.userId}`)
                setIsFollowing(false)
                setFollowersCount((count) => Math.max(0, count - 1))
                toast.success('Disconnected')
                return
            }

            if (followRequested && requestId) {
                await api.delete(`/follow/requests/${requestId}`)
                setFollowRequested(false)
                setRequestId(null)
                toast.success('Follow request cancelled')
                return
            }

            const response: any = await api.post(`/follow/${profile.userId}`)
            const data = response?.data || response
            if (data?.requested) {
                setFollowRequested(true)
                setRequestId(data.requestId || null)
                toast.success('Follow request sent')
            } else {
                setIsFollowing(true)
                setFollowersCount((count) => count + 1)
                toast.success('Connected')
            }
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update follow status')
        } finally {
            setLocalFollowLoading(false)
        }
    }

    const followLoading = parentFollowLoading || localFollowLoading

    return (
        <div className="w-full relative">
            <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent relative overflow-hidden rounded-b-[40px] border-b border-border">
                {profile.bannerUrl && (
                    <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                )}
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-border">
                    <div className="relative group">
                        <div className="absolute -inset-1.5 bg-gradient-to-tr from-primary to-purple-600 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500" />
                        <Avatar className="h-32 w-32 md:h-40 md:w-40 border-[6px] border-background ring-1 ring-border relative">
                            <AvatarImage src={profile.avatar} className="object-cover" />
                            <AvatarFallback className="text-4xl font-semibold bg-muted text-foreground">
                                {profile.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-background shadow-lg shadow-emerald-500/20" />
                    </div>

                    <div className="flex-1 space-y-3 sm:space-y-4 md:mb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground tracking-tighter">
                                    {profile.name || profile.username}
                                </h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-primary font-bold tracking-widest text-xs">@{profile.username}</span>
                                    <Badge variant="outline" className="text-xs font-semibold uppercase tracking-widest">LVL {profile.level || 1}</Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3">
                                {isOwnProfile ? (
                                    <>
                                        <Button onClick={onEdit} variant="outline" className="rounded-full px-4 sm:px-6 md:px-8 h-10 sm:h-11 md:h-12 text-xs font-semibold uppercase tracking-widest hover:scale-105 transition-transform">
                                            <Edit2 className="h-4 w-4 mr-2" />Edit Profile
                                        </Button>
                                        <ShareProfileButton username={profile.username} displayName={profile.name} />
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() => void handleFollowToggle()}
                                            disabled={followLoading}
                                            variant={isFollowing || followRequested ? 'outline' : 'default'}
                                            className={cn(
                                                'rounded-full px-6 sm:px-8 md:px-10 h-10 sm:h-11 md:h-12 text-xs font-semibold uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                                                !isFollowing && !followRequested && 'bg-gradient-to-r from-primary to-purple-600 border-0 shadow-xl shadow-primary/20',
                                            )}
                                        >
                                            {followLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : followRequested ? (
                                                <><Clock3 className="h-4 w-4 mr-2" />Requested</>
                                            ) : (
                                                isFollowing ? 'Disconnect' : 'Connect'
                                            )}
                                        </Button>
                                        <Button variant="outline" className="rounded-full h-10 sm:h-11 md:h-12 w-10 sm:w-11 md:w-12 p-0" asChild>
                                            <NextLink href={`/messages?userId=${profile.userId}&username=${profile.username}`}><MessageSquare className="h-5 w-5" /></NextLink>
                                        </Button>
                                        <Button type="button" variant="outline" onClick={onBlockUser} disabled={blockLoading} className="rounded-full h-10 sm:h-11 md:h-12 w-10 sm:w-11 md:w-12 p-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" title={`Block @${profile.username}`}>
                                            {blockLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserX className="h-5 w-5" />}
                                            <span className="sr-only">Block @{profile.username}</span>
                                        </Button>
                                        <ShareProfileButton username={profile.username} displayName={profile.name} />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="max-w-2xl">
                            {profile.bio ? <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{profile.bio}</p> : <p className="text-sm text-muted-foreground/60 italic">No bio yet.</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                            {profile.affiliation && <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />{profile.affiliation}</div>}
                            {profile.location && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{profile.location}</div>}
                            <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />EST. {profile.joinDate || 'UNKNOWN'}</div>
                            {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground transition-colors"><LinkIcon className="h-3.5 w-3.5" />Website</a>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 md:gap-12 py-4 sm:py-6 md:py-8 overflow-x-auto no-scrollbar">
                    <div onClick={onFollowersClick} className="flex flex-col items-center gap-1 group cursor-pointer">
                        <span className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">{followersCount}</span>
                        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest group-hover:text-muted-foreground transition-colors">Followers</span>
                    </div>
                    <div onClick={onFollowingClick} className="flex flex-col items-center gap-1 group cursor-pointer">
                        <span className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">{profile.followingCount}</span>
                        <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest group-hover:text-muted-foreground transition-colors">Following</span>
                    </div>
                    <div className="h-8 w-px bg-border mx-2" />
                    <div className="flex gap-4">
                        {profile.githubUsername && <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer" className="h-10 w-10 bg-muted/50 border border-border rounded-xl hover:bg-muted hover:border-primary/50 transition-colors flex items-center justify-center group"><Github className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" /></a>}
                        {profile.linkedinUrl && <a href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="h-10 w-10 bg-muted/50 border border-border rounded-xl hover:bg-muted hover:border-primary/50 transition-colors flex items-center justify-center group"><Linkedin className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" /></a>}
                        {profile.website && <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="h-10 w-10 bg-muted/50 border border-border rounded-xl hover:bg-muted hover:border-primary/50 transition-colors flex items-center justify-center group"><LinkIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" /></a>}
                    </div>
                </div>
            </div>
        </div>
    )
}
