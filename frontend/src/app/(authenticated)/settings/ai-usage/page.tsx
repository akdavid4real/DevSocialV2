"use client"

import { useEffect, useState } from "react"
import { FileText, ImageIcon, Loader2, Mic, Sparkles } from "lucide-react"
import { AiFeatureUsage, AiUsage, getAiUsage } from "@/lib/ai-usage"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

function UsageRow({
  icon: Icon,
  title,
  description,
  usage,
}: {
  icon: typeof FileText
  title: string
  description: string
  usage: AiFeatureUsage
}) {
  const isUnlimited = usage.limit >= 999999
  const percentage = isUnlimited || usage.limit <= 0 ? 100 : Math.min((usage.used / usage.limit) * 100, 100)

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {isUnlimited ? "Unlimited" : `${usage.used}/${usage.limit}`}
        </Badge>
      </div>
      {!isUnlimited ? <Progress value={percentage} /> : null}
      <p className="text-xs text-muted-foreground">
        {isUnlimited ? "Unlimited access is enabled for your account." : `${usage.remaining} uses remaining this month.`}
      </p>
    </div>
  )
}

export default function AiUsageSettingsPage() {
  const [usage, setUsage] = useState<AiUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUsage = async () => {
      try {
        setUsage(await getAiUsage())
      } catch (error) {
        console.error("Failed to load AI usage:", error)
        toast.error("Failed to load AI usage")
      } finally {
        setLoading(false)
      }
    }

    loadUsage()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!usage) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            AI usage data is unavailable.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Usage</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track monthly usage for AI-assisted features.</p>
        </div>
        {usage.isPremium ? (
          <Badge className="w-fit gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Premium
          </Badge>
        ) : (
          <Badge variant="outline" className="w-fit">Free plan</Badge>
        )}
      </div>

      <div className="space-y-4 p-6">
        <UsageRow
          icon={FileText}
          title="Post Summaries"
          description="Summarize long posts and discussions into quick reading notes."
          usage={usage.summaries}
        />
        <UsageRow
          icon={Mic}
          title="Voice Transcription"
          description="Convert audio clips into text for posts, comments, and notes."
          usage={usage.transcriptions}
        />
        <UsageRow
          icon={ImageIcon}
          title="Image Analysis"
          description="Generate accessible image descriptions and visual context."
          usage={usage.imageAnalysis}
        />
      </div>

      <div className="p-6">
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Usage resets monthly{usage.resetsOn ? ` on ${new Date(usage.resetsOn).toLocaleDateString()}` : " when your next billing period starts"}.
        </div>
      </div>
    </div>
  )
}
