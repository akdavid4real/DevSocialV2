"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Code2, Rocket, Zap } from "lucide-react";

interface BadgeStepProps {
    data: any;
    updateData: (data: any) => void;
}

const starterBadges = [
    {
        id: "EARLY_ADOPTER",
        name: "Early Adopter",
        description: "For the pioneers joining during the V2 rollout.",
        icon: Rocket,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
    },
    {
        id: "CODE_CRUSADER",
        name: "Code Crusader",
        description: "Passionate about clean code and architecture.",
        icon: Code2,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
    },
    {
        id: "INNOVATION_IDOL",
        name: "Innovation Idol",
        description: "Always exploring new tech and tools.",
        icon: Sparkles,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
    },
    {
        id: "SPEED_DEMON",
        name: "Speed Demon",
        description: "Focused on performance and efficiency.",
        icon: Zap,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
    },
];

export function BadgeStep({ data, updateData }: BadgeStepProps) {
    return (
        <div className="space-y-8 py-4">
            <div className="space-y-2 text-center">
                <h2 className="text-xl font-bold tracking-tight">Choose Your Starter Badge</h2>
                <p className="text-sm text-muted-foreground">Pick one that reflects your developer personality. This will be shown on your profile!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {starterBadges.map((badge) => {
                    const isSelected = data.badges?.includes(badge.id);
                    const Icon = badge.icon;

                    return (
                        <Button
                            key={badge.id}
                            variant="outline"
                            className={cn(
                                "h-auto flex-col items-start p-5 gap-3 hover:border-primary/50 transition-all text-left",
                                isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                            )}
                            onClick={() => updateData({ ...data, badges: [badge.id] })} // Only one starter badge allowed
                        >
                            <div className={cn("p-2 rounded-lg", badge.bg)}>
                                <Icon className={cn("w-6 h-6", badge.color)} />
                            </div>
                            <div className="space-y-1">
                                <span className="font-bold text-sm block">{badge.name}</span>
                                <span className="text-xs text-muted-foreground font-normal leading-relaxed">{badge.description}</span>
                            </div>
                            {isSelected && (
                                <div className="mt-2 text-xs uppercase tracking-widest font-bold text-primary animate-pulse">
                                    Chosen Path
                                </div>
                            )}
                        </Button>
                    );
                })}
            </div>

            <p className="text-xs text-center text-muted-foreground uppercase tracking-widest pt-4">
                Each badge grants an initial 50 XP bonus!
            </p>
        </div>
    );
}
