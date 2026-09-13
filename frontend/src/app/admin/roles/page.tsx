"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { normalizeRole, AdminRole } from "@/app/analytics/analytics-support"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Users, Shield, Save, RefreshCcw } from "lucide-react"
import { TableSkeleton } from "@/components/admin/TableSkeleton"
import { EmptyState } from "@/components/admin/EmptyState"

interface AdminUser {
  id: string
  username: string
  email: string
  displayName: string | null
  role: string
  isBlocked: boolean
  isVerified: boolean
  createdAt: string
  lastActive: string | null
}

const roleOptions: AdminRole[] = ["USER", "MODERATOR", "ADMIN", "ANALYTICS"]
const roleStyles: Record<AdminRole, string> = {
  USER: "bg-gray-500/20 text-gray-500 border-gray-500/30",
  MODERATOR: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  ADMIN: "bg-red-500/20 text-red-500 border-red-500/30",
  ANALYTICS: "bg-blue-500/20 text-blue-500 border-blue-500/30",
}

export default function AdminRolesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [users, setUsers] = useState<AdminUser[]>([])
  const [draftRoles, setDraftRoles] = useState<Record<string, AdminRole>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<AdminRole | "ALL">("ALL")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [page, search])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/users`, {
        params: { page, limit: 20, search: search || undefined },
      })
      const payload = response.data || response
      const rows = Array.isArray(payload.data) ? payload.data : []
      const normalizedUsers = rows.map((user: AdminUser) => ({
        ...user,
        role: normalizeRole(user.role),
      }))

      setUsers(normalizedUsers)
      setTotalPages(payload.meta?.totalPages || 1)
      setDraftRoles((previous) => {
        const next = { ...previous }
        normalizedUsers.forEach((u: AdminUser) => {
          next[u.id] = normalizeRole(u.role)
        })
        return next
      })
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "error" in error
          ? String((error as { error?: unknown }).error)
          : "Failed to load users"
      toast.error(message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    if (roleFilter === "ALL") return users
    return users.filter((user) => normalizeRole(user.role) === roleFilter)
  }, [users, roleFilter])

  const roleDistribution = useMemo(() => {
    const total = users.length || 1
    const counts = users.reduce<Record<AdminRole, number>>(
      (acc, item) => {
        const role = normalizeRole(item.role)
        acc[role] += 1
        return acc
      },
      { USER: 0, MODERATOR: 0, ADMIN: 0, ANALYTICS: 0 },
    )
    return roleOptions.map((role) => ({
      role,
      count: counts[role],
      percentage: Math.round((counts[role] / total) * 100),
    }))
  }, [users])

  const handleRoleChange = (userId: string, role: string) => {
    if (!roleOptions.includes(role as AdminRole)) return
    setDraftRoles((previous) => ({ ...previous, [userId]: role as AdminRole }))
  }

  const handleSaveRole = async (userId: string) => {
    if (!isAdmin) {
      toast.error("Only admins can change roles")
      return
    }
    const nextRole = draftRoles[userId]
    const currentRole = normalizeRole(users.find((u) => u.id === userId)?.role || "USER")
    if (!nextRole || currentRole === nextRole) return

    try {
      setUpdatingId(userId)
      await api.put(`/admin/users/${userId}/role`, { role: nextRole })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)),
      )
      toast.success("Role updated")
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "error" in error
          ? String((error as { error?: unknown }).error)
          : "Unable to update role"
      toast.error(message || "Unable to update role")
      setDraftRoles((previous) => ({
        ...previous,
        [userId]: currentRole,
      }))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Roles</h1>
        <p className="text-sm text-muted-foreground">
          Assign platform roles and manage permission tiers for moderators, admins, and analytics users.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {roleDistribution.map((item) => (
          <Card key={item.role} className="p-4">
            <p className="text-sm text-muted-foreground">{item.role}</p>
            <p className="mt-2 text-2xl font-semibold">{item.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.percentage}% of users</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search username, email, or display name"
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as AdminRole | "ALL")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              {roleOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadUsers}
            className="ml-auto"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={10} columns={5} />
      ) : filteredUsers.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Users}
            title="No users found"
            description={search ? "No users match your search criteria." : "No users loaded for this filter."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">User</th>
                  <th className="text-left p-4 font-semibold">Current role</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Last active</th>
                  <th className="text-right p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((adminUser) => {
                  const selectedRole = draftRoles[adminUser.id] || normalizeRole(adminUser.role)
                  const role = normalizeRole(adminUser.role)

                  return (
                    <tr key={adminUser.id}>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold">
                            {adminUser.displayName || adminUser.username}
                          </p>
                          <p className="text-xs text-muted-foreground">{adminUser.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${roleStyles[role]}`}>{role}</Badge>
                          <Select
                            value={selectedRole}
                            onValueChange={(value) => handleRoleChange(adminUser.id, value)}
                          >
                            <SelectTrigger className="w-40" disabled={!isAdmin}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            adminUser.isBlocked
                              ? "bg-red-500/20 text-red-500 border-red-500/30"
                              : "bg-green-500/20 text-green-500 border-green-500/30"
                          }
                        >
                          {adminUser.isBlocked ? "Blocked" : "Active"}
                        </Badge>
                        {adminUser.isVerified ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" /> Verified
                          </span>
                        ) : null}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {adminUser.lastActive
                          ? new Date(adminUser.lastActive).toLocaleString()
                          : "Unknown"}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSaveRole(adminUser.id)}
                          disabled={!isAdmin || updatingId === adminUser.id || selectedRole === role}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {updatingId === adminUser.id ? "Saving" : "Save role"}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
