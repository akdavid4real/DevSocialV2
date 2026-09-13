"use client"

import { useState } from "react"
import { Brain, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { summarizePost, explainPost } from "@/lib/ai"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type PostAIActionsProps = {
  postContent: string
  className?: string
}

export function PostAIActions({ postContent, className }: PostAIActionsProps) {
  const [loadingAction, setLoadingAction] = useState<"summarize" | "explain" | null>(null)
  const [result, setResult] = useState("")
  const [resultLabel, setResultLabel] = useState("")

  const handleAction = async (action: "summarize" | "explain") => {
    if (!postContent.trim()) return

    setLoadingAction(action)
    try {
      if (action === "summarize") {
        const data = await summarizePost(postContent)
        setResult(data.summary)
        setResultLabel("Summary")
      } else {
        const data = await explainPost(postContent)
        setResult(data.explanation)
        setResultLabel("Explanation")
      }
    } catch (error: any) {
      toast.error(error?.message || "AI assist failed")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className={cn("space-y-3", className)} onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!!loadingAction || postContent.trim().length < 10}
          onClick={() => handleAction("summarize")}
          className="h-8 rounded-xl text-xs"
        >
          {loadingAction === "summarize" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          Summarize
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!!loadingAction || postContent.trim().length < 10}
          onClick={() => handleAction("explain")}
          className="h-8 rounded-xl text-xs"
        >
          {loadingAction === "explain" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          Explain
        </Button>
      </div>

      {result ? (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{resultLabel}</div>
          <p className="mt-1 text-sm leading-6 text-foreground/85">{result}</p>
        </div>
      ) : null}
    </div>
  )
}
