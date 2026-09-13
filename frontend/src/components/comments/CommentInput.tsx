"use client"

import { useState } from 'react'
import { Send, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from '@/components/ui/image'
import api from '@/lib/api'
import { toast } from 'sonner'

interface CommentInputProps {
    currentUserAvatar?: string
    placeholder?: string
    onSubmit: (content: string, imageUrls?: string[]) => Promise<void>
    onCancel?: () => void
    autoFocus?: boolean
}

export default function CommentInput({
    currentUserAvatar,
    placeholder = 'Write a comment...',
    onSubmit,
    onCancel,
    autoFocus = false
}: CommentInputProps) {
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [imageUrls, setImageUrls] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        try {
            const formData = new FormData()
            Array.from(files).forEach(file => {
                formData.append('files', file)
            })

            const response: any = await api.post('/storage/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            const urls = response.data?.urls || response.urls || []
            setImageUrls(prev => [...prev, ...urls])
            toast.success('Images uploaded')
        } catch (error) {
            console.error('Upload failed:', error)
            toast.error('Failed to upload images')
        } finally {
            setUploading(false)
        }
    }

    const removeImage = (index: number) => {
        setImageUrls(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if ((!content.trim() && imageUrls.length === 0) || isSubmitting) return

        setIsSubmitting(true)
        try {
            await onSubmit(content, imageUrls)
            setContent('')
            setImageUrls([])
        } catch (error) {
            console.error('Failed to submit comment:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <div className="flex gap-3">
            {currentUserAvatar && (
                <Image
                    src={currentUserAvatar}
                    alt="Your avatar"
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-white/10 flex-shrink-0"
                />
            )}

            <div className="flex-1 p-4 rounded-[20px] bg-white/[0.02] border border-white/5 focus-within:border-primary/50 transition-colors">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    rows={3}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none"
                />

                {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        {imageUrls.map((url, index) => (
                            <div key={index} className="relative group">
                                <Image
                                    src={url}
                                    alt={`Upload ${index + 1}`}
                                    width={200}
                                    height={150}
                                    className="rounded-[12px] border border-white/5 w-full h-auto"
                                />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={uploading || isSubmitting}
                            />
                            <div className="h-8 w-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                ) : (
                                    <ImageIcon className="h-4 w-4 text-muted-foreground/50 hover:text-primary transition-colors" />
                                )}
                            </div>
                        </label>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                            {content.length}/1000
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded-[12px] text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground hover:bg-white/5 transition-[background-color,color] disabled:opacity-50"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={(!content.trim() && imageUrls.length === 0) || isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-primary text-foreground text-xs font-semibold uppercase tracking-wider hover:bg-primary/90 transition-[background-color] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Posting...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Post</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
