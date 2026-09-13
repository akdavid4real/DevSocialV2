"use client"

import { useState, useRef } from "react"
import { ImageIcon, Loader2, Send, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import api from "@/lib/api"

const MAX_COMMENT_LENGTH = 500
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

interface CommentInputProps {
    postId: string
    parentId?: string | null
    onSubmitSuccess: () => void
    authorAvatar?: string
    currentUserId?: string
    placeholder?: string
}

export default function CommentInput({
    postId,
    parentId,
    onSubmitSuccess,
    authorAvatar,
    currentUserId,
    placeholder = "Signal back..."
}: CommentInputProps) {
    const [newComment, setNewComment] = useState("")
    const [commentMedia, setCommentMedia] = useState<{ url: string, type: 'IMAGE' | 'VIDEO' }[]>([])
    const [uploadingCommentMedia, setUploadingCommentMedia] = useState(false)
    const [submittingComment, setSubmittingComment] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error("File too large. Maximum size is 10MB.")
            return
        }

        // Validate file type
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
        
        if (!isImage && !isVideo) {
            toast.error("Invalid file type. Only images and videos are allowed.")
            return
        }

        setUploadingCommentMedia(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const response = await api.post<any, any>("/upload", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }) as any
            const resData = response.data || response
            if (resData && resData.url) {
                const type = resData.mimetype?.startsWith('video/') ? 'VIDEO' : 'IMAGE'
                setCommentMedia(prev => [...prev, { url: resData.url, type }])
                toast.success("Asset attached.")
            }
        } catch (error: any) {
            toast.error(error.message || "Upload failed")
        } finally {
            setUploadingCommentMedia(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const removeMedia = (index: number) => {
        setCommentMedia(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!newComment.trim() && commentMedia.length === 0) return
        
        // Validate comment length
        if (newComment.length > MAX_COMMENT_LENGTH) {
            toast.error(`Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`)
            return
        }
        
        setSubmittingComment(true)
        try {
            const imageUrls = commentMedia.filter(m => m.type === 'IMAGE').map(m => m.url)
            const videoUrls = commentMedia.filter(m => m.type === 'VIDEO').map(m => m.url)

            const response = await api.post(`/posts/${postId}/comments`, {
                content: newComment,
                parentId: parentId || undefined,
                imageUrls,
                videoUrls
            })

            setNewComment("")
            setCommentMedia([])
            onSubmitSuccess()
            
            // Show XP notification
            const data = response.data || response
            const xpAwarded = data.xpAwarded || (parentId ? 3 : 5)
            toast.success(
                <div className="flex items-center gap-2">
                    <span>Signal added to thread</span>
                    <span className="text-primary font-semibold">+{xpAwarded} XP</span>
                </div>,
                {
                    duration: 3000,
                    icon: '🎯',
                }
            )
        } catch (error) {
            toast.error("Failed to commit comment.")
        } finally {
            setSubmittingComment(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.stopPropagation()
            handleSubmit()
        }
    }

    return (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Previews */}
            {commentMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-11">
                    {commentMedia.map((item, idx) => (
                        <div key={idx} className="relative group h-20 w-20 rounded-xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
                            {item.type === 'IMAGE' ? (
                                <img src={item.url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <video src={item.url} className="h-full w-full object-cover" />
                            )}
                            <button
                                onClick={() => removeMedia(idx)}
                                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-foreground border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {uploadingCommentMedia && (
                        <div className="h-20 w-20 rounded-xl border-2 border-primary/20 border-dashed flex items-center justify-center bg-primary/5 animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin text-primary/50" />
                        </div>
                    )}
                </div>
            )}

            <div className="relative flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded-lg shrink-0 border border-white/10">
                    <AvatarImage src={authorAvatar} />
                    <AvatarFallback className="text-xs uppercase">U</AvatarFallback>
                </Avatar>
                <div className="relative flex-1 group flex items-center gap-2">
                    <div className="relative flex-1">
                        <Input
                            placeholder={placeholder}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            maxLength={MAX_COMMENT_LENGTH}
                            className="bg-white/5 border-white/5 h-10 px-4 pr-10 rounded-xl text-xs placeholder:text-muted-foreground/60 italic focus:bg-white/10 focus:border-primary/30 transition-all text-foreground"
                        />
                        {newComment.length > 0 && (
                            <div className="absolute -bottom-5 right-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                                {newComment.length}/{MAX_COMMENT_LENGTH}
                            </div>
                        )}
                        <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingCommentMedia}
                                className="h-7 w-7 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                            >
                                <ImageIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={(!newComment.trim() && commentMedia.length === 0) || submittingComment}
                                className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-foreground disabled:opacity-30 transition-all shadow-lg"
                            >
                                {submittingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                />
            </div>
        </div>
    )
}
