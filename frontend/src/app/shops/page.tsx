'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { shopApi, ShopNearbyResult } from '@/lib/api'

const PUNE = { lat: 18.5204, lng: 73.8567 }

const SERVICE_FILTERS = [
  { label: 'Gold Sales', key: 'Gold Sales' },
  { label: 'Silver Sales', key: 'Silver Sales' },
  { label: 'Jewellery Making', key: 'Jewellery Making' },
  { label: 'Gold Testing', key: 'Gold Testing' },
  { label: 'Repair & Polish', key: 'Repair & Polish' },
  { label: 'EMI Plans', key: 'EMI Plans' },
]

type SortKey = 'distance' | 'rating' | 'rate_22k' | 'rate_24k'

const SORT_OPTIONS: { label: string; key: SortKey }[] = [
  { label: 'Distance', key: 'distance' },
  { label: 'Rating', key: 'rating' },
  { label: '22K Rate (low→high)', key: 'rate_22k' },
  { label: '24K Rate (low→high)', key: 'rate_24k' },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} viewBox="0 0 12 12" fill="none" className="w-3 h-3">
          <path
            d="M6 1l1.2 3.6H11L8.1 6.9l1.1 3.5L6 8.5l-3.2 1.9 1.1-3.5L1 4.6h3.8z"
            fill={s <= Math.round(rating) ? '#f59e0b' : '#374151'}
          />
        </svg>
      ))}
      <span className="text-gray-400 text-xs ml-0.5">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
    </div>
  )
}

function ShopCard({ shop }: { shop: ShopNearbyResult }) {
  return (
    <Link href={`/shops/${shop.id}`} className="group block">
      <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-amber-500/20 rounded-2xl p-5 transition-all h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0">
            {shop.name[0]}
          </div>
          <span className="text-gray-500 text-xs">{shop.distance_km.toFixed(1)} km</span>
        </div>

        <h3 className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors mb-1">
          {shop.name}
        </h3>
        <p className="text-gray-500 text-xs mb-3 line-clamp-1">{shop.address}</p>

        <StarRating rating={shop.avg_rating} />

        {/* Rates */}
        {(shop.rate_22k || shop.rate_24k) ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {shop.rate_22k && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5">
                <p className="text-amber-400/60 text-xs">22K</p>
                <p className="text-amber-400 text-sm font-semibold">₹{shop.rate_22k.toLocaleString('en-IN')}</p>
              </div>
            )}
            {shop.rate_24k && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                <p className="text-gray-500 text-xs">24K</p>
                <p className="text-white text-sm font-semibold">₹{shop.rate_24k.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-700 text-xs mt-3">Rates not set today</p>
        )}

        {/* Services */}
        {shop.services.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {shop.services.slice(0, 3).map((svc) => (
              <span key={svc} className="text-xs bg-white/[0.03] border border-white/[0.06] text-gray-500 px-2 py-0.5 rounded-full">
                {svc}
              </span>
            ))}
            {shop.services.length > 3 && (
              <span className="text-xs text-gray-600">+{shop.services.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between">
          {shop.accepts_emi ? (
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              EMI available
            </span>
          ) : <span />}
          <span className="text-amber-400 text-xs font-medium group-hover:underline">View →</span>
        </div>
      </div>
    </Link>
  )
}

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopNearbyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [locationLabel, setLocationLabel] = useState('Pune (default)')
  const [error, setError] = useState('')

  const [activeServices, setActiveServices] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortKey>('distance')
  const [emiOnly, setEmiOnly] = useState(false)
  const [ratesOnly, setRatesOnly] = useState(false)

  function fetchShops(lat: number, lng: number) {
    setLoading(true)
    setError('')
    shopApi.getNearby(lat, lng, 25, 50)
      .then(({ data }) => setShops(data))
      .catch(() => setError('Could not load shops. Make sure the backend is running.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!navigator.geolocation) { fetchShops(PUNE.lat, PUNE.lng); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocationLabel('Your location'); fetchShops(pos.coords.latitude, pos.coords.longitude) },
      () => fetchShops(PUNE.lat, PUNE.lng),
      { timeout: 4000 }
    )
  }, [])

  function toggleService(svc: string) {
    setActiveServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    )
  }

  const filtered = useMemo(() => {
    let list = [...shops]
    if (activeServices.length > 0)
      list = list.filter((s) => activeServices.every((svc) => s.services.includes(svc)))
    if (emiOnly)
      list = list.filter((s) => s.accepts_emi)
    if (ratesOnly)
      list = list.filter((s) => s.rate_22k !== null || s.rate_24k !== null)
    list.sort((a, b) => {
      if (sortBy === 'distance') return a.distance_km - b.distance_km
      if (sortBy === 'rating') return b.avg_rating - a.avg_rating
      if (sortBy === 'rate_22k') {
        if (a.rate_22k === null) return 1
        if (b.rate_22k === null) return -1
        return a.rate_22k - b.rate_22k
      }
      if (sortBy === 'rate_24k') {
        if (a.rate_24k === null) return 1
        if (b.rate_24k === null) return -1
        return a.rate_24k - b.rate_24k
      }
      return 0
    })
    return list
  }, [shops, activeServices, sortBy, emiOnly, ratesOnly])

  const hasFilters = activeServices.length > 0 || emiOnly || ratesOnly

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Nearby Jewellers</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
            <span>📍</span>{locationLabel}
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true)
            navigator.geolocation?.getCurrentPosition(
              (pos) => { setLocationLabel('Your location'); fetchShops(pos.coords.latitude, pos.coords.longitude) },
              () => fetchShops(PUNE.lat, PUNE.lng)
            )
          }}
          className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 px-3 py-1.5 rounded-lg transition-all"
        >
          Use my location
        </button>
      </div>

      {/* Filters + Sort */}
      {!loading && shops.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Service filter chips */}
          <div className="flex flex-wrap gap-2">
            {SERVICE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => toggleService(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  activeServices.includes(f.key)
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'border-white/[0.08] text-gray-400 hover:border-white/[0.16]'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => setEmiOnly(!emiOnly)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                emiOnly ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'border-white/[0.08] text-gray-400 hover:border-white/[0.16]'
              }`}
            >
              EMI only
            </button>
            <button
              onClick={() => setRatesOnly(!ratesOnly)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                ratesOnly ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'border-white/[0.08] text-gray-400 hover:border-white/[0.16]'
              }`}
            >
              Rates set today
            </button>
            {hasFilters && (
              <button
                onClick={() => { setActiveServices([]); setEmiOnly(false); setRatesOnly(false) }}
                className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] text-gray-600 hover:text-gray-400 transition-all"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs">Sort by:</span>
            <div className="flex gap-1 flex-wrap">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    sortBy === opt.key
                      ? 'bg-amber-500 border-amber-500 text-black font-medium'
                      : 'border-white/[0.08] text-gray-400 hover:border-white/[0.16]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
              <div className="w-10 h-10 bg-white/5 rounded-xl mb-3" />
              <div className="h-4 w-2/3 bg-white/5 rounded mb-2" />
              <div className="h-3 w-full bg-white/5 rounded mb-4" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4 opacity-20">🏪</div>
          {hasFilters ? (
            <>
              <p className="text-gray-400 font-medium mb-1">No shops match your filters</p>
              <button
                onClick={() => { setActiveServices([]); setEmiOnly(false); setRatesOnly(false) }}
                className="mt-4 text-sm text-amber-400 hover:underline"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 font-medium mb-1">No shops yet in this area</p>
              <p className="text-gray-600 text-sm">Jewellers are being onboarded — check back soon.</p>
            </>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <p className="text-gray-500 text-sm mb-4">
            {filtered.length} shop{filtered.length !== 1 ? 's' : ''}
            {hasFilters ? ' match your filters' : ' found within 25 km'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        </>
      )}
    </div>
  )
}
