"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { X, Plus, GraduationCap } from "lucide-react";
import { getAffiliations } from "@/lib/api";

interface TechProfileStepProps {
    data: any;
    updateData: (data: any) => void;
}

const experienceLevels = [
    { id: "BEGINNER", label: "Beginner", description: "Learning the basics" },
    { id: "INTERMEDIATE", label: "Intermediate", description: "Building projects" },
    { id: "ADVANCED", label: "Advanced", description: "Professional experience" },
    { id: "EXPERT", label: "Expert", description: "Thought leader / Senior+" },
];

const careerPaths = [
    "Frontend Developer",
    "Backend Developer",
    "Fullstack Developer",
    "Mobile Developer",
    "DevOps Engineer",
    "Data Scientist",
    "UI/UX Designer",
    "Cybersecurity Analyst",
    "Cloud Architect",
    "Product Manager",
    "Other",
];

export function TechProfileStep({ data, updateData }: TechProfileStepProps) {
    const [tagInput, setTagInput] = useState("");
    const [affiliations, setAffiliations] = useState<any>(null);

    useEffect(() => {
        getAffiliations()
            .then((res: any) => {
                if (res.success) setAffiliations(res.data);
            })
            .catch(err => console.error("Failed to fetch affiliations", err));
    }, []);

    const addTag = () => {
        const tag = tagInput.trim();
        if (tag && !data.techStack?.includes(tag)) {
            updateData({ ...data, techStack: [...(data.techStack || []), tag] });
        }
        setTagInput("");
    };

    const removeTag = (tag: string) => {
        updateData({ ...data, techStack: (data.techStack || []).filter((t: string) => t !== tag) });
    };

    return (
        <div className="space-y-8 py-4">
            <div className="space-y-4">
                <Label className="text-base font-semibold">What's your experience level?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {experienceLevels.map((lvl) => (
                        <Button
                            key={lvl.id}
                            variant="outline"
                            className={cn(
                                "h-auto flex-col items-start p-4 gap-1 hover:border-primary/50 transition-all text-left",
                                data.experienceLevel === lvl.id && "border-primary bg-primary/5 ring-1 ring-primary"
                            )}
                            onClick={() => updateData({ ...data, experienceLevel: lvl.id })}
                        >
                            <span className="font-semibold text-sm">{lvl.label}</span>
                            <span className="text-xs text-muted-foreground font-normal">{lvl.description}</span>
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-base font-semibold">Primary Career Path</Label>
                <Select
                    value={data.techCareerPath}
                    onValueChange={(val) => updateData({ ...data, techCareerPath: val })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select your current or desired role" />
                    </SelectTrigger>
                    <SelectContent>
                        {careerPaths.map((path) => (
                            <SelectItem key={path} value={path}>{path}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4">
                <Label className="text-base font-semibold">Tech Stack (Skills)</Label>
                <div className="flex gap-2">
                    <Input
                        placeholder="e.g. React, Node.js, Python..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="secondary" onClick={addTag}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {data.techStack?.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="px-3 py-1 gap-2 border-primary/20 bg-primary/5 text-primary">
                            {tag}
                            <button
                                onClick={() => removeTag(tag)}
                                className="hover:text-destructive transition-colors"
                                title="Remove"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    ))}
                    {(!data.techStack || data.techStack.length === 0) && (
                        <p className="text-xs text-muted-foreground italic">Add at least 3 skills to stand out.</p>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-base font-semibold">University / Bootcamp</Label>
                <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search institution..."
                        className="pl-9"
                        value={data.affiliation || ""}
                        onChange={(e) => updateData({ ...data, affiliation: e.target.value })}
                    />
                    {affiliations && (
                        <p className="text-xs text-muted-foreground mt-1 px-1">
                            Available: {Object.keys(affiliations).length} Categories
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
