'use client'

import { useState, useEffect } from 'react'
import { UserX, Search, Loader2, AlertCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from '@/components/ui/link'
import { API_BASE_URL } from '@/lib/env'

type BlockedUser = {
  id: string
  username: string
  displayName: string | null
  avatar: string
  blockedAt: string
}

export default function BlockedUsersSettings() {
  const [loading, setLoading] = useState(true)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBlockedUsers()
  }, [])

  const fetchBlockedUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setBlockedUsers(data)
      }
    } catch (error) {
      toast.error('Failed to load blocked users')
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/unblock/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('User unblocked successfully')
        setBlockedUsers((prev) => prev.filter((user) => user.id !== userId))
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to unblock user')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setUnblockingId(null)
    }
  }

  const filteredUsers = blockedUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground">Blocked Users</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage accounts you've blocked from interacting with you
        </p>
      </div>

      {/* Search */}
      {blockedUsers.length > 0 && (
        <div className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search blocked users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Blocked Users List */}
      <div className="p-6">
        {blockedUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No blocked users</h3>
            <p className="text-sm text-muted-foreground">
              You haven't blocked anyone yet
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No users found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.displayName?.[0] || user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/@${user.username}`}
                      className="font-medium text-foreground hover:underline block truncate"
                    >
                      {user.displayName || user.username}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Blocked {new Date(user.blockedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(user.id)}
                  disabled={unblockingId === user.id}
                  className="flex-shrink-0"
                >
                  {unblockingId === user.id ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Unblocking...
                    </>
                  ) : (
                    'Unblock'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      {blockedUsers.length > 0 && (
        <div className="p-6 bg-muted/30">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">What happens when you block someone?</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>They can't see your posts or profile</li>
                <li>They can't send you messages or follow you</li>
                <li>They can't mention you in posts or comments</li>
                <li>Existing follows are removed</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
