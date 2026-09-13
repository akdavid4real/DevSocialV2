"use client"

import { FormEvent, useState } from "react"
import { EyeOff, Send, Hash, ImageIcon, AlertTriangle, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

const suggestedTags = [
  "#confession",
  "#anonymous",
  "#career",
  "#coding",
  "#learning",
  "#mistakes",
  "#advice",
  "#experience",
  "#struggles",
  "#success",
  "#failure",
  "#imposter",
]

export default function ConfessPage() {
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSubmitting(true)

    setTimeout(() => {
      setIsSubmitting(false)
      setContent("")
      setTags([])
      setNewTag("")
      setImageUrl("")
      alert("Your anonymous confession has been posted!")
    }, 1000)
  }

  const addTag = (tag: string) => {
    if (!tag || tags.includes(tag) || tags.length >= 5) return
    setTags((prev) => [...prev, tag.startsWith("#") ? tag : `#${tag}`])
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTag.trim()) {
      e.preventDefault()
      addTag(newTag.trim())
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4 lg:py-6 px-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-purple-400 to-indigo-500 p-3 rounded-full">
            <EyeOff className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-navy-900 mb-2">Anonymous Confessions</h1>
        <p className="text-gray-600">Share your thoughts, experiences, or questions anonymously</p>
      </div>

      <Alert className="mb-6 border-purple-200 bg-purple-50">
        <Shield className="w-4 h-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          Your privacy is protected. This post is intended to be posted anonymously.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <EyeOff className="w-5 h-5 mr-2 text-purple-600" />
            Share Your Confession
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="content">What&apos;s on your mind?</Label>
              <Textarea
                id="content"
                placeholder="Share your thoughts, experiences, struggles, or questions anonymously."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[150px] resize-none"
                maxLength={2000}
                required
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{content.length}/2000 characters</span>
                <span className="text-purple-600">Anonymous</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image (Optional)</Label>
              <div className="flex space-x-2">
                <Input
                  id="image"
                  type="url"
                  placeholder="Paste image URL (optional)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tags (up to 5)</Label>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex space-x-2">
                <Input
                  placeholder="Add a tag (e.g., confession, career)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(newTag.trim())}
                  disabled={!newTag.trim() || tags.length >= 5}
                >
                  <Hash className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Suggested tags:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.slice(0, 8).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 text-purple-600"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                Community Guidelines
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Be respectful and constructive</li>
                <li>No harassment, hate speech, or personal attacks</li>
                <li>Do not share sensitive private information</li>
                <li>Keep content relevant to the developer community</li>
              </ul>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                disabled={!content.trim() || isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Posting..." : "Post Anonymously"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
