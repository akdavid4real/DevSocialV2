"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Check, Clock3, Loader2, Lock, MessageSquare, Send, UserPlus, Users, Users2, X } from "lucide-react"
import {
    Community,
    CommunityJoinRequest,
    cancelCommunityJoinRequest,
    createCommunityPost,
    getCommunity,
    getCommunityJoinRequests,
    getCommunityPosts,
    inviteUserToCommunity,
    reviewCommunityJoinRequest,
    toggleCommunityMembership,
} from "@/lib/communities"
import { useParams, useRouter } from "@/lib/navigation"
import { useAuth } from "@/contexts/auth-context"
import Link from "@/components/ui/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import PostCard from "@/components/home/PostCard"
import api from "@/lib/api"
import { toast } from "sonner"

export default function CommunityDetailPage() {
    const params = useParams()
    const idOrSlug = String(params.idOrSlug || "")
    const router = useRouter()
    const { user } = useAuth()
    const [community, setCommunity] = useState<Community | null>(null)
    const [posts, setPosts] = useState<any[]>([])
    const [joinRequests, setJoinRequests] = useState<CommunityJoinRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [posting, setPosting] = useState(false)
    const [content, setContent] = useState("")
    const [inviteUsername, setInviteUsername] = useState("")
    const [inviting, setInviting] = useState(false)
    const [reviewingId, setReviewingId] = useState<string | null>(null)

    const loadCommunity = useCallback(async () => {
        if (!idOrSlug) return
        setLoading(true)
        try {
            const communityData = await getCommunity(idOrSlug)
            setCommunity(communityData)

            if (communityData.canViewContent !== false) {
                try {
                    const postsData = await getCommunityPosts(idOrSlug)
                    setPosts(postsData.posts)
                } catch {
                    setPosts([])
                }
            } else {
                setPosts([])
            }
        } catch (error) {
            console.error("Failed to load community:", error)
            setCommunity(null)
        } finally {
            setLoading(false)
        }
    }, [idOrSlug])

    useEffect(() => { void loadCommunity() }, [loadCommunity])

    const isMember = !!user && Boolean(community?.isJoined ?? community?.memberIds.includes(user.id))
    const myMembership = community?.members.find((member) => member.userId === user?.id)
    const isManager = !!user && (community?.creatorId === user.id || myMembership?.role === "CREATOR" || myMembership?.role === "MODERATOR")
    const requestPending = community?.requestStatus === "PENDING" && Boolean(community.requestId)

    const loadJoinRequests = useCallback(async () => {
        if (!isManager || !idOrSlug) return
        try {
            const data = await getCommunityJoinRequests(idOrSlug)
            setJoinRequests(data.requests)
        } catch {
            setJoinRequests([])
        }
    }, [idOrSlug, isManager])

    useEffect(() => { void loadJoinRequests() }, [loadJoinRequests])

    const handleJoin = async () => {
        if (!user) {
            router.push("/auth/login")
            return
        }

        setJoining(true)
        try {
            if (requestPending && community?.requestId) {
                await cancelCommunityJoinRequest(community.requestId)
                setCommunity((current) => current ? { ...current, requestId: null, requestStatus: "CANCELLED" } : current)
                toast.success("Join request cancelled")
                return
            }

            const data = await toggleCommunityMembership(idOrSlug)
            setCommunity((current) => current ? {
                ...data.community,
                requestId: data.requestId ?? current.requestId,
                requestStatus: data.requestStatus ?? current.requestStatus,
                isJoined: data.isJoined,
                canViewContent: data.isJoined || !data.community.isPrivate,
            } : data.community)

            if (data.requested) {
                toast.success("Join request sent")
            } else if (data.isJoined) {
                toast.success("Joined community")
                await loadCommunity()
            } else {
                toast.success("Left community")
                setPosts([])
            }
        } catch (error: any) {
            toast.error(error?.message || "Failed to update membership")
        } finally {
            setJoining(false)
        }
    }

    const handlePost = async () => {
        if (!content.trim()) return
        setPosting(true)
        try {
            const post = await createCommunityPost(idOrSlug, content.trim())
            setPosts((previous) => [post, ...previous])
            setContent("")
            setCommunity((previous) => previous ? { ...previous, postCount: previous.postCount + 1 } : previous)
        } catch (error: any) {
            toast.error(error?.message || "Failed to create community post")
        } finally {
            setPosting(false)
        }
    }

    const reviewRequest = async (requestId: string, accept: boolean) => {
        setReviewingId(requestId)
        try {
            await reviewCommunityJoinRequest(idOrSlug, requestId, accept)
            setJoinRequests((current) => current.filter((request) => request.id !== requestId))
            setCommunity((current) => current && accept ? { ...current, memberCount: current.memberCount + 1 } : current)
            toast.success(accept ? "Member approved" : "Request declined")
        } catch (error: any) {
            toast.error(error?.message || "Could not update request")
        } finally {
            setReviewingId(null)
        }
    }

    const inviteUser = async () => {
        const username = inviteUsername.trim().replace(/^@/, "")
        if (!username) return
        setInviting(true)
        try {
            const response: any = await api.get(`/users/search?q=${encodeURIComponent(username)}`)
            const candidates = Array.isArray(response) ? response : (response?.data || [])
            const match = candidates.find((candidate: any) => candidate.username?.toLowerCase() === username.toLowerCase())
            if (!match) throw new Error(`@${username} was not found`)
            await inviteUserToCommunity(idOrSlug, match.id)
            setInviteUsername("")
            toast.success(`Invitation sent to @${match.username}`)
        } catch (error: any) {
            toast.error(error?.message || "Could not send invitation")
        } finally {
            setInviting(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    if (!community) {
        return (
            <div className="py-20 text-center">
                <h1 className="text-2xl font-bold text-foreground">Community not found</h1>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/communities")}>Back to communities</Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <Link href="/communities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />Back to communities
                </Link>
                <Link href="/communities/invitations" className="text-sm text-primary hover:underline">My invitations</Link>
            </div>

            <Card>
                <CardHeader className="space-y-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">{community.name[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{community.name}</h1>
                                    {community.isPrivate && <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Private</Badge>}
                                    {isManager && <Badge>Manager</Badge>}
                                </div>
                                <Badge variant="secondary" className="mt-2">{community.category}</Badge>
                            </div>
                        </div>
                        {!isManager && (
                            <Button variant={isMember || requestPending ? "outline" : "default"} disabled={joining} onClick={handleJoin}>
                                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : requestPending ? <Clock3 className="h-4 w-4" /> : <Users2 className="h-4 w-4" />}
                                {isMember ? "Joined" : requestPending ? "Requested" : community.isPrivate ? "Request to join" : "Join"}
                            </Button>
                        )}
                    </div>

                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{community.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2"><Users className="h-4 w-4" />{community.memberCount.toLocaleString()} members</span>
                        <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />{community.postCount.toLocaleString()} posts</span>
                    </div>
                </CardHeader>
            </Card>

            {isManager && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader><h2 className="font-semibold text-foreground">Pending join requests</h2></CardHeader>
                        <CardContent className="space-y-3">
                            {joinRequests.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : joinRequests.map((request) => (
                                <div key={request.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                                    <div className="min-w-0 flex-1"><p className="font-medium truncate">{request.user.displayName || request.user.username}</p><p className="text-xs text-muted-foreground">@{request.user.username}</p></div>
                                    <Button size="icon" onClick={() => void reviewRequest(request.id, true)} disabled={reviewingId === request.id}>{reviewingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>
                                    <Button size="icon" variant="outline" onClick={() => void reviewRequest(request.id, false)} disabled={reviewingId === request.id}><X className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><h2 className="font-semibold text-foreground">Invite a member</h2></CardHeader>
                        <CardContent className="flex gap-2">
                            <Input value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} placeholder="Username" />
                            <Button onClick={() => void inviteUser()} disabled={inviting || !inviteUsername.trim()}>{inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Invite</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {isMember ? (
                <Card>
                    <CardContent className="space-y-3 p-4">
                        <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={`Share something with ${community.name}...`} className="min-h-[96px]" />
                        <div className="flex justify-end"><Button disabled={posting || !content.trim()} onClick={handlePost}>{posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Post</Button></div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-5 text-sm text-muted-foreground">
                        {community.isPrivate ? (requestPending ? "Your request is awaiting approval." : "Request access to view and publish community posts.") : "Join this community to publish posts here."}
                    </CardContent>
                </Card>
            )}

            {community.canViewContent === false ? (
                <Card><CardContent className="py-16 text-center"><Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="font-medium text-foreground">Private community</p><p className="text-sm text-muted-foreground mt-1">Posts become visible after your membership is approved.</p></CardContent></Card>
            ) : (
                <div className="space-y-5">
                    {posts.length === 0 ? <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">No posts in this community yet.</CardContent></Card> : posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user?.id} />)}
                </div>
            )}
        </div>
    )
}
