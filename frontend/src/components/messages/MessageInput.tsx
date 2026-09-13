"use client"

import { useState, FormEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface MessageInputProps {
  onSend: (content: string) => Promise<void>
  placeholder?: string
}

export default function MessageInput({ onSend, placeholder = "Type a message..." }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const trimmed = content.trim()
    if (!trimmed) return

    try {
      setSending(true)
      await onSend(trimmed)
      setContent('')
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background p-4">
      <div className="flex items-end gap-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={sending}
          className="min-h-[44px] max-h-32 resize-none bg-muted border-border rounded-xl focus:ring-primary/20"
          rows={1}
        />
        <Button
          type="submit"
          disabled={!content.trim() || sending}
          className="h-11 w-11 shrink-0 rounded-xl"
          size="icon"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground/60 mt-2 ml-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  )
}
