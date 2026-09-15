'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import Link from '@/components/ui/link'
import { toast } from 'sonner'

type FollowRequest = {
  id: string
  createdAt: string
  user: {
    id: string
    username: string
    displayName?: string | null
    avatar?: string
    level?: number
  }
}

export default function FollowRequestsPage() {
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    try {
      const response: any = await api.get('/follow/requests/incoming')
      const data = response?.data || response
      setRequests(Array.isArray(data?.requests) ? data.requests : [])
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load follow requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const respond = async (requestId: string, accept: boolean) => {
    setBusyId(requestId)
    try {
      await api.post(`/follow/requests/${requestId}/${accept ? 'accept' : 'reject'}`)
      setRequests((current) => current.filter((request) => request.id !== requestId))
      toast.success(accept ? 'Follow request accepted' : 'Follow request declined')
    } catch (error: any) {
      toast.error(error?.message || 'Could not update follow request')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="divide-y divide-border">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Follow Requests</h2>
        <p className="text-sm text-muted-foreground mt-1">Approve who can follow your private profile.</p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">No pending follow requests</p>
            <p className="text-sm text-muted-foreground mt-1">New requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 rounded-lg border border-border p-4">
                <img
                  src={request.user.avatar || '/default-avatar.png'}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover bg-muted"
                />
                <Link href={`/@${request.user.username}`} className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{request.user.displayName || request.user.username}</p>
                  <p className="text-sm text-muted-foreground truncate">@{request.user.username}</p>
                </Link>
                <Button size="sm" onClick={() => void respond(request.id, true)} disabled={busyId === request.id}>
                  {busyId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => void respond(request.id, false)} disabled={busyId === request.id}>
                  <X className="h-4 w-4 mr-1" />Decline
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
