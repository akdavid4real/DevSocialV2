"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface InterestsStepProps {
    data: any;
    updateData: (data: any) => void;
}

const interestCategories = [
    {
        name: "Web Development",
        tags: ["React", "Vue", "Angular", "Next.js", "TypeScript", "Node.js", "CSS Art", "Astro", "Remix"],
    },
    {
        name: "Backend & Infrastructure",
        tags: ["Go", "Rust", "Python", "Kubernetes", "Docker", "Serverless", "Postgres", "Redis", "Kafka"],
    },
    {
        name: "Design & UX",
        tags: ["Figma", "UI Design", "UX Research", "Motion Graphics", "Accessibility", "Design Systems"],
    },
    {
        name: "Emerging Tech",
        tags: ["AI/ML", "Web3", "Blockchain", "AR/VR", "IoT", "Quantum Computing", "Open Source"],
    },
    {
        name: "Career & Growth",
        tags: ["Freelancing", "Startups", "Interview Prep", "Product Management", "Soft Skills", "Leadership"],
    },
];

export function InterestsStep({ data, updateData }: InterestsStepProps) {
    const toggleInterest = (tag: string) => {
        const interests = data.interests || [];
        if (interests.includes(tag)) {
            updateData({ ...data, interests: interests.filter((i: string) => i !== tag) });
        } else {
            updateData({ ...data, interests: [...interests, tag] });
        }
    };

    return (
        <div className="space-y-8 py-4">
            <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Personalize your feed</h2>
                <p className="text-sm text-muted-foreground">Select topics you're interested in to see more relevant content.</p>
            </div>

            <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                {interestCategories.map((category) => (
                    <div key={category.name} className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wider">{category.name}</h3>
                        <div className="flex flex-wrap gap-2">
                            {category.tags.map((tag) => {
                                const isSelected = data.interests?.includes(tag);
                                return (
                                    <Badge
                                        key={tag}
                                        variant={isSelected ? "default" : "outline"}
                                        className={cn(
                                            "px-3 py-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 gap-1.5",
                                            isSelected ? "bg-primary shadow-md" : "hover:bg-primary/5 hover:border-primary/40"
                                        )}
                                        onClick={() => toggleInterest(tag)}
                                    >
                                        {tag}
                                        {isSelected && <Check className="w-3 h-3" />}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-center text-muted-foreground italic pt-2">
                Selected {data.interests?.length || 0} interests. You can always change these later.
            </p>
        </div>
    );
}
