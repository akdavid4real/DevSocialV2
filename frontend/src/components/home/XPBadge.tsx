"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface XPBadgeProps {
    amount: number
    show: boolean
    className?: string
}

export default function XPBadge({ amount, show, className }: XPBadgeProps) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (show) {
            setVisible(true)
            const timer = setTimeout(() => setVisible(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [show])

    if (!visible) return null

    return (
        <div
            className={cn(
                "fixed top-20 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300",
                "bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-xl",
                "border border-primary/30 rounded-2xl px-4 py-2 shadow-2xl",
                className
            )}
        >
            <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-widest text-primary/60">
                        XP Earned
                    </span>
                    <span className="text-xl font-semibold text-primary">
                        +{amount}
                    </span>
                </div>
            </div>
        </div>
    )
}
