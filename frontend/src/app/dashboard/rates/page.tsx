'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { goldRateApi, shopApi, GoldRate, MyShop } from '@/lib/api'

export default function SetRatesPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()

  const [shops, setShops] = useState<MyShop[]>([])
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null)
  const [currentRate, setCurrentRate] = useState<GoldRate | null>(null)
  const [shopsLoading, setShopsLoading] = useState(true)

  const [form, setForm] = useState({
    rate_per_gram_22k: '',
    rate_per_gram_24k: '',
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'jeweller')) router.push('/dashboard')
  }, [isAuthenticated, isLoading, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'jeweller') return
    shopApi.getMyShops()
      .then(({ data }) => {
        const approved = data.filter((s) => s.status === 'approved')
        setShops(approved)
        if (approved.length === 1) setSelectedShopId(approved[0].id)
      })
      .catch(() => setShops([]))
      .finally(() => setShopsLoading(false))
  }, [isAuthenticated, role])

  useEffect(() => {
    if (!selectedShopId) { setCurrentRate(null); return }
    goldRateApi.getTodayRate(selectedShopId)
      .then(({ data }) => {
        setCurrentRate(data)
        setForm((f) => ({
          ...f,
          rate_per_gram_22k: String(data.rate_per_gram_22k),
          rate_per_gram_24k: String(data.rate_per_gram_24k),
        }))
      })
      .catch(() => setCurrentRate(null))
  }, [selectedShopId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedShopId) return
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await goldRateApi.setRate({
        shop_id: selectedShopId,
        rate_per_gram_22k: Number(form.rate_per_gram_22k),
        rate_per_gram_24k: Number(form.rate_per_gram_24k),
        effective_date: form.effective_date,
        is_manual_override: true,
        notes: form.notes || undefined,
      })
      setSuccess(true)
      goldRateApi.getTodayRate(selectedShopId).then(({ data }) => setCurrentRate(data)).catch(() => null)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setError(msg || 'Failed to set rates. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || shopsLoading) {
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
        <h1 className="text-2xl font-bold text-white">Set Gold Rates</h1>
        <p className="text-gray-400 text-sm mt-1">Publish today&apos;s buying price for your customers.</p>
      </div>

      {/* No approved shops */}
      {shops.length === 0 && (
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-5">
          <p className="text-gray-300 text-sm font-medium mb-1">No approved shops found</p>
          <p className="text-gray-500 text-xs mb-3">You need an approved shop before setting rates.</p>
          <Link href="/dashboard/shop/register" className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Register a shop →
          </Link>
        </div>
      )}

      {shops.length > 0 && (
        <>
          {/* Shop selector — only show if multiple shops */}
          {shops.length > 1 && (
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Select Shop
              </label>
              <div className="flex flex-col gap-2">
                {shops.map((shop) => (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => setSelectedShopId(shop.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      selectedShopId === shop.id
                        ? 'border-amber-500/50 bg-amber-500/[0.06]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                      {shop.name[0]}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${selectedShopId === shop.id ? 'text-amber-400' : 'text-white'}`}>
                        {shop.name}
                      </p>
                      <p className="text-gray-500 text-xs">{shop.city}</p>
                    </div>
                    {selectedShopId === shop.id && (
                      <div className="ml-auto w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                          <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single shop — show as info */}
          {shops.length === 1 && (
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                {shops[0].name[0]}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{shops[0].name}</p>
                <p className="text-gray-500 text-xs">{shops[0].city}</p>
              </div>
            </div>
          )}

          {/* Current rates */}
          {currentRate && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Current Rates (Today)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">22 Karat</p>
                  <p className="text-amber-400 font-bold text-lg">₹{currentRate.rate_per_gram_22k.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-0.5">24 Karat</p>
                  <p className="text-amber-400 font-bold text-lg">₹{currentRate.rate_per_gram_24k.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3 mb-5">
              ✓ Rates published. Customers can now see your prices.
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">22K Rate (₹/gram) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={0.01}
                  value={form.rate_per_gram_22k}
                  onChange={(e) => setForm({ ...form, rate_per_gram_22k: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
                  placeholder="7240"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">24K Rate (₹/gram) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={0.01}
                  value={form.rate_per_gram_24k}
                  onChange={(e) => setForm({ ...form, rate_per_gram_24k: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
                  placeholder="7890"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Effective Date *</label>
              <input
                type="date"
                required
                value={form.effective_date}
                onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
                placeholder="e.g. Festival special pricing"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedShopId}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl text-sm transition-colors mt-1"
            >
              {loading ? 'Publishing…' : 'Publish Rates'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
