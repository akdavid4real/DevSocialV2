"use client"

import { useState } from 'react'
import { ChevronDown, ChevronUp, Briefcase, GraduationCap, Code, BookOpen } from 'lucide-react'

interface AboutSectionProps {
    bio?: string
    skills?: string[]
    interests?: string[]
    currentLearning?: string[]
    affiliation?: string
    experienceLevel?: string
}

export default function AboutSection({ 
    bio, 
    skills = [], 
    interests = [], 
    currentLearning = [],
    affiliation,
    experienceLevel
}: AboutSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const hasContent = bio || skills.length > 0 || interests.length > 0 || currentLearning.length > 0

    if (!hasContent) return null

    return (
        <section className="space-y-3 sm:space-y-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 rounded-[24px] sm:rounded-[32px] bg-card border-border hover:bg-card/80 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">About</h3>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                            {isExpanded ? 'Hide Details' : 'View Details'}
                        </p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                )}
            </button>

            {isExpanded && (
                <div className="space-y-4 sm:space-y-6 p-4 sm:p-5 md:p-6 rounded-[24px] sm:rounded-[32px] bg-card border-border animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Bio */}
                    {bio && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary" />
                                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Bio</h4>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed pl-3">{bio}</p>
                        </div>
                    )}

                    {/* Experience & Affiliation */}
                    {(experienceLevel || affiliation) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {experienceLevel && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                        <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Level</h4>
                                    </div>
                                    <p className="text-xs font-bold text-foreground tracking-wider pl-5">{experienceLevel}</p>
                                </div>
                            )}
                            {affiliation && affiliation !== 'Other' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                                        <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Affiliation</h4>
                                    </div>
                                    <p className="text-xs font-bold text-foreground tracking-wider pl-5">{affiliation}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Code className="h-3.5 w-3.5 text-primary" />
                                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Skills</h4>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-5">
                                {skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary tracking-wider"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interests */}
                    {interests.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-primary" />
                                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Interests</h4>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-3">
                                {interests.map((interest) => (
                                    <span
                                        key={interest}
                                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-foreground/70 tracking-wider"
                                    >
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Currently Learning */}
                    {currentLearning.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60">Currently Learning</h4>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-5">
                                {currentLearning.map((item) => (
                                    <span
                                        key={item}
                                        className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-400 tracking-wider"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
