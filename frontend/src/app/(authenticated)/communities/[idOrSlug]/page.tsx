"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Loader2, MessageSquare, Send, Users, Users2 } from "lucide-react"
import {
    Community,
    createCommunityPost,
    getCommunity,
    getCommunityPosts,
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
import PostCard from "@/components/home/PostCard"

export default function CommunityDetailPage() {
    const params = useParams()
    const idOrSlug = String(params.idOrSlug || "")
    const router = useRouter()
    const { user } = useAuth()
    const [community, setCommunity] = useState<Community | null>(null)
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [posting, setPosting] = useState(false)
    const [content, setContent] = useState("")

    const loadCommunity = useCallback(async () => {
        if (!idOrSlug) return
        setLoading(true)
        try {
            const [communityData, postsData] = await Promise.all([
                getCommunity(idOrSlug),
                getCommunityPosts(idOrSlug),
            ])
            setCommunity(communityData)
            setPosts(postsData.posts)
        } catch (error) {
            console.error("Failed to load community:", error)
            setCommunity(null)
        } finally {
            setLoading(false)
        }
    }, [idOrSlug])

    useEffect(() => {
        loadCommunity()
    }, [loadCommunity])

    const isMember = !!user && !!community?.memberIds.includes(user.id)
    const isCreator = !!user && community?.creatorId === user.id

    const handleJoin = async () => {
        if (!user) {
            router.push("/auth/login")
            return
        }

        setJoining(true)
        try {
            const data = await toggleCommunityMembership(idOrSlug)
            setCommunity(data.community)
        } catch (error) {
            console.error("Failed to update membership:", error)
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
        } catch (error) {
            console.error("Failed to create community post:", error)
        } finally {
            setPosting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!community) {
        return (
            <div className="py-20 text-center">
                <h1 className="text-2xl font-bold text-foreground">Community not found</h1>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/communities")}>
                    Back to communities
                </Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <Link href="/communities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to communities
            </Link>

            <Card>
                <CardHeader className="space-y-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                                    {community.name[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{community.name}</h1>
                                    {isCreator && <Badge>Creator</Badge>}
                                </div>
                                <Badge variant="secondary" className="mt-2">{community.category}</Badge>
                            </div>
                        </div>
                        <Button variant={isMember ? "outline" : "default"} disabled={joining} onClick={handleJoin}>
                            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users2 className="h-4 w-4" />}
                            {isMember ? "Joined" : "Join"}
                        </Button>
                    </div>

                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{community.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {community.memberCount.toLocaleString()} members
                        </span>
                        <span className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            {community.postCount.toLocaleString()} posts
                        </span>
                    </div>
                </CardHeader>
            </Card>

            {isMember ? (
                <Card>
                    <CardContent className="space-y-3 p-4">
                        <Textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder={`Share something with ${community.name}...`}
                            className="min-h-[96px]"
                        />
                        <div className="flex justify-end">
                            <Button disabled={posting || !content.trim()} onClick={handlePost}>
                                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Post
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-5 text-sm text-muted-foreground">
                        Join this community to publish posts here.
                    </CardContent>
                </Card>
            )}

            <div className="space-y-5">
                {posts.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center text-sm text-muted-foreground">
                            No posts in this community yet.
                        </CardContent>
                    </Card>
                ) : (
                    posts.map((post) => (
                        <PostCard key={post.id} post={post} currentUserId={user?.id} />
                    ))
                )}
            </div>
        </div>
    )
}
