"use client"

import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

export default function Compose({ onPostCreated }: { onPostCreated: (post: any) => void }) {
    const { user } = useAuth()

    return (
        <Card
            className="bg-card border-border transition-all hover:bg-card/80 cursor-pointer overflow-hidden rounded-3xl"
            onClick={() => window.openPostModal?.()}
        >
            <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-primary/20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 relative">
                        <Input
                            readOnly
                            placeholder="What are you building today?"
                            className="w-full h-11 rounded-full border-white/10 bg-white/5 px-5 text-sm md:text-base shadow-inner transition-all hover:bg-white/10 cursor-pointer pointer-events-none"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
