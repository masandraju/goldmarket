'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { userApi, UserProfile } from '@/lib/api'

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fetching, setFetching] = useState(true)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    userApi.getMe()
      .then(({ data }) => {
        setProfile(data)
        setFullName(data.full_name)
        setPhone(data.phone)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [isAuthenticated])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    setSaving(true)
    try {
      const payload: Parameters<typeof userApi.updateMe>[0] = {}
      if (fullName.trim() && fullName !== profile?.full_name) payload.full_name = fullName.trim()
      if (phone.trim() && phone !== profile?.phone) payload.phone = phone.trim()
      if (newPassword) {
        payload.current_password = currentPassword
        payload.new_password = newPassword
      }

      if (Object.keys(payload).length === 0) {
        setSuccess('No changes to save.')
        setSaving(false)
        return
      }

      const { data } = await userApi.updateMe(payload)
      setProfile(data)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Profile updated successfully.')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setError(msg || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 text-sm mt-1 capitalize">{profile?.role} account · {profile?.email}</p>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3 mb-6">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Information</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Phone</label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email" value={profile?.email ?? ''} disabled
              className="w-full bg-white/[0.02] border border-white/[0.06] text-gray-600 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
            />
            <p className="text-gray-700 text-xs mt-1">Email cannot be changed.</p>
          </div>
        </div>

        {/* Password change */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Change Password</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Current Password</label>
            <input
              type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">New Password</label>
            <input
              type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700"
            />
          </div>
          <p className="text-gray-700 text-xs">Leave blank to keep your current password.</p>
        </div>

        <button
          type="submit" disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
