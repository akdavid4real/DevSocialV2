"use client"

import { useEffect, useState, useRef } from "react"
import { X, ImageIcon, Video, Hash, BarChart3, Globe, Users, Users2, Lock, Loader2, Link2, ExternalLink, Plus, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import api from "@/lib/api"
import { ApiResponse, User as UserType } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { extractFirstUrl, getLinkPreview, LinkPreview } from "@/lib/link-preview"
import { enhanceText, EnhanceAction } from "@/lib/ai"

interface SimplePostModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmitSuccess?: (post: any) => void
}

function getInitials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "D"
}

export function SimplePostModal({ isOpen, onClose, onSubmitSuccess }: SimplePostModalProps) {
    const { user } = useAuth()
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [mediaItems, setMediaItems] = useState<{ url: string, type: 'IMAGE' | 'VIDEO' }[]>([])
    const [isAnonymous, setIsAnonymous] = useState(false)
    const [tags, setTags] = useState<string[]>([])
    const [mentions, setMentions] = useState<UserType[]>([])
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [enhancingAction, setEnhancingAction] = useState<EnhanceAction | null>(null)
    const [dismissedPreviewUrl, setDismissedPreviewUrl] = useState("")
    const [showPoll, setShowPoll] = useState(false)
    const [pollQuestion, setPollQuestion] = useState("")
    const [pollOptions, setPollOptions] = useState(["", ""])
    const [allowMultipleChoices, setAllowMultipleChoices] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const authorName = user?.displayName?.trim() || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Developer"

    const appendMarker = (marker: string) => {
        setContent(prev => prev + (prev.endsWith(" ") || prev === "" ? marker : ` ${marker}`))
        textareaRef.current?.focus()
    }

    const selectMedia = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept
            fileInputRef.current.click()
        }
    }

    useEffect(() => {
        const url = extractFirstUrl(content)
        if (!url || url === dismissedPreviewUrl) {
            setLinkPreview(null)
            setPreviewLoading(false)
            return
        }

        let cancelled = false
        const timeout = window.setTimeout(async () => {
            setPreviewLoading(true)
            try {
                const preview = await getLinkPreview(url)
                if (!cancelled) setLinkPreview(preview)
            } catch (error) {
                if (!cancelled) setLinkPreview(null)
            } finally {
                if (!cancelled) setPreviewLoading(false)
            }
        }, 600)

        return () => {
            cancelled = true
            window.clearTimeout(timeout)
        }
    }, [content, dismissedPreviewUrl])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const response = await api.post<any, ApiResponse<{ url: string, mimetype: string }>>("/upload", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            const resData = response.data;
            if (response.success && resData) {
                const type = resData.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
                setMediaItems(prev => [...prev, { url: resData.url, type }])
                toast.success("Asset uploaded successfully")
            }
        } catch (error: any) {
            toast.error(error.message || "Upload failed")
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const removeMedia = (index: number) => {
        setMediaItems(prev => prev.filter((_, i) => i !== index))
    }

    const extractHashtags = (text: string): string[] => {
        const hashtagRegex = /#[a-zA-Z0-9_]+/g;
        const matches = text.match(hashtagRegex);
        return matches ? [...new Set(matches.map(match => match.substring(1).toLowerCase()))] : [];
    };

    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [mentionSuggestions, setMentionSuggestions] = useState<UserType[]>([]);
    const [currentMention, setCurrentMention] = useState("");
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleContentChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        
        // Extract hashtags automatically for UI display
        setTags(extractHashtags(newContent));
        
        // Check for @ symbol for mentions - better detection for the current word being typed
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = newContent.substring(0, cursorPosition);
        const words = textBeforeCursor.split(/\s/);
        const currentWord = words[words.length - 1] || "";
        
        if (currentWord.startsWith("@") && currentWord.length >= 1) {
            const query = currentWord.substring(1);
            setCurrentMention(query);
            setShowMentionSuggestions(true);
            
            // Debounced search
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(async () => {
                // If query is empty (just @), maybe fetch recent/featured users? 
                // For now, let's keep it simple.
                if (query.length === 0) {
                    setMentionSuggestions([]);
                    return;
                }
                
                try {
                    const response = await api.get<any, ApiResponse<UserType[]>>(`/users/search?q=${query}`);
                    if (response.success && response.data) {
                        setMentionSuggestions(response.data);
                    } else {
                        setMentionSuggestions([]);
                    }
                } catch (error) {
                    console.error("Failed to search users:", error);
                    setMentionSuggestions([]);
                }
            }, 300);
        } else {
            setShowMentionSuggestions(false);
        }
    };

    const handleSelectMention = (user: UserType) => {
        const cursorPosition = content.length; // Simplified for now
        const textBeforeCursor = content.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");
        
        if (lastAtIndex !== -1) {
            const newContent = textBeforeCursor.substring(0, lastAtIndex) + `@${user.username} ` + content.substring(cursorPosition);
            setContent(newContent);
            setMentions(prev => {
                if (prev.find(m => m.id === user.id)) return prev;
                return [...prev, user];
            });
        }
        setShowMentionSuggestions(false);
    };

    const handleSubmit = async () => {
        const validPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean)
        const canSubmitPoll = showPoll && pollQuestion.trim() && validPollOptions.length >= 2
        if (!content.trim() && mediaItems.length === 0 && !canSubmitPoll) return

        setLoading(true)
        try {
            const imageUrls = mediaItems.filter(m => m.type === 'IMAGE').map(m => m.url)
            const videoUrls = mediaItems.filter(m => m.type === 'VIDEO').map(m => m.url)
            const poll = showPoll && pollQuestion.trim() && validPollOptions.length >= 2 ? {
                question: pollQuestion.trim(),
                options: validPollOptions.map((option, index) => ({
                    id: `option-${index + 1}`,
                    text: option,
                    votes: 0,
                    voters: [],
                })),
                totalVotes: 0,
                settings: {
                    multipleChoice: allowMultipleChoices,
                    maxChoices: allowMultipleChoices ? Math.min(validPollOptions.length, 3) : 1,
                },
            } : undefined

            const response = await api.post<any, ApiResponse<any>>("/posts", {
                content: content.trim(),
                imageUrls,
                videoUrls,
                isAnonymous,
                poll,
                tags,
                mentions: mentions.map(m => m.username)
            })

            if (response.success && response.data) {
                toast.success("Shared with the community! +20 XP")
                setContent("")
                setMediaItems([])
                setTags([])
                setMentions([])
                setLinkPreview(null)
                setDismissedPreviewUrl("")
                setShowPoll(false)
                setPollQuestion("")
                setPollOptions(["", ""])
                setAllowMultipleChoices(false)
                if (onSubmitSuccess) onSubmitSuccess(response.data)
                onClose()
            }
        } catch (error: any) {
            toast.error(error.message || "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const handleEnhanceText = async (action: EnhanceAction) => {
        if (!content.trim()) return

        setEnhancingAction(action)
        try {
            const data = await enhanceText(content, action)
            setContent(data.enhanced)
            setTags(extractHashtags(data.enhanced))
            toast.success("Text updated")
        } catch (error: any) {
            toast.error(error?.message || "Failed to enhance text")
        } finally {
            setEnhancingAction(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[90svh] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl sm:max-w-[540px]">
                <DialogHeader className="shrink-0 px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-sm font-bold uppercase tracking-widest text-foreground/70">New Thread</DialogTitle>
                    <DialogDescription className="sr-only">Share a post with the community. Add media, a poll, or choose to post anonymously.</DialogDescription>
                </DialogHeader>

                <div className="min-h-0 overflow-y-auto p-5 space-y-4">
                    <div className="flex gap-3">
                        <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                            <AvatarImage src={user?.avatar} alt={authorName} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold uppercase">{getInitials(authorName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-3 relative">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold tracking-tight text-foreground">{authorName}</span>
                                <Badge variant="outline" className="h-4 px-1.5 bg-white/5 border-white/10 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                    <Globe className="h-2 w-2 mr-1" />
                                    Global
                                </Badge>
                            </div>
                            <Textarea
                                ref={textareaRef}
                                aria-label="Post content"
                                maxLength={2000}
                                placeholder="What's on your mind?..."
                                value={content}
                                onChange={handleContentChange}
                                className="min-h-[88px] sm:min-h-[104px] border-none bg-transparent p-0 text-base focus-visible:ring-0 placeholder:text-muted-foreground/60 resize-none text-foreground leading-relaxed font-medium"
                                autoFocus
                            />

                            {/* Mention Suggestions - Absolutely Positioned */}
                            {showMentionSuggestions && (
                                <div className="absolute top-[100%] left-0 w-full mt-2 bg-[#0A0A0B]/90 backdrop-blur-2xl border border-white/5 rounded-xl py-2 max-h-64 overflow-y-auto shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-white/10">
                                    {mentionSuggestions.length > 0 ? (
                                        mentionSuggestions.map((suggestionUser, idx) => (
                                            <div
                                                key={idx}
                                                className="px-4 py-2.5 hover:bg-white/[0.04] active:bg-white/[0.08] cursor-pointer flex items-center gap-3 transition-all group border-l-2 border-transparent hover:border-primary/50"
                                                onClick={() => handleSelectMention(suggestionUser)}
                                            >
                                                <Avatar className="h-8 w-8 border border-white/10 group-hover:border-primary/30 transition-colors shadow-sm">
                                                    <AvatarImage src={suggestionUser.avatar} />
                                                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold uppercase">
                                                        {getInitials(suggestionUser.displayName || suggestionUser.username)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[13px] font-bold text-foreground leading-none truncate">
                                                            {suggestionUser.displayName || suggestionUser.username}
                                                        </span>
                                                        <Badge variant="outline" className="h-3.5 px-1 bg-white/5 border-white/5 text-[7px] font-semibold uppercase tracking-tighter text-muted-foreground/60 hidden group-hover:flex">
                                                            User
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground/60 font-medium leading-none mt-1 group-hover:text-muted-foreground transition-colors">
                                                        @{suggestionUser.username}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center flex flex-col items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground/60">
                                                <Users2 className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                                                {currentMention.length > 0 ? "No users found" : "Type to mention"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Media Grid */}
                    {mediaItems.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto no-scrollbar rounded-2xl">
                            {mediaItems.map((item, idx) => (
                                <div key={idx} className="relative group aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-white/5">
                                    {item.type === 'IMAGE' ? (
                                        <img src={item.url} alt="Upload" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                        <video src={item.url} className="h-full w-full object-cover" />
                                    )}
                                    <button
                                        onClick={() => removeMedia(idx)}
                                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-foreground border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80 hover:scale-110"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    <div className="absolute bottom-2 left-2">
                                        <Badge className="bg-black/40 backdrop-blur-md border-white/5 text-[8px] font-semibold uppercase tracking-widest h-5">
                                            {item.type}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {uploading && (
                                <div className="aspect-video rounded-2xl border-2 border-primary/20 border-dashed flex items-center justify-center bg-primary/5 animate-pulse">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                                </div>
                            )}
                        </div>
                    )}


                    {showPoll && (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Poll</div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPoll(false)
                                        setPollQuestion("")
                                        setPollOptions(["", ""])
                                        setAllowMultipleChoices(false)
                                    }}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <input
                                value={pollQuestion}
                                onChange={(event) => setPollQuestion(event.target.value)}
                                placeholder="Ask a question"
                                maxLength={120}
                                className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                            />
                            <div className="space-y-2">
                                {pollOptions.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            value={option}
                                            onChange={(event) => setPollOptions((prev) => prev.map((item, optionIndex) => optionIndex === index ? event.target.value : item))}
                                            placeholder={`Option ${index + 1}`}
                                            maxLength={80}
                                            className="h-9 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none focus:border-primary/40"
                                        />
                                        {pollOptions.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => setPollOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index))}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={pollOptions.length >= 4}
                                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                                    className="h-8 rounded-xl text-xs"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add option
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setAllowMultipleChoices((value) => !value)}
                                    className={cn(
                                        "rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                                        allowMultipleChoices ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground"
                                    )}
                                >
                                    Multi-choice {allowMultipleChoices ? "on" : "off"}
                                </button>
                            </div>
                        </div>
                    )}

                    {(previewLoading || linkPreview) && (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                            {previewLoading ? (
                                <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading link preview...
                                </div>
                            ) : linkPreview ? (
                                <div className="relative flex gap-3 p-3">
                                    {linkPreview.image ? (
                                        <img src={linkPreview.image} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover bg-white/5" />
                                    ) : (
                                        <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-white/5">
                                            <Link2 className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1 space-y-1 pr-8">
                                        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                            <ExternalLink className="h-3 w-3" />
                                            {linkPreview.siteName}
                                        </div>
                                        <div className="line-clamp-2 text-sm font-semibold text-foreground">{linkPreview.title}</div>
                                        {linkPreview.description ? (
                                            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{linkPreview.description}</p>
                                        ) : null}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDismissedPreviewUrl(linkPreview.url)
                                            setLinkPreview(null)
                                        }}
                                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-muted-foreground hover:text-foreground"
                                        type="button"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}

                    <details className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Assist · optional</span>
                        </summary>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {(["professional", "casual", "hashtags"] as EnhanceAction[]).map((action) => (
                                <Button key={action} type="button" size="sm" variant="ghost"
                                    disabled={!content.trim() || !!enhancingAction}
                                    onClick={() => handleEnhanceText(action)}
                                    className="h-8 rounded-lg px-2 text-xs text-muted-foreground">
                                    {enhancingAction === action ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                                    {action === "hashtags" ? "Add hashtags" : action === "professional" ? "Professional tone" : "Casual tone"}
                                </Button>
                            ))}
                        </div>
                    </details>

                    {/* Tags and Mentions */}
                    {(tags.length > 0 || mentions.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag, idx) => (
                                <Badge key={`tag-${idx}`} variant="outline" className="h-6 px-3 bg-primary/10 border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                                    <Hash className="h-3 w-3" />
                                    {tag}
                                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="text-primary/50 hover:text-primary">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            {mentions.map((mention, idx) => (
                                <Badge key={`mention-${idx}`} variant="outline" className="h-6 px-3 bg-blue-500/10 border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                                    @{mention.username}
                                    <button onClick={() => setMentions(mentions.filter(m => m.id !== mention.id))} className="text-blue-400/50 hover:text-blue-400">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                </div>

                <div className="shrink-0 space-y-3 border-t border-border bg-muted/20 px-5 py-4">
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" aria-label="Upload media" />
                    <div className="flex flex-wrap items-center gap-1" aria-label="Post tools">
                        <Button type="button" variant="ghost" size="sm" disabled={uploading}
                            onClick={() => selectMedia("image/*")} className="h-9 gap-1.5 px-2 text-xs text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />Photo
                        </Button>
                        <Button type="button" variant="ghost" size="sm" disabled={uploading}
                            onClick={() => selectMedia("video/*")} className="h-9 gap-1.5 px-2 text-xs text-muted-foreground">
                            <Video className="h-4 w-4" />Video
                        </Button>
                        <Button type="button" variant="ghost" size="sm" aria-pressed={showPoll}
                            onClick={() => setShowPoll(value => !value)}
                            className={cn("h-9 gap-1.5 px-2 text-xs text-muted-foreground", showPoll && "bg-primary/10 text-primary")}>
                            <BarChart3 className="h-4 w-4" />Poll
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendMarker("#")}
                            className="h-9 gap-1.5 px-2 text-xs text-muted-foreground">
                            <Hash className="h-4 w-4" />Hashtag
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendMarker("@")}
                            className="h-9 gap-1.5 px-2 text-xs text-muted-foreground">
                            <span className="text-base">@</span>Mention
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button type="button" variant="ghost" size="sm" role="switch" aria-checked={isAnonymous}
                            onClick={() => setIsAnonymous(value => !value)}
                            className={cn("h-9 gap-2 px-2 text-xs", isAnonymous ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                            {isAnonymous ? <Lock className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            Post anonymously
                            <span aria-hidden="true" className={cn("relative h-4 w-7 rounded-full transition-colors", isAnonymous ? "bg-primary" : "bg-muted-foreground/30")}>
                                <span className={cn("absolute left-0 top-0.5 h-3 w-3 rounded-full bg-white transition-transform", isAnonymous ? "translate-x-3.5" : "translate-x-0.5")} />
                            </span>
                        </Button>
                        <div className="ml-auto flex items-center gap-3">
                            <span className={cn("text-xs tabular-nums", content.length > 1800 ? "text-orange-500" : "text-muted-foreground")}>
                                {content.length}/2000
                            </span>
                            <Button onClick={handleSubmit}
                                disabled={(!content.trim() && mediaItems.length === 0 && !showPoll) || loading || uploading || !!enhancingAction || (showPoll && (!pollQuestion.trim() || pollOptions.filter(option => option.trim()).length < 2))}
                                className="h-10 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Post
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
