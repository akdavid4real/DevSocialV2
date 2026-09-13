"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface ProfileData {
    displayName?: string
    bio?: string
    location?: string
    website?: string
    avatar?: string
    bannerUrl?: string
    githubUsername?: string
    linkedinUrl?: string
    affiliation?: string
    techStack?: string[]
    interests?: string[]
}

interface EditProfileModalProps {
    isOpen: boolean
    onClose: () => void
    profile: ProfileData
    onSave: (data: ProfileData) => void
}

export default function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
    const [formData, setFormData] = useState({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        avatar: profile.avatar || '',
        bannerUrl: profile.bannerUrl || '',
        githubUsername: profile.githubUsername || '',
        linkedinUrl: profile.linkedinUrl || '',
        affiliation: profile.affiliation || '',
        techStack: profile.techStack?.join(', ') || '',
        interests: profile.interests?.join(', ') || ''
    })
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState<string | null>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'bannerUrl') => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(type)
        const fd = new FormData()
        fd.append('file', file)

        try {
            const response: any = await api.post('/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            if (response.success && response.data) {
                setFormData(prev => ({ ...prev, [type]: response.data.url }))
            }
        } catch (err) {
            console.error('Upload failed:', err)
        } finally {
            setUploading(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const payload = {
                ...formData,
                techStack: formData.techStack.split(',').map(s => s.trim()).filter(Boolean),
                interests: formData.interests.split(',').map(s => s.trim()).filter(Boolean)
            }
            const response: any = await api.patch('/users/profile', payload)
            if (response.success) {
                onSave(response.data)
                onClose()
            }
        } catch (error: any) {
            console.error('Failed to update profile:', error)
            alert(error.response?.data?.message || 'Update failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-2xl border-border text-foreground overflow-hidden rounded-[32px] p-0 shadow-2xl">
                <DialogHeader className="p-6 border-b border-border">
                    <DialogTitle className="text-xl font-semibold tracking-tight">Edit Profile</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Display Name</Label>
                        <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                            className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                            placeholder="Your public name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Bio</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="bg-input border-input rounded-2xl min-h-[100px] focus:ring-primary/20 resize-none"
                            placeholder="Tell the hub about yourself..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                                placeholder="Region"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="affiliation" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Organization</Label>
                            <Input
                                id="affiliation"
                                value={formData.affiliation}
                                onChange={(e) => setFormData(prev => ({ ...prev, affiliation: e.target.value }))}
                                className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                                placeholder="Company/School"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="githubUsername" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">GitHub</Label>
                            <Input
                                id="githubUsername"
                                value={formData.githubUsername}
                                onChange={(e) => setFormData(prev => ({ ...prev, githubUsername: e.target.value }))}
                                className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                                placeholder="username"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="linkedinUrl" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">LinkedIn</Label>
                            <Input
                                id="linkedinUrl"
                                value={formData.linkedinUrl}
                                onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                                className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                                placeholder="linkedin.com/in/..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="website" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Website</Label>
                        <Input
                            id="website"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="techStack" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Tech Stack</Label>
                        <Input
                            id="techStack"
                            value={formData.techStack}
                            onChange={(e) => setFormData(prev => ({ ...prev, techStack: e.target.value }))}
                            className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                            placeholder="React, Node.js, Python (comma separated)"
                        />
                        <p className="text-xs text-muted-foreground/60 ml-1">Separate with commas</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="interests" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Interests</Label>
                        <Input
                            id="interests"
                            value={formData.interests}
                            onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                            className="bg-input border-input rounded-2xl h-12 focus:ring-primary/20"
                            placeholder="AI, Web3, Mobile Dev (comma separated)"
                        />
                        <p className="text-xs text-muted-foreground/60 ml-1">Separate with commas</p>
                    </div>

                    <div className="space-y-4 pt-2">
                        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Profile Images</Label>

                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground/60 uppercase">Avatar</Label>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                        <img src={formData.avatar || '/placeholder-avatar.png'} className="h-full w-full object-cover" />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploading === 'avatar'}
                                        onClick={() => document.getElementById('avatar-upload')?.click()}
                                        className="h-8 rounded-xl text-xs font-semibold uppercase tracking-widest border-white/5 bg-white/5"
                                    >
                                        {uploading === 'avatar' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update Avatar'}
                                    </Button>
                                    <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'avatar')} />
                                </div>
                            </div>

                            <div className="flex-1 space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground/60 uppercase">Banner</Label>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-16 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                        <img src={formData.bannerUrl || '/placeholder-banner.png'} className="h-full w-full object-cover" />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={uploading === 'bannerUrl'}
                                        onClick={() => document.getElementById('banner-upload')?.click()}
                                        className="h-8 rounded-xl text-xs font-semibold uppercase tracking-widest border-white/5 bg-white/5"
                                    >
                                        {uploading === 'bannerUrl' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Update Banner'}
                                    </Button>
                                    <input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'bannerUrl')} />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-6 bg-muted/20 border-t border-border flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="rounded-full px-6 h-10 text-xs font-semibold uppercase tracking-widest"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded-full px-8 h-10 text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-primary to-purple-600 border-0 hover:scale-105 shadow-xl shadow-primary/20 transition-transform"
                    >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
