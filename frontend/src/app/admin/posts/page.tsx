"use client"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Archive, Trash2, FileText } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/admin/EmptyState"

interface Post {
  id: string
  content: string
  status: string
  createdAt: string
  likesCount: number
  commentsCount: number
  author: { username: string }
}

export default function PostsModeration() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ACTIVE")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [actionType, setActionType] = useState<string | null>(null)

  useEffect(() => { loadPosts() }, [page, statusFilter])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/posts', { params: { status: statusFilter, page, limit: 20 } })
      const data = response.data || response
      setPosts(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
    } catch (error) {
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (status: string, reason?: string) => {
    if (!selectedPost) return
    try {
      await api.put(`/admin/posts/${selectedPost.id}/status`, { status, reason })
      toast.success(`Post ${status.toLowerCase()}`)
      setActionType(null)
      setSelectedPost(null)
      loadPosts()
    } catch (error: any) {
      toast.error(error?.error || 'Failed to update')
    }
  }

  const handleDelete = async () => {
    if (!selectedPost) return
    try {
      await api.delete(`/admin/posts/${selectedPost.id}`, { data: { reason: 'Removed by admin' } })
      toast.success('Post deleted')
      setActionType(null)
      setSelectedPost(null)
      loadPosts()
    } catch (error: any) {
      toast.error(error?.error || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Content Moderation</h2><p className="text-sm text-muted-foreground">Review and moderate posts</p></div>
      <Card className="p-4"><Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING_REVIEW">Pending Review</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="ARCHIVED">Archived</SelectItem><SelectItem value="BLOCKED">Blocked</SelectItem></SelectContent></Select></Card>
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex justify-between gap-4">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={FileText}
            title="No posts found"
            description={
              statusFilter === "PENDING_REVIEW"
                ? "No posts are pending review at the moment."
                : statusFilter === "BLOCKED"
                ? "No blocked posts."
                : statusFilter === "ARCHIVED"
                ? "No archived posts."
                : "No active posts found."
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between gap-4">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <span className="font-medium">@{post.author.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mb-4">{post.content}</p>
                  <div className="text-xs text-muted-foreground">
                    {post.likesCount} likes • {post.commentsCount} comments
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {post.status === 'PENDING_REVIEW' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus('ACTIVE', 'Approved')}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus('BLOCKED', 'Blocked')}
                        className="text-red-500"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Block
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedPost(post); setActionType('delete') }}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {totalPages > 1 && <Card className="p-4"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" />Prev</Button><Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next<ChevronRight className="h-4 w-4" /></Button></div></div></Card>}
      <AlertDialog open={actionType === 'delete'} onOpenChange={() => setActionType(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Post</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
