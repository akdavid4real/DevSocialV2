"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import PostCard from "./PostCard"
import { Loader2, Zap } from "lucide-react"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

export default function Feed({ newPost }: { newPost: any }) {
    const { user } = useAuth()
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const observer = useRef<IntersectionObserver | null>(null)

    const fetchPosts = useCallback(async (pageNum: number, isInitial = false) => {
        try {
            if (isInitial) setLoading(true)
            else setLoadingMore(true)

            const response = await api.get(`/posts?page=${pageNum}&limit=10`) as any
            if (response.success && response.data) {
                const fetchedPosts = response.data.posts || []
                setPosts(prev => isInitial ? fetchedPosts : [...prev, ...fetchedPosts])
                setHasMore(fetchedPosts.length === 10)
                setPage(pageNum)
            }
        } catch (error) {
            console.error("Failed to fetch posts:", error)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }, [])

    useEffect(() => {
        fetchPosts(1, true)
    }, [fetchPosts])

    useEffect(() => {
        if (newPost) {
            setPosts(prev => [newPost, ...prev])
        }
    }, [newPost])

    const lastPostRef = useCallback((node: HTMLDivElement) => {
        if (loading || loadingMore) return
        if (observer.current) observer.current.disconnect()

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchPosts(page + 1)
            }
        })

        if (node) observer.current.observe(node)
    }, [loading, loadingMore, hasMore, page, fetchPosts])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
                <p className="text-muted-foreground animate-pulse">Gathering the latest dev updates...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <AnimatePresence mode="popLayout">
                {posts.map((post, index) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        ref={index === posts.length - 1 ? lastPostRef : null}
                    >
                        <PostCard post={post} currentUserId={user?.id} />
                    </motion.div>
                ))}
            </AnimatePresence>

            {loadingMore && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="py-12 text-center text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">You're all caught up! Go build something awesome.</p>
                </div>
            )}

            {posts.length === 0 && !loading && (
                <div className="py-20 text-center glass-panel rounded-3xl border-white/5 bg-white/5">
                    <p className="text-muted-foreground">No posts yet. Be the first to share your journey!</p>
                </div>
            )}
        </div>
    )
}
