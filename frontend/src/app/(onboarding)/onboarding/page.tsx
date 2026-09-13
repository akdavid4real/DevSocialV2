"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { AvatarStep } from "./components/avatar-step";
import { TechProfileStep } from "./components/tech-profile-step";
import { InterestsStep } from "./components/interests-step";
import { BadgeStep } from "./components/badge-step";
import { WelcomeStep } from "./components/welcome-step";
import { getOnboardingStatus, updateOnboarding } from "@/lib/api";

const steps = [
    "Avatar & Bio",
    "Tech Profile",
    "Interest Tags",
    "Starter Badge",
    "Welcome"
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        gender: null as any,
        bio: "",
        avatar: "",
        techCareerPath: "",
        techStack: [] as string[],
        experienceLevel: "BEGINNER",
        interests: [] as string[],
        badges: [] as string[],
        affiliation: "",
    });

    const router = useRouter();
    const progress = (currentStep / steps.length) * 100;

    useEffect(() => {
        setLoading(true);
        getOnboardingStatus()
            .then((res: any) => {
                if (res.onboardingCompleted) {
                    router.push("/dashboard");
                } else {
                    // Merge fetched data with default state
                    setData(prev => ({ ...prev, ...res }));
                }
            })
            .catch(err => {
                console.error("Failed to fetch onboarding status", err);
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleUpdateData = (newData: any) => {
        setData(newData);
    };

    const nextStep = async () => {
        if (currentStep < steps.length) {
            setLoading(true);
            try {
                await updateOnboarding(data);
                setCurrentStep(currentStep + 1);
            } catch (error) {
                console.error("Update failed", error);
                toast.error("Failed to save progress. Please try again.");
            } finally {
                setLoading(false);
            }
        } else {
            router.push("/dashboard");
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (loading && currentStep === 1) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full" />
                    <p className="text-sm text-muted-foreground font-medium">Loading your profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background overflow-x-hidden">
            <div className="w-full max-w-2xl space-y-8">
                <div className="space-y-2 text-center">
                    <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-primary via-purple-500 to-primary bg-zinc-950 bg-clip-text text-transparent animate-gradient-x">
                        Complete Your Profile
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Let's set up your DevSocial experience</p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                        <span>Step {currentStep} of {steps.length}: {steps[currentStep - 1]}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 shadow-inner" />
                </div>

                <Card className="border-border/40 bg-card/40 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border-t-white/10">
                    <CardContent className="pt-6 min-h-[480px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, scale: 0.98, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 1.02, x: -10 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {currentStep === 1 && <AvatarStep data={data} updateData={handleUpdateData} />}
                                {currentStep === 2 && <TechProfileStep data={data} updateData={handleUpdateData} />}
                                {currentStep === 3 && <InterestsStep data={data} updateData={handleUpdateData} />}
                                {currentStep === 4 && <BadgeStep data={data} updateData={handleUpdateData} />}
                                {currentStep === 5 && <WelcomeStep data={data} />}
                            </motion.div>
                        </AnimatePresence>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-border/40 bg-muted/5 p-6 backdrop-blur-md">
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            disabled={currentStep === 1 || currentStep === steps.length || loading}
                            className="font-bold uppercase tracking-widest text-xs hover:bg-primary/5 hover:text-primary transition-all"
                        >
                            Back
                        </Button>
                        <Button
                            onClick={nextStep}
                            disabled={loading}
                            className="px-10 font-bold uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
                        >
                            {loading ? "Saving..." : currentStep === steps.length ? "Finish Journey" : "Next Milestone"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
