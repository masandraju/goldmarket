'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { redemptionApi, shopApi, goldApi, RedemptionRequest, ShopNearbyResult } from '@/lib/api'

const PUNE = { lat: 18.5204, lng: 73.8567 }

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  approved:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
  ready:     'bg-green-500/10 border-green-500/20 text-green-400',
  fulfilled: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  rejected:  'bg-red-500/10 border-red-500/20 text-red-400',
  cancelled: 'bg-gray-500/10 border-gray-500/20 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pending jeweller response',
  approved:  'Accepted — contact the shop',
  ready:     'Ready for collection',
  fulfilled: 'Completed',
  rejected:  'Rejected by shop',
  cancelled: 'Cancelled',
}

export default function RedeemPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()

  const [balance, setBalance] = useState<number | null>(null)
  const [shops, setShops] = useState<ShopNearbyResult[]>([])
  const [myRequests, setMyRequests] = useState<RedemptionRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedShop, setSelectedShop] = useState<number | ''>('')
  const [grams, setGrams] = useState('')
  const [preferredItem, setPreferredItem] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'customer')) router.push('/dashboard')
  }, [isAuthenticated, isLoading, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'customer') return
    Promise.all([
      goldApi.getBalance(),
      shopApi.getNearby(PUNE.lat, PUNE.lng, 50, 50),
      redemptionApi.getMyRequests(),
    ])
      .then(([balRes, shopsRes, reqRes]) => {
        setBalance(balRes.data.balance_grams)
        setShops(shopsRes.data)
        setMyRequests(reqRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated, role])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const gramsNum = parseFloat(grams)
    if (!selectedShop) { setError('Please select a shop.'); return }
    if (!gramsNum || gramsNum <= 0) { setError('Enter a valid amount of gold.'); return }
    if (balance !== null && gramsNum > balance) {
      setError(`You only have ${balance.toFixed(4)}g available.`)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await redemptionApi.submit(
        Number(selectedShop),
        gramsNum,
        preferredItem.trim() || undefined,
        notes.trim() || undefined,
      )
      const { data } = await redemptionApi.getMyRequests()
      setMyRequests(data)
      const { data: bal } = await goldApi.getBalance()
      setBalance(bal.balance_grams)
      setGrams('')
      setPreferredItem('')
      setNotes('')
      setSelectedShop('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setError(msg || 'Failed to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Redeem Gold</h1>
        <p className="text-gray-400 text-sm mt-1">Convert your digital gold balance into physical jewellery</p>
      </div>

      {/* Balance banner */}
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5 mb-6">
        <p className="text-amber-400/70 text-xs uppercase tracking-wider mb-1">Available Balance</p>
        <p className="text-3xl font-bold text-white">{balance?.toFixed(4) ?? '0.0000'}<span className="text-amber-400 text-base font-medium ml-2">grams</span></p>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3 mb-6">
          ✓ Redemption request submitted. The jeweller will respond shortly.
        </div>
      )}

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-8 space-y-4">
        <p className="text-white font-medium text-sm">New Request</p>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Select Shop *</label>
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
          >
            <option value="" className="bg-[#111]">Choose a jeweller…</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#111]">
                {s.name} — {s.city} ({s.distance_km.toFixed(1)} km)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Gold to Redeem (grams) *</label>
          <input
            type="number" step="0.0001" min="0.0001" value={grams}
            onChange={(e) => { setGrams(e.target.value); setError('') }}
            placeholder={`Max ${balance?.toFixed(4) ?? '0'}g`}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700"
          />
          {parseFloat(grams) > 0 && balance !== null && parseFloat(grams) <= balance && (
            <p className="text-gray-600 text-xs mt-1">Remaining after redemption: {(balance - parseFloat(grams)).toFixed(4)}g</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Preferred Item <span className="text-gray-700 normal-case">(optional)</span></label>
          <input
            type="text" value={preferredItem} onChange={(e) => setPreferredItem(e.target.value)}
            placeholder="e.g. Gold ring, chain, earrings…"
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Notes to Jeweller <span className="text-gray-700 normal-case">(optional)</span></label>
          <textarea
            rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requirements or message to the shop…"
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none placeholder:text-gray-700"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit" disabled={submitting || !selectedShop || !grams}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Redemption Request'}
        </button>
      </form>

      {/* My requests */}
      {myRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">My Requests</h2>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {myRequests.map((req) => (
                <div key={req.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div>
                      <p className="text-white text-sm font-medium">{req.shop_name}</p>
                      <p className="text-amber-400 text-xs font-semibold mt-0.5">{req.gold_grams.toFixed(4)}g</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border capitalize shrink-0 ${STATUS_STYLES[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs">{STATUS_LABELS[req.status]}</p>
                  {req.preferred_item && <p className="text-gray-500 text-xs mt-1">Item: {req.preferred_item}</p>}
                  {req.shop_notes && (
                    <div className="mt-2 bg-white/[0.03] rounded-lg px-3 py-2">
                      <p className="text-gray-500 text-xs mb-0.5">Jeweller&apos;s reply</p>
                      <p className="text-gray-300 text-xs">{req.shop_notes}</p>
                    </div>
                  )}
                  <p className="text-gray-700 text-xs mt-2">
                    {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
