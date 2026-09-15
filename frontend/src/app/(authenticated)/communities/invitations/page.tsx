'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, MailPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Link from '@/components/ui/link'
import { getCommunityInvitations, respondToCommunityInvitation, type CommunityInvite } from '@/lib/communities'
import { toast } from 'sonner'

export default function CommunityInvitationsPage() {
  const [invites, setInvites] = useState<CommunityInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    try {
      const data = await getCommunityInvitations()
      setInvites(data.invites)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load community invitations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const respond = async (inviteId: string, accept: boolean) => {
    setBusyId(inviteId)
    try {
      await respondToCommunityInvitation(inviteId, accept)
      setInvites((current) => current.filter((invite) => invite.id !== inviteId))
      toast.success(accept ? 'Community invitation accepted' : 'Community invitation declined')
    } catch (error: any) {
      toast.error(error?.message || 'Could not update invitation')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Community Invitations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Private community invitations waiting for your response.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : invites.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MailPlus className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">No pending invitations</p>
            <p className="mt-1 text-sm text-muted-foreground">Invitations to private communities will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <Card key={invite.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/communities/${invite.community.slug}`} className="font-semibold text-foreground hover:text-primary">
                      {invite.community.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invited by {invite.inviter.displayName || `@${invite.inviter.username}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => void respond(invite.id, true)} disabled={busyId === invite.id}>
                      {busyId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Accept
                    </Button>
                    <Button variant="outline" onClick={() => void respond(invite.id, false)} disabled={busyId === invite.id}>
                      <X className="h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
