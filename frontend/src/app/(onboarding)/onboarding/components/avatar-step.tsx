"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User, UserCircle2, ImageIcon } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface AvatarStepProps {
    data: any;
    updateData: (data: any) => void;
}

const genders = [
    { id: "MALE", label: "Male" },
    { id: "FEMALE", label: "Female" },
    { id: "OTHER", label: "Other / Prefer not to say" },
];

export function AvatarStep({ data, updateData }: AvatarStepProps) {
    return (
        <div className="space-y-8 py-4">
            <div className="space-y-4">
                <Label className="text-base font-semibold">How do you identify?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {genders.map((gender) => (
                        <Button
                            key={gender.id}
                            variant="outline"
                            className={cn(
                                "h-20 flex-col gap-2 hover:border-primary/50 transition-all",
                                data.gender === gender.id && "border-primary bg-primary/5 ring-1 ring-primary"
                            )}
                            onClick={() => updateData({ ...data, gender: gender.id })}
                        >
                            <UserCircle2 className={cn(
                                "w-6 h-6",
                                data.gender === gender.id ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className="text-xs">{gender.label}</span>
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label htmlFor="bio" className="text-base font-semibold">Tell us about yourself</Label>
                    <span className="text-xs text-muted-foreground">
                        {data.bio?.length || 0}/250
                    </span>
                </div>
                <Textarea
                    id="bio"
                    placeholder="I'm a fullstack developer passionate about building..."
                    className="resize-none h-32"
                    maxLength={250}
                    value={data.bio || ""}
                    onChange={(e) => updateData({ ...data, bio: e.target.value })}
                />
                <p className="text-xs text-muted-foreground italic">
                    Tip: Good bios include your current role and what you're learning.
                </p>
            </div>

            <div className="space-y-4 pt-4">
                <Label className="text-base font-semibold">Digital Persona (Avatar)</Label>
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/60 rounded-[32px] bg-muted/10 gap-6 transition-all hover:bg-muted/20 group">
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-2xl overflow-hidden">
                            {data.avatar ? (
                                <img src={data.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-primary/60" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-primary rounded-full border-4 border-background flex items-center justify-center shadow-lg">
                            <ImageIcon className="w-3.5 h-3.5 text-foreground" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">Identity Core</h3>
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-tighter">Upload a high-fidelity representative of your dev soul</p>
                    </div>

                    <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            const formData = new FormData();
                            formData.append("file", file);

                            try {
                                const response = await api.post<any, any>("/upload", formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                if (response.success && response.data?.url) {
                                    updateData({ ...data, avatar: response.data.url });
                                    toast.success("Identity asset localized.");
                                }
                            } catch (err) {
                                toast.error("Upload failure.");
                            }
                        }}
                    />

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="rounded-full px-8 font-semibold uppercase tracking-widest text-xs shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        Initialize Upload
                    </Button>
                </div>
            </div>
        </div>
    );
}
