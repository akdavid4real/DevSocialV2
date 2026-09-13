"use client"

import { cn } from "@/lib/utils"

interface MediaItem {
    url: string
    type?: 'IMAGE' | 'VIDEO'
}

interface PostMediaGridProps {
    imageUrls?: string[]
    videoUrls?: string[]
    maxHeight?: string
    className?: string
}

export default function PostMediaGrid({
    imageUrls = [],
    videoUrls = [],
    maxHeight = "max-h-[500px]",
    className
}: PostMediaGridProps) {
    const hasImage = imageUrls.length > 0
    const hasVideo = videoUrls.length > 0

    if (!hasImage && !hasVideo) return null

    return (
        <div className={cn(
            "grid grid-cols-1 gap-2 rounded-2xl overflow-hidden border border-white/5",
            className
        )}>
            {imageUrls.map((url, idx) => (
                <img
                    key={`img-${idx}`}
                    src={url}
                    alt=""
                    className={cn("w-full h-auto object-cover", maxHeight)}
                />
            ))}
            {videoUrls.map((url, idx) => (
                <video
                    key={`vid-${idx}`}
                    src={url}
                    controls
                    className={cn("w-full h-auto", maxHeight)}
                />
            ))}
        </div>
    )
}
