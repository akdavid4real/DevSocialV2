"use client";

import { motion } from "framer-motion";
import { BadgeCheck, PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
    data: any;
}

export function WelcomeStep({ data }: WelcomeStepProps) {
    return (
        <div className="flex flex-col items-center justify-center space-y-8 py-10 text-center">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="relative"
            >
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl relative z-10 border-4 border-background">
                    <BadgeCheck className="w-16 h-16 text-foreground" />
                </div>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-4 -right-4 w-12 h-12 bg-card rounded-xl shadow-lg border border-border flex items-center justify-center z-20"
                >
                    <PartyPopper className="w-6 h-6 text-primary" />
                </motion.div>
            </motion.div>

            <div className="space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tight">You're All Set!</h2>
                <p className="text-muted-foreground max-w-md">
                    Welcome to the new era of developer social networking. Your profile is ready and you've earned your first XP.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-left">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Starting Level</span>
                    <div className="text-2xl font-semibold text-primary">Level 1</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-left">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Bonus XP Earned</span>
                    <div className="text-2xl font-semibold text-emerald-500">+100 XP</div>
                </div>
            </div>

            <div className="pt-6 space-y-4 w-full">
                <div className="text-xs text-muted-foreground">
                    Ready to join the community of <span className="text-primary font-bold">10,000+</span> developers?
                </div>
            </div>
        </div>
    );
}
