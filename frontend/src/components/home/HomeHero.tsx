"use client"

import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { Sparkles, Trophy, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomeHero() {
    const { user } = useAuth()

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Good morning"
        if (hour < 18) return "Good afternoon"
        return "Good evening"
    }

    const level = user?.level || 1
    const points = user?.points || 0
    const nextLevelXp = 1000 // Simplified for now
    const progress = (points % 100) // Visual progress 0-100

    return (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-purple-600 p-1 shadow-2xl mb-6 sm:mb-8">
            <div className="relative rounded-[18px] sm:rounded-[20px] bg-black/10 backdrop-blur-md p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                    <div className="space-y-3 sm:space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2"
                        >
                            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-md border border-white/20">
                                <Sparkles className="mr-1.5 h-3 w-3 text-yellow-300" />
                                Daily Streak: {user?.loginStreak || 0} days
                            </span>
                        </motion.div>

                        <div className="space-y-1">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight"
                            >
                                {getGreeting()}, <span className="text-cyan-300">{user?.displayName?.split(' ')[0] || user?.username || "Dev"}</span>!
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-blue-100/80 max-w-sm text-sm sm:text-base md:text-lg"
                            >
                                Ready to ship some code and inspire the community today?
                            </motion.p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex gap-2 sm:gap-3"
                        >
                            <Button size="lg" className="bg-white text-primary hover:bg-blue-50 font-semibold rounded-xl h-10 sm:h-11 md:h-12 text-xs sm:text-sm shadow-lg shadow-black/10 border-0">
                                <Zap className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 fill-primary" /> <span className="hidden sm:inline">Start </span>Challenge
                            </Button>
                            <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-foreground hover:bg-white/10 hover:text-foreground rounded-xl h-10 sm:h-11 md:h-12 text-xs sm:text-sm">
                                Stats <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-full sm:w-auto"
                    >
                        <div className="glass-panel p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/10 border-white/20 text-foreground min-w-[180px] sm:min-w-[200px]">
                            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                                <div className="p-2 sm:p-3 bg-yellow-400/20 rounded-lg sm:rounded-xl ring-1 ring-yellow-400/30">
                                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-300" />
                                </div>
                                <div>
                                    <div className="text-[10px] sm:text-xs text-blue-100/60 uppercase tracking-widest font-bold">Current Rank</div>
                                    <div className="font-bold text-base sm:text-lg">Level {level} Pro</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden p-[1px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 h-full rounded-full shadow-[0_0_10px_rgba(253,224,71,0.5)]"
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-medium text-blue-100/80">
                                    <span>{points} XP</span>
                                    <span>{nextLevelXp} XP</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
