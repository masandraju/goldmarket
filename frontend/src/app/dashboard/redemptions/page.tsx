'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { redemptionApi, ShopRedemptionRequest } from '@/lib/api'

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  approved:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
  ready:     'bg-green-500/10 border-green-500/20 text-green-400',
  fulfilled: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  rejected:  'bg-red-500/10 border-red-500/20 text-red-400',
  cancelled: 'bg-gray-500/10 border-gray-500/20 text-gray-500',
}

function ActionModal({ request, onClose, onDone }: {
  request: ShopRedemptionRequest
  onClose: () => void
  onDone: (id: number, status: 'approved' | 'rejected', notes: string) => void
}) {
  const [action, setAction] = useState<'approved' | 'rejected'>('approved')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSaving(true)
    setError('')
    try {
      await redemptionApi.action(request.id, action, notes.trim() || undefined)
      onDone(request.id, action, notes.trim())
    } catch {
      setError('Failed to update request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/[0.10] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Respond to Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none transition-colors">×</button>
        </div>

        {/* Request summary */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="text-white">{request.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Gold to redeem</span>
            <span className="text-amber-400 font-semibold">{request.gold_grams.toFixed(4)}g</span>
          </div>
          {request.preferred_item && (
            <div className="flex justify-between">
              <span className="text-gray-500">Preferred item</span>
              <span className="text-white">{request.preferred_item}</span>
            </div>
          )}
          {request.user_notes && (
            <div className="pt-1.5 border-t border-white/[0.06]">
              <p className="text-gray-500 text-xs mb-1">Customer notes</p>
              <p className="text-gray-300 text-xs">{request.user_notes}</p>
            </div>
          )}
        </div>

        {/* Action selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setAction('approved')}
            className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
              action === 'approved'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-white/[0.02] border-white/[0.08] text-gray-500 hover:text-gray-300'
            }`}
          >
            Accept
          </button>
          <button
            onClick={() => setAction('rejected')}
            className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
              action === 'rejected'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-white/[0.02] border-white/[0.08] text-gray-500 hover:text-gray-300'
            }`}
          >
            Reject
          </button>
        </div>

        {/* Optional comment */}
        <div className="mb-5">
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">
            Comment to customer <span className="text-gray-700 normal-case">(optional)</span>
          </label>
          <textarea
            rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={action === 'approved'
              ? 'e.g. Please visit the shop on Tuesday between 10am–2pm'
              : 'e.g. We cannot process this item at the moment'}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none placeholder:text-gray-700"
          />
        </div>

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-300 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 ${
              action === 'approved'
                ? 'bg-green-500 hover:bg-green-400 text-black'
                : 'bg-red-500 hover:bg-red-400 text-white'
            }`}
          >
            {saving ? '…' : action === 'approved' ? 'Accept Request' : 'Reject Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RedemptionsPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<ShopRedemptionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<ShopRedemptionRequest | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'jeweller')) router.push('/dashboard')
  }, [isAuthenticated, isLoading, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'jeweller') return
    redemptionApi.getShopRequests()
      .then(({ data }) => setRequests(data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }, [isAuthenticated, role])

  const displayed = filter === 'pending'
    ? requests.filter((r) => r.status === 'pending')
    : requests

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Redemptions</h1>
          <p className="text-gray-400 text-sm mt-1">Incoming gold redemption requests from your customers</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium px-3 py-1.5 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'pending' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
        >
          All ({requests.length})
        </button>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="text-4xl mb-3 opacity-20">💍</div>
            <p className="text-gray-400 text-sm font-medium mb-1">
              {filter === 'pending' ? 'No pending requests' : 'No redemption requests yet'}
            </p>
            <p className="text-gray-600 text-xs">Requests from customers will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {displayed.map((req) => (
              <div key={req.id} className="px-5 py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold shrink-0">
                  {req.customer_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-white text-sm font-medium">{req.customer_name}</p>
                    <span className="text-gray-600 text-xs">·</span>
                    <p className="text-gray-500 text-xs">{req.customer_email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-2">
                    <span className="text-amber-400 font-semibold">{req.gold_grams.toFixed(4)}g gold</span>
                    {req.preferred_item && <><span>·</span><span>{req.preferred_item}</span></>}
                    <span>·</span>
                    <span>{req.shop_name}</span>
                    <span>·</span>
                    <span>{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {req.user_notes && (
                    <p className="text-gray-600 text-xs italic mb-1">&ldquo;{req.user_notes}&rdquo;</p>
                  )}
                  {req.shop_notes && (
                    <p className="text-gray-500 text-xs">Your reply: <span className="text-gray-300">{req.shop_notes}</span></p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[req.status]}`}>
                    {req.status}
                  </span>
                  {req.status === 'pending' && (
                    <button
                      onClick={() => setActive(req)}
                      className="text-xs bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Respond
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {active && (
        <ActionModal
          request={active}
          onClose={() => setActive(null)}
          onDone={(id, status, notes) => {
            setRequests((prev) => prev.map((r) =>
              r.id === id ? { ...r, status, shop_notes: notes || null } : r
            ))
            setActive(null)
          }}
        />
      )}
    </div>
  )
}
