'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { shopApi, goldRateApi, purchaseApi, emiApi, reviewApi, Shop, GoldRate, GoldRateHistory, ReviewItem } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

const RANGES = [
  { label: '1D', days: 1 },
  { label: '3D', days: 3 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '1Y', days: 365 },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const hasData = payload.some((p: { value: number | null }) => p.value !== null)
  if (!hasData) return null
  return (
    <div className="bg-[#111] border border-white/[0.10] rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((p: { name: string; value: number | null; color: string }) =>
        p.value !== null ? (
          <p key={p.name} style={{ color: p.color }} className="font-semibold">
            {p.name}: ₹{p.value.toLocaleString('en-IN')}
          </p>
        ) : null
      )}
    </div>
  )
}

function buildChartData(history: GoldRateHistory[], days: number) {
  const rateMap = new Map(history.map((r) => [r.date, r]))
  const today = new Date()

  if (days === 365) {
    // Group by month — show average per month
    const monthMap = new Map<string, { key: string; sum22: number; sum24: number; count: number }>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const isoDate = d.toISOString().split('T')[0]
      const label = new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      if (!monthMap.has(label)) monthMap.set(label, { key: label, sum22: 0, sum24: 0, count: 0 })
      const rate = rateMap.get(isoDate)
      if (rate) {
        const m = monthMap.get(label)!
        m.sum22 += rate.rate_per_gram_22k
        m.sum24 += rate.rate_per_gram_24k
        m.count += 1
      }
    }
    return Array.from(monthMap.values()).map(({ key, sum22, sum24, count }) => ({
      date: key,
      '22K': count > 0 ? Math.round(sum22 / count) : null,
      '24K': count > 0 ? Math.round(sum24 / count) : null,
    }))
  }

  // For all other ranges: generate every day in the window
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const isoDate = d.toISOString().split('T')[0]
    const label = new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const rate = rateMap.get(isoDate)
    return {
      date: label,
      '22K': rate?.rate_per_gram_22k ?? null,
      '24K': rate?.rate_per_gram_24k ?? null,
    }
  })
}

function RateHistorySection({ shopId }: { shopId: number }) {
  const [selectedDays, setSelectedDays] = useState(7)
  const [history, setHistory] = useState<GoldRateHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    goldRateApi.getHistory(shopId, selectedDays)
      .then(({ data }) => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [shopId, selectedDays])

  const chartData = buildChartData(history, selectedDays)
  const hasAnyData = history.length > 0

  // Thin X-axis labels for dense ranges
  const xInterval = selectedDays <= 7 ? 0 : selectedDays <= 30 ? 4 : 0

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Rate History</h2>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setSelectedDays(r.days)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                selectedDays === r.days
                  ? 'bg-amber-500 text-black'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {!hasAnyData && (
              <div className="text-center mb-3">
                <p className="text-gray-600 text-xs">No rates set for this period — chart shows the date range only.</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={xInterval}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
                  width={48}
                />
                <Tooltip content={<RateTooltip />} />
                <Line
                  type="monotone"
                  dataKey="22K"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={(props) => {
                    if (props.payload?.['22K'] === null) return <g key={props.key} />
                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#f59e0b" stroke="none" />
                  }}
                  activeDot={{ r: 4, fill: '#f59e0b' }}
                />
                <Line
                  type="monotone"
                  dataKey="24K"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={(props) => {
                    if (props.payload?.['24K'] === null) return <g key={props.key} />
                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#9ca3af" stroke="none" />
                  }}
                  activeDot={{ r: 4, fill: '#9ca3af' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-amber-500 rounded-full" />
                <span className="text-gray-500 text-xs">22K</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-gray-400 rounded-full" />
                <span className="text-gray-500 text-xs">24K</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5">
          <path
            d="M6 1l1.2 3.6H11L8.1 6.9l1.1 3.5L6 8.5l-3.2 1.9 1.1-3.5L1 4.6h3.8z"
            fill={s <= Math.round(rating) ? '#f59e0b' : '#374151'}
          />
        </svg>
      ))}
      <span className="text-gray-400 text-sm ml-1">
        {rating > 0 ? `${rating.toFixed(1)} rating` : 'No reviews yet'}
      </span>
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s} type="button"
          onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-6 h-6 transition-colors">
            <path
              d="M6 1l1.2 3.6H11L8.1 6.9l1.1 3.5L6 8.5l-3.2 1.9 1.1-3.5L1 4.6h3.8z"
              fill={s <= (hovered || value) ? '#f59e0b' : '#374151'}
            />
          </svg>
        </button>
      ))}
    </div>
  )
}

function ReviewsSection({ shopId, isCustomer }: { shopId: number; isCustomer: boolean }) {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [myReview, setMyReview] = useState<{ id: number; rating: number; comment: string | null } | null | undefined>(undefined)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    reviewApi.getByShop(shopId)
      .then(({ data }) => setReviews(data))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
    if (isCustomer) {
      reviewApi.getMyReview(shopId)
        .then(({ data }) => setMyReview(data))
        .catch(() => setMyReview(null))
    }
  }, [shopId, isCustomer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      await reviewApi.submit({ shop_id: shopId, rating, comment: comment.trim() || undefined })
      const { data } = await reviewApi.getByShop(shopId)
      setReviews(data)
      setMyReview({ id: 0, rating, comment: comment.trim() || null })
      setComment('')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setSubmitError(msg || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Customer Reviews</h2>

      {/* Submit form — show only if customer hasn't reviewed yet */}
      {isCustomer && myReview === null && (
        <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 mb-4">
          <p className="text-white text-sm font-medium mb-3">Leave a Review</p>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">Your Rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Comment (optional)</label>
            <textarea
              rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience…"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none placeholder:text-gray-600"
            />
          </div>
          {submitError && <p className="text-red-400 text-xs mb-3">{submitError}</p>}
          <button type="submit" disabled={submitting || rating === 0}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors">
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      )}

      {isCustomer && myReview && myReview !== undefined && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3 mb-4 text-sm text-gray-400">
          You have already reviewed this shop.
        </div>
      )}

      {/* Reviews list */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-500 text-sm">No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {reviews.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
                      {r.reviewer_name[0].toUpperCase()}
                    </div>
                    <span className="text-white text-sm font-medium">{r.reviewer_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                        <path d="M6 1l1.2 3.6H11L8.1 6.9l1.1 3.5L6 8.5l-3.2 1.9 1.1-3.5L1 4.6h3.8z" fill={s <= r.rating ? '#f59e0b' : '#374151'} />
                      </svg>
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-gray-400 text-sm mt-1 pl-9">{r.comment}</p>}
                <p className="text-gray-600 text-xs mt-1.5 pl-9">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

type BuyStep = 'idle' | 'form' | 'paying' | 'success' | 'error'

export default function ShopDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, role } = useAuth()
  const shopId = Number(params.id)

  const [shop, setShop] = useState<Shop | null>(null)
  const [rate, setRate] = useState<GoldRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  // Buy flow state
  const [buyStep, setBuyStep] = useState<BuyStep>('idle')
  const [purity, setPurity] = useState<'22k' | '24k'>('22k')
  const [amountInr, setAmountInr] = useState('')
  const [buyError, setBuyError] = useState('')
  const [credited, setCredited] = useState<{ grams: number; balance: number } | null>(null)

  // EMI flow state
  type EMIStep = 'idle' | 'form' | 'paying' | 'success' | 'error'
  const [emiStep, setEmiStep] = useState<EMIStep>('idle')
  const [emiPurity, setEmiPurity] = useState<'22k' | '24k'>('22k')
  const [emiAmount, setEmiAmount] = useState('')
  const [emiMonths, setEmiMonths] = useState(12)
  const [emiError, setEmiError] = useState('')
  const [emiResult, setEmiResult] = useState<{ grams: number; remaining: number } | null>(null)

  useEffect(() => {
    if (!shopId) return
    Promise.all([
      shopApi.getById(shopId),
      goldRateApi.getTodayRate(shopId).catch(() => null),
    ])
      .then(([shopRes, rateRes]) => {
        setShop(shopRes.data)
        if (rateRes) setRate(rateRes.data)
        // Get distance from user's current position
        navigator.geolocation?.getCurrentPosition((pos) => {
          const { latitude: uLat, longitude: uLng } = pos.coords
          const { latitude: sLat, longitude: sLng } = shopRes.data
          const R = 6371
          const dLat = (sLat - uLat) * Math.PI / 180
          const dLng = (sLng - uLng) * Math.PI / 180
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(uLat * Math.PI / 180) * Math.cos(sLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
          setDistanceKm(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
        })
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [shopId])

  async function handleBuy() {
    if (!rate) return
    const amount = parseFloat(amountInr)
    if (!amount || amount < 100) { setBuyError('Minimum purchase amount is ₹100'); return }

    setBuyError('')
    setBuyStep('paying')

    try {
      const { data: order } = await purchaseApi.initiate(shopId, amount, purity)
      const loaded = await loadRazorpay()
      if (!loaded) { setBuyError('Failed to load payment gateway. Check your connection.'); setBuyStep('form'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rz = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(amount * 100),
        currency: 'INR',
        order_id: order.razorpay_order_id,
        name: shop?.name ?? 'GoldMarket',
        description: `Buy ${order.gold_grams.toFixed(4)}g ${purity} gold`,
        theme: { color: '#f59e0b' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const { data: result } = await purchaseApi.verify({
              transaction_id: order.transaction_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setCredited({ grams: result.gold_credited_grams, balance: result.new_balance_grams })
            setBuyStep('success')
          } catch {
            setBuyError('Payment was received but verification failed. Contact support.')
            setBuyStep('error')
          }
        },
        modal: {
          ondismiss: () => {
            if (buyStep === 'paying') setBuyStep('form')
          },
        },
      })
      rz.open()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setBuyError(msg || 'Something went wrong. Please try again.')
      setBuyStep('form')
    }
  }

  async function handleEMI() {
    const monthly = parseFloat(emiAmount)
    if (!monthly || monthly < 500) { setEmiError('Minimum monthly amount is ₹500'); return }
    setEmiError('')
    setEmiStep('paying')
    try {
      const { data: plan } = await emiApi.createPlan(shopId, monthly, emiMonths, emiPurity)
      const { data: order } = await emiApi.initiatePay(plan.plan_id)
      const loaded = await loadRazorpay()
      if (!loaded) { setEmiError('Failed to load payment gateway.'); setEmiStep('form'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rz = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(monthly * 100),
        currency: 'INR',
        order_id: order.razorpay_order_id,
        name: shop?.name ?? 'GoldMarket',
        description: `EMI Installment 1/${emiMonths} · ${emiPurity.toUpperCase()} Gold`,
        theme: { color: '#f59e0b' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const { data: result } = await emiApi.verifyPay(
              plan.plan_id,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            )
            setEmiResult({ grams: result.gold_credited_grams, remaining: result.installments_remaining })
            setEmiStep('success')
          } catch {
            setEmiError('Payment received but verification failed. Contact support.')
            setEmiStep('error')
          }
        },
        modal: { ondismiss: () => { setEmiStep('form') } },
      })
      rz.open()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setEmiError(msg || 'Something went wrong. Please try again.')
      setEmiStep('form')
    }
  }

  const rateForPurity = purity === '22k' ? rate?.rate_per_gram_22k : rate?.rate_per_gram_24k
  const estimatedGrams = rateForPurity && parseFloat(amountInr) >= 100
    ? (parseFloat(amountInr) / rateForPurity).toFixed(4)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="text-5xl mb-4 opacity-20">🏪</div>
        <p className="text-white font-medium mb-2">Shop not found</p>
        <Link href="/shops" className="text-amber-400 text-sm hover:underline">← Back to shops</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/shops" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Back to shops
      </Link>

      {/* Shop header */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-2xl shrink-0">
            {shop.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{shop.name}</h1>
              {shop.accepts_emi && (
                <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  EMI Plans
                </span>
              )}
              {shop.status === 'approved' && (
                <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-2">{shop.address}, {shop.city}</p>
            <StarRating rating={shop.avg_rating} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap gap-4 text-sm text-gray-400">
          <span>📞 {shop.phone}</span>
          <span>👥 {shop.review_count} review{shop.review_count !== 1 ? 's' : ''}</span>
          {distanceKm !== null && (
            <span>📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}</span>
          )}
        </div>
      </div>

      {/* Gold rates */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Today&apos;s Gold Rates</h2>
        {rate ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
              <div className="text-amber-400/60 text-xs uppercase tracking-wider mb-2">22 Karat</div>
              <div className="text-3xl font-bold text-white mb-0.5">₹{rate.rate_per_gram_22k.toLocaleString('en-IN')}</div>
              <div className="text-gray-500 text-xs">per gram</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">24 Karat</div>
              <div className="text-3xl font-bold text-white mb-0.5">₹{rate.rate_per_gram_24k.toLocaleString('en-IN')}</div>
              <div className="text-gray-500 text-xs">per gram</div>
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">This shop hasn&apos;t set today&apos;s rates yet.</p>
          </div>
        )}
      </div>

      {/* Rate history chart */}
      <RateHistorySection shopId={shopId} />

      {/* Map */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Location</h2>
        <div className="rounded-2xl overflow-hidden border border-white/[0.08]" style={{ height: 240 }}>
          <iframe
            title="Shop location"
            width="100%"
            height="100%"
            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${shop.longitude - 0.008},${shop.latitude - 0.008},${shop.longitude + 0.008},${shop.latitude + 0.008}&layer=mapnik&marker=${shop.latitude},${shop.longitude}`}
          />
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${shop.latitude}&mlon=${shop.longitude}#map=16/${shop.latitude}/${shop.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 hover:text-amber-400 transition-colors mt-1.5 inline-block"
        >
          Open in maps →
        </a>
      </div>

      {/* Buy action buttons */}
      {rate && isAuthenticated && role === 'customer' && buyStep === 'idle' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setBuyStep('form')}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold py-4 px-6 rounded-2xl transition-colors text-sm flex items-center justify-between"
          >
            <div className="text-left">
              <div className="font-bold">Buy Gold</div>
              <div className="font-normal opacity-70 text-xs mt-0.5">One-time purchase</div>
            </div>
            <span className="text-xl">→</span>
          </button>
          {shop.accepts_emi && (
            <button
              onClick={() => setEmiStep('form')}
              className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-amber-500/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all text-sm flex items-center justify-between"
            >
              <div className="text-left">
                <div className="font-bold">Start EMI Plan</div>
                <div className="font-normal text-gray-400 text-xs mt-0.5">From ₹500/month</div>
              </div>
              <span className="text-xl">📅</span>
            </button>
          )}
        </div>
      )}

      {/* Buy form */}
      {rate && buyStep === 'form' && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Buy Gold</h2>
            <button onClick={() => { setBuyStep('idle'); setBuyError('') }} className="text-gray-500 hover:text-white text-sm transition-colors">
              Cancel
            </button>
          </div>

          {/* Purity selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Gold Purity</label>
            <div className="grid grid-cols-2 gap-2">
              {(['22k', '24k'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurity(p)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                    purity === p
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-white/[0.02] border-white/[0.08] text-gray-400 hover:border-white/20'
                  }`}
                >
                  {p.toUpperCase()} · ₹{(p === '22k' ? rate.rate_per_gram_22k : rate.rate_per_gram_24k).toLocaleString('en-IN')}/g
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Amount (₹)</label>
            <input
              type="number"
              min={100}
              step={100}
              value={amountInr}
              onChange={(e) => { setAmountInr(e.target.value); setBuyError('') }}
              placeholder="e.g. 5000"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
            />
            {estimatedGrams && (
              <p className="text-amber-400/80 text-xs mt-1.5">
                ≈ {estimatedGrams}g of {purity.toUpperCase()} gold
              </p>
            )}
          </div>

          {buyError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              {buyError}
            </div>
          )}

          <button
            onClick={handleBuy}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Proceed to Pay ₹{parseFloat(amountInr || '0').toLocaleString('en-IN')}
          </button>
        </div>
      )}

      {/* Paying state */}
      {buyStep === 'paying' && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 mb-6 flex flex-col items-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-400 text-sm">Opening payment gateway…</p>
        </div>
      )}

      {/* Success */}
      {buyStep === 'success' && credited && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400 text-lg">✓</div>
            <div>
              <p className="text-green-400 font-semibold">Payment Successful!</p>
              <p className="text-gray-500 text-xs">Gold has been credited to your account</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">Gold Credited</p>
              <p className="text-amber-400 font-bold">{credited.grams.toFixed(4)}g</p>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">New Balance</p>
              <p className="text-white font-bold">{credited.balance.toFixed(4)}g</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setBuyStep('form'); setAmountInr(''); setCredited(null) }}
              className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm font-medium py-2.5 rounded-xl transition-all"
            >
              Buy More
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {buyStep === 'error' && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6">
          <p className="text-red-400 font-medium text-sm mb-1">Payment verification failed</p>
          <p className="text-gray-500 text-xs mb-4">{buyError}</p>
          <button
            onClick={() => setBuyStep('idle')}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            ← Go back
          </button>
        </div>
      )}

      {/* EMI form */}
      {shop.accepts_emi && rate && emiStep === 'form' && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Start EMI Gold Plan</h2>
            <button onClick={() => { setEmiStep('idle'); setEmiError('') }} className="text-gray-500 hover:text-white text-sm transition-colors">Cancel</button>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Gold Purity</label>
            <div className="grid grid-cols-2 gap-2">
              {(['22k', '24k'] as const).map((p) => (
                <button key={p} type="button" onClick={() => setEmiPurity(p)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${emiPurity === p ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-white/[0.02] border-white/[0.08] text-gray-400 hover:border-white/20'}`}>
                  {p.toUpperCase()} · ₹{(p === '22k' ? rate.rate_per_gram_22k : rate.rate_per_gram_24k).toLocaleString('en-IN')}/g
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Monthly Amount (₹)</label>
            <input type="number" min={500} step={100} value={emiAmount}
              onChange={(e) => { setEmiAmount(e.target.value); setEmiError('') }}
              placeholder="e.g. 1000"
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 6, 12, 24].map((m) => (
                <button key={m} type="button" onClick={() => setEmiMonths(m)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${emiMonths === m ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-white/[0.02] border-white/[0.08] text-gray-400 hover:border-white/20'}`}>
                  {m}M
                </button>
              ))}
            </div>
          </div>

          {parseFloat(emiAmount) >= 500 && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 mb-4 text-xs text-gray-400 space-y-1">
              <div className="flex justify-between"><span>Total investment</span><span className="text-white font-medium">₹{(parseFloat(emiAmount) * emiMonths).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>Est. gold ({emiPurity.toUpperCase()})</span><span className="text-amber-400 font-medium">{((parseFloat(emiAmount) * emiMonths) / (emiPurity === '22k' ? rate.rate_per_gram_22k : rate.rate_per_gram_24k)).toFixed(4)}g</span></div>
              <div className="flex justify-between"><span>First installment today</span><span className="text-white font-medium">₹{parseFloat(emiAmount).toLocaleString('en-IN')}</span></div>
            </div>
          )}

          {emiError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">{emiError}</div>}

          <button onClick={handleEMI} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-xl text-sm transition-colors">
            Pay First Installment ₹{parseFloat(emiAmount || '0').toLocaleString('en-IN')}
          </button>
        </div>
      )}

      {/* EMI paying */}
      {emiStep === 'paying' && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 mb-6 flex flex-col items-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-400 text-sm">Setting up your plan…</p>
        </div>
      )}

      {/* EMI success */}
      {emiStep === 'success' && emiResult && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400 text-lg">✓</div>
            <div>
              <p className="text-green-400 font-semibold">EMI Plan Active!</p>
              <p className="text-gray-500 text-xs">First installment paid, gold credited</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">Gold Credited</p>
              <p className="text-amber-400 font-bold">{emiResult.grams.toFixed(4)}g</p>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-0.5">Installments Left</p>
              <p className="text-white font-bold">{emiResult.remaining}</p>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm font-medium py-2.5 rounded-xl transition-all">
            View My Plans on Dashboard
          </button>
        </div>
      )}

      {/* EMI error */}
      {emiStep === 'error' && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6">
          <p className="text-red-400 font-medium text-sm mb-1">EMI payment failed</p>
          <p className="text-gray-500 text-xs mb-4">{emiError}</p>
          <button onClick={() => setEmiStep('idle')} className="text-sm text-amber-400 hover:text-amber-300 transition-colors">← Go back</button>
        </div>
      )}

      {/* No EMI notice */}
      {rate && isAuthenticated && role === 'customer' && !shop.accepts_emi && buyStep === 'idle' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 mb-6 flex items-center gap-2.5">
          <span className="text-gray-600 text-base">📅</span>
          <p className="text-gray-500 text-sm">This shop does not offer EMI plans. You can still buy gold in a one-time purchase.</p>
        </div>
      )}

      {/* Not authenticated prompt */}
      {!isAuthenticated && rate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => router.push('/login')}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold py-4 px-6 rounded-2xl transition-colors text-sm flex items-center justify-between"
          >
            <div className="text-left">
              <div className="font-bold">Buy Gold</div>
              <div className="font-normal opacity-70 text-xs mt-0.5">Sign in to purchase</div>
            </div>
            <span className="text-xl">→</span>
          </button>
          {shop.accepts_emi && (
            <button
              onClick={() => router.push('/login')}
              className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-white font-semibold py-4 px-6 rounded-2xl transition-all text-sm flex items-center justify-between"
            >
              <div className="text-left">
                <div className="font-bold">Start EMI Plan</div>
                <div className="font-normal text-gray-400 text-xs mt-0.5">Sign in to start</div>
              </div>
              <span className="text-xl">📅</span>
            </button>
          )}
        </div>
      )}

      <ReviewsSection shopId={shopId} isCustomer={isAuthenticated && role === 'customer'} />
    </div>
  )
}
