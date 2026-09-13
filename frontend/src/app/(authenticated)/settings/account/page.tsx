'use client'

import { useState, useEffect } from 'react'
import { Mail, Lock, Trash2, AlertTriangle, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useRouter } from '@/lib/navigation'
import { API_BASE_URL } from '@/lib/env'

export default function AccountSettings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  // Delete account dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    fetchAccountData()
  }, [])

  const fetchAccountData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setEmail(data.email)
        setUsername(data.username)
      }
    } catch (error) {
      toast.error('Failed to load account data')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setChangingPassword(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (res.ok) {
        toast.success('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to change password')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== username) {
      toast.error(`Please type "${username}" to confirm`)
      return
    }

    setDeletingAccount(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success('Account deleted successfully')
        localStorage.clear()
        router.push('/login')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to delete account')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleExportData = async () => {
    setExportingData(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/users/export-data`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.message || 'Failed to export data')
        return
      }

      const payload = await res.json()
      const exportData = payload.data || payload
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const safeUsername = (username || 'devsocial-user').replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
      link.href = url
      link.download = `${safeUsername}-devsocial-export.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Data export downloaded')
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setExportingData(false)
    }
  }

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
        <h2 className="text-2xl font-bold text-foreground">Account Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account credentials and settings
        </p>
      </div>

      {/* Email */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Email Address</h3>
          <p className="text-sm text-muted-foreground">
            Your current email address
          </p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{email}</p>
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address
            </p>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Change Password</h3>
          <p className="text-sm text-muted-foreground">
            Update your password to keep your account secure
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="w-full sm:w-auto"
          >
            {changingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Data Export */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Export Data</h3>
          <p className="text-sm text-muted-foreground">
            Download a JSON archive of your profile, posts, comments, projects, settings, and account activity.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Personal data archive</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Includes user-owned data currently stored in DevSocial V2.
            </p>
          </div>
          <Button onClick={handleExportData} disabled={exportingData} className="shrink-0">
            {exportingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-destructive mb-1">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Irreversible actions that affect your account
          </p>
        </div>

        <div className="border-2 border-destructive/50 rounded-lg p-4 bg-destructive/5">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Delete Account</h4>
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. All your data, posts,
                comments, and messages will be permanently deleted.
              </p>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete My Account
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>This action cannot be undone. This will permanently delete your account and remove all your data from our servers.</p>
              <p className="font-medium text-foreground">
                Type <span className="font-mono bg-muted px-1 rounded">{username}</span> to confirm:
              </p>
            </DialogDescription>
          </DialogHeader>

          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder={`Type "${username}" to confirm`}
            className="font-mono"
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation('')
              }}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmation !== username}
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
