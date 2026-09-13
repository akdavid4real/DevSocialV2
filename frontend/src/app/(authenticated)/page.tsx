"use client"

import { useState, useEffect } from "react"
import HomeHero from "@/components/home/HomeHero"
import Compose from "@/components/home/Compose"
import DashboardSummary from "@/components/home/DashboardSummary"
import Feed from "@/components/home/Feed"

export default function HomePage() {
    const [newPost, setNewPost] = useState<any>(null)

    const handlePostCreated = (post: any) => {
        setNewPost(post)
    }

    // Listen for posts created via the global modal (layout)
    useEffect(() => {
        const handleGlobalPost = (e: any) => {
            if (e.detail) handlePostCreated(e.detail)
        }
        window.addEventListener('post-created', handleGlobalPost)
        return () => window.removeEventListener('post-created', handleGlobalPost)
    }, [])

    return (
        <div className="max-w-[600px] lg:max-w-[600px] xl:max-w-[650px] mx-auto space-y-4 sm:space-y-5 md:space-y-6">
            <HomeHero />
            <DashboardSummary />
            <Compose onPostCreated={handlePostCreated} />
            <Feed newPost={newPost} />
        </div>
    )
}
