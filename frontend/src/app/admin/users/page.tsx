"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, Ban, UserCheck, Shield, ChevronLeft, ChevronRight, UserX, Mail, Calendar, Trophy, Users, CheckCircle2, XCircle, KeyRound, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { TableSkeleton } from "@/components/admin/TableSkeleton"
import { EmptyState } from "@/components/admin/EmptyState"

interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  avatar: string
  role: string
  isBlocked: boolean
  isVerified: boolean
  createdAt: string
  lastActive: string
  points: number
  level: number
  followersCount: number
  followingCount: number
}

export default function UsersManagement() {
  const { user: currentUser } = useAuth()
  const canManageCredentials = currentUser?.role === 'ADMIN'
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionType, setActionType] = useState<'ban' | 'unban' | 'role' | 'reset-password' | null>(null)
  const [newRole, setNewRole] = useState("")
  const [banReason, setBanReason] = useState("")
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    loadUsers()
  }, [page, search])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/users', {
        params: { page, limit: 20, search: search || undefined }
      })
      const data = response.data || response
      setUsers(data.data || [])
      setTotalPages(data.meta?.totalPages || 1)
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!selectedUser || !banReason) return
    try {
      await api.post(`/admin/users/${selectedUser.id}/ban`, { reason: banReason, permanent: true })
      toast.success(`${selectedUser.username} has been banned`)
      setActionType(null)
      setSelectedUser(null)
      setBanReason("")
      loadUsers()
    } catch (error: any) {
      toast.error(error?.error || 'Failed to ban user')
    }
  }

  const handleUnbanUser = async () => {
    if (!selectedUser) return
    try {
      await api.post(`/admin/users/${selectedUser.id}/unban`)
      toast.success(`${selectedUser.username} has been unbanned`)
      setActionType(null)
      setSelectedUser(null)
      loadUsers()
    } catch (error: any) {
      toast.error(error?.error || 'Failed to unban user')
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return
    try {
      await api.put(`/admin/users/${selectedUser.id}/role`, { role: newRole })
      toast.success(`${selectedUser.username}'s role updated to ${newRole}`)
      setActionType(null)
      setSelectedUser(null)
      setNewRole("")
      loadUsers()
    } catch (error: any) {
      toast.error(error?.error || 'Failed to update role')
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 8) return
    try {
      await api.post(`/admin/users/${selectedUser.id}/reset-password`, { newPassword })
      toast.success(`${selectedUser.username}'s password has been reset`)
      setActionType(null)
      setSelectedUser(null)
      setNewPassword("")
    } catch (error: any) {
      toast.error(error?.error || 'Failed to reset password')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/20 text-red-500 border-red-500/30'
      case 'MODERATOR': return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
      case 'ANALYTICS': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-sm text-muted-foreground">Manage user accounts, roles, and permissions</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-10"
          />
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
                <div className="h-20 bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={UserX}
            title="No users found"
            description={search ? `No users match "${search}". Try a different search term.` : "No users in the system yet."}
            action={search ? { label: "Clear search", onClick: () => setSearch("") } : undefined}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {users.map((user) => (
              <Card key={user.id} className="p-6 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.displayName?.[0] || user.username[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {user.displayName || user.username}
                      </h3>
                      {user.isVerified && (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </Badge>
                      {user.isBlocked && (
                        <Badge className="text-xs bg-red-500/20 text-red-500 border-red-500/30">
                          <XCircle className="h-3 w-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Level & XP</p>
                      <p className="text-sm font-medium">Lv.{user.level} • {user.points} XP</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Followers</p>
                      <p className="text-sm font-medium">{user.followersCount} / {user.followingCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="text-sm font-medium">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {!user.isBlocked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedUser(user); setActionType('ban') }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Ban User
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedUser(user); setActionType('unban') }}
                      className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Unban User
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManageCredentials}
                    title={!canManageCredentials ? "Only administrators can change roles" : undefined}
                    onClick={() => { setSelectedUser(user); setNewRole(user.role); setActionType('role') }}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Change Role
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManageCredentials}
                    title={!canManageCredentials ? "Only administrators can reset passwords" : undefined}
                    onClick={() => { setSelectedUser(user); setNewPassword(""); setActionType('reset-password') }}
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    Reset Password
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="User deletion is not available in this version. You can ban an account instead."
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Deletion unavailable
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Ban Dialog */}
      <AlertDialog open={actionType === 'ban'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User</AlertDialogTitle>
            <AlertDialogDescription>
              Ban @{selectedUser?.username}? This will prevent them from accessing the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Reason for ban..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              disabled={!banReason}
              className="bg-red-500 hover:bg-red-600"
            >
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unban Dialog */}
      <AlertDialog open={actionType === 'unban'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban User</AlertDialogTitle>
            <AlertDialogDescription>
              Unban @{selectedUser?.username}? They will be able to access the platform again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnbanUser}
              className="bg-green-500 hover:bg-green-600"
            >
              Unban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Update Dialog */}
      <AlertDialog open={actionType === 'role'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Change role for @{selectedUser?.username}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ANALYTICS">Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateRole} disabled={!newRole}>
              Update Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={actionType === 'reset-password'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Set a new password for @{selectedUser?.username}. Share it with the user through a secure channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="New password, minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={newPassword.length < 8}>
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
