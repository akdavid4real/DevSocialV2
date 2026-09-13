"use client"

import { useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RPMAvatarModalProps {
    isOpen: boolean
    onClose: () => void
    onAvatarExported: (avatarUrl: string) => void
}

export default function RPMAvatarModal({ isOpen, onClose, onAvatarExported }: RPMAvatarModalProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        function receiveMessage(event: MessageEvent) {
            if (event.data?.source !== "readyplayerme") return

            if (event.data.eventName === "v1.avatar.exported" && event.data.data?.url) {
                onAvatarExported(event.data.data.url)
                onClose()
            }
        }

        window.addEventListener("message", receiveMessage)
        return () => window.removeEventListener("message", receiveMessage)
    }, [onAvatarExported, onClose])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="h-[80vh] w-[calc(100vw-2rem)] max-w-4xl p-0 overflow-hidden">
                <DialogHeader className="border-b border-border px-5 py-4">
                    <DialogTitle>Create 3D Avatar</DialogTitle>
                </DialogHeader>
                <iframe
                    ref={iframeRef}
                    src="https://devsocial.readyplayer.me/avatar?frameApi"
                    className="h-full min-h-0 w-full border-0"
                    allow="camera *; microphone *"
                    title="Ready Player Me Avatar Creator"
                />
            </DialogContent>
        </Dialog>
    )
}
