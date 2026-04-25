'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { adminApi, AdminStats, PendingShop, AdminShop, AdminUser, ShopEditPayload } from '@/lib/api'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

const SHOP_STATUSES = ['pending', 'approved', 'suspended', 'rejected']

function AdminEditModal({ shop, onClose, onSaved }: {
  shop: AdminShop
  onClose: () => void
  onSaved: (updated: AdminShop) => void
}) {
  const [form, setForm] = useState<ShopEditPayload & { status?: string }>({
    name: shop.name,
    city: shop.city,
    phone: shop.phone,
    accepts_emi: shop.accepts_emi,
    status: shop.status,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await adminApi.editShop(shop.id, form)
      onSaved({ ...shop, ...form, status: form.status ?? shop.status })
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/[0.10] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Edit Shop</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none transition-colors">×</button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Shop Name</label>
            <input
              value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">City</label>
              <input
                value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Phone</label>
              <input
                value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Status</label>
            <select
              value={form.status ?? shop.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
            >
              {SHOP_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[#111] capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className="text-white text-sm">Accept EMI</p>
            <button
              type="button"
              onClick={() => setForm({ ...form, accepts_emi: !form.accepts_emi })}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.accepts_emi ? 'bg-amber-500' : 'bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.accepts_emi ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-300 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

type Tab = 'pending' | 'all_shops' | 'users'

export default function AdminPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [pendingShops, setPendingShops] = useState<PendingShop[]>([])
  const [allShops, setAllShops] = useState<AdminShop[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [editingShop, setEditingShop] = useState<AdminShop | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'super_admin')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, role, router])

  const loadData = useCallback(async () => {
    setDataLoading(true)
    try {
      const [statsRes, shopsRes, allShopsRes, usersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPendingShops(),
        adminApi.getAllShops(),
        adminApi.getUsers(),
      ])
      setStats(statsRes.data)
      setPendingShops(shopsRes.data)
      setAllShops(allShopsRes.data)
      setUsers(usersRes.data)
    } catch {
      // ignore
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && role === 'super_admin') loadData()
  }, [isAuthenticated, role, loadData])

  async function approveShop(shopId: number) {
    setApprovingId(shopId)
    try {
      await adminApi.approveShop(shopId)
      setPendingShops((prev) => prev.filter((s) => s.id !== shopId))
      setStats((prev) => prev ? { ...prev, pending_shop_approvals: prev.pending_shop_approvals - 1, total_shops: prev.total_shops } : prev)
    } catch {
      // ignore
    } finally {
      setApprovingId(null)
    }
  }

  async function toggleUser(userId: number) {
    setTogglingId(userId)
    try {
      const { data } = await adminApi.toggleUser(userId)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: data.is_active } : u))
    } catch {
      // ignore
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || role !== 'super_admin') return null

  const nonAdminUsers = users.filter((u) => u.role !== 'super_admin')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-gray-500 text-sm mb-1">Super Admin</p>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>
        <button
          onClick={loadData}
          className="text-xs text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] px-3 py-1.5 rounded-lg transition-all"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={stats.total_users} />
          <StatCard label="Total Shops" value={stats.total_shops} />
          <StatCard
            label="Pending Approvals"
            value={stats.pending_shop_approvals}
            sub={stats.pending_shop_approvals > 0 ? 'Action required' : 'All clear'}
          />
          <StatCard
            label="Total Volume"
            value={`₹${(stats.total_transaction_value_inr / 100000).toFixed(1)}L`}
            sub="Completed transactions"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setTab('pending')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'pending' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Pending{pendingShops.length > 0 ? ` (${pendingShops.length})` : ''}
        </button>
        <button
          onClick={() => setTab('all_shops')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'all_shops' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          All Shops ({allShops.length})
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'users' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Users ({nonAdminUsers.length})
        </button>
      </div>

      {/* Pending shops tab */}
      {tab === 'pending' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {pendingShops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3 opacity-20">✓</div>
              <p className="text-gray-400 font-medium text-sm">No pending approvals</p>
              <p className="text-gray-600 text-xs mt-1">New jeweller registrations will appear here.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Shop</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">City</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Owner ID</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Registered</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pendingShops.map((shop, i) => (
                  <tr
                    key={shop.id}
                    className={`${i < pendingShops.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
                          {shop.name[0]}
                        </div>
                        <span className="text-white text-sm font-medium">{shop.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-sm">{shop.city}</td>
                    <td className="px-5 py-4 text-gray-500 text-sm">#{shop.owner_id}</td>
                    <td className="px-5 py-4 text-gray-500 text-sm">
                      {new Date(shop.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => approveShop(shop.id)}
                        disabled={approvingId === shop.id}
                        className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 text-xs font-medium px-4 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      >
                        {approvingId === shop.id ? 'Approving…' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* All shops tab */}
      {tab === 'all_shops' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {allShops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-400 font-medium text-sm">No shops yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Shop</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">City</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">EMI</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {allShops.map((shop, i) => (
                  <tr
                    key={shop.id}
                    className={`${i < allShops.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
                          {shop.name[0]}
                        </div>
                        <span className="text-white text-sm font-medium">{shop.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-sm">{shop.city}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${
                        shop.status === 'approved' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        shop.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                        shop.status === 'suspended' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        'bg-gray-500/10 border-gray-500/20 text-gray-400'
                      }`}>
                        {shop.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs ${shop.accepts_emi ? 'text-green-400' : 'text-gray-600'}`}>
                        {shop.accepts_emi ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setEditingShop(shop)}
                        className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 text-xs font-medium px-4 py-1.5 rounded-lg transition-all"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {nonAdminUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-400 font-medium text-sm">No users yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {nonAdminUsers.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`${i < nonAdminUsers.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}
                  >
                    <td className="px-5 py-4">
                      <span className="text-white text-sm">{user.email}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${
                        user.role === 'jeweller'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${
                        user.is_active
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => toggleUser(user.id)}
                        disabled={togglingId === user.id}
                        className={`text-xs font-medium px-4 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                          user.is_active
                            ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400'
                            : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400'
                        }`}
                      >
                        {togglingId === user.id ? '…' : user.is_active ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editingShop && (
        <AdminEditModal
          shop={editingShop}
          onClose={() => setEditingShop(null)}
          onSaved={(updated) => {
            setAllShops((prev) => prev.map((s) => s.id === updated.id ? updated : s))
            setEditingShop(null)
          }}
        />
      )}
    </div>
  )
}
