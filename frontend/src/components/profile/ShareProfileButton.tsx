"use client"

import { useState } from 'react'
import { Share2, Link as LinkIcon, Check, Twitter, Linkedin, Facebook } from 'lucide-react'
import { toast } from 'sonner'

interface ShareProfileButtonProps {
    username: string
    displayName?: string
}

export default function ShareProfileButton({ username, displayName }: ShareProfileButtonProps) {
    const [showMenu, setShowMenu] = useState(false)
    const [copied, setCopied] = useState(false)

    const profileUrl = `${window.location.origin}/@${username}`
    const shareText = `Check out ${displayName || username}'s profile on DevSocial`

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(profileUrl)
            setCopied(true)
            toast.success('Profile link copied!')
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error('Failed to copy link')
        }
    }

    const handleShareTwitter = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`
        window.open(url, '_blank', 'width=550,height=420')
        setShowMenu(false)
    }

    const handleShareLinkedIn = () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`
        window.open(url, '_blank', 'width=550,height=420')
        setShowMenu(false)
    }

    const handleShareFacebook = () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`
        window.open(url, '_blank', 'width=550,height=420')
        setShowMenu(false)
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-6 h-11 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-semibold uppercase tracking-widest text-foreground"
            >
                <Share2 className="h-4 w-4" />
                Share
            </button>

            {showMenu && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-[24px] bg-[#0A0A0B] border border-white/10 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                            {/* Copy Link */}
                            <button
                                onClick={handleCopyLink}
                                className="w-full flex items-center gap-3 p-3 rounded-[16px] hover:bg-white/5 transition-all text-left group"
                            >
                                {copied ? (
                                    <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-green-400" />
                                    </div>
                                ) : (
                                    <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                        <LinkIcon className="h-4 w-4 text-foreground/70" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </p>
                                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                        Share profile URL
                                    </p>
                                </div>
                            </button>

                            <div className="h-px bg-white/5 my-2" />

                            {/* Twitter */}
                            <button
                                onClick={handleShareTwitter}
                                className="w-full flex items-center gap-3 p-3 rounded-[16px] hover:bg-white/5 transition-all text-left group"
                            >
                                <div className="h-9 w-9 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center group-hover:bg-[#1DA1F2]/20 transition-colors">
                                    <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Twitter</p>
                                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                        Share on X
                                    </p>
                                </div>
                            </button>

                            {/* LinkedIn */}
                            <button
                                onClick={handleShareLinkedIn}
                                className="w-full flex items-center gap-3 p-3 rounded-[16px] hover:bg-white/5 transition-all text-left group"
                            >
                                <div className="h-9 w-9 rounded-full bg-[#0A66C2]/10 flex items-center justify-center group-hover:bg-[#0A66C2]/20 transition-colors">
                                    <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">LinkedIn</p>
                                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                        Share professionally
                                    </p>
                                </div>
                            </button>

                            {/* Facebook */}
                            <button
                                onClick={handleShareFacebook}
                                className="w-full flex items-center gap-3 p-3 rounded-[16px] hover:bg-white/5 transition-all text-left group"
                            >
                                <div className="h-9 w-9 rounded-full bg-[#1877F2]/10 flex items-center justify-center group-hover:bg-[#1877F2]/20 transition-colors">
                                    <Facebook className="h-4 w-4 text-[#1877F2]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Facebook</p>
                                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                        Share with friends
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
