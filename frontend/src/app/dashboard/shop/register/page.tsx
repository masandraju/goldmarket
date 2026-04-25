'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { shopApi, ShopRegisterPayload } from '@/lib/api'

const PUNE = { lat: 18.5204, lng: 73.8567 }

const ALL_SERVICES = ['Gold Sales', 'Silver Sales', 'Jewellery Making', 'Gold Testing', 'Repair & Polish', 'EMI Plans']

export default function RegisterShopPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState<ShopRegisterPayload>({
    name: '',
    description: '',
    address: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '',
    latitude: PUNE.lat,
    longitude: PUNE.lng,
    phone: '',
    email: '',
    gstin: '',
    accepts_emi: false,
    services: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationSet, setLocationSet] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'jeweller')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, role, router])

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        setLocationSet(true)
      },
      () => setLocationSet(false),
      { timeout: 4000 }
    )
  }, [])

  async function geocodeAddress() {
    if (!form.address || !form.city) { setGeocodeError('Enter address and city first.'); return }
    setGeocoding(true)
    setGeocodeError('')
    try {
      const query = encodeURIComponent(`${form.address}, ${form.city}, ${form.pincode}, India`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'en' },
      })
      const data = await res.json()
      if (!data.length) { setGeocodeError('Address not found. Try a shorter or different address.'); return }
      setForm((f) => ({ ...f, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }))
      setLocationSet(true)
      setGeocodeError('')
    } catch {
      setGeocodeError('Geocoding failed. Use GPS detection instead.')
    } finally {
      setGeocoding(false)
    }
  }

  function toggleService(svc: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(svc) ? f.services.filter((s) => s !== svc) : [...f.services, svc],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await shopApi.register(form)
      localStorage.setItem('shop_id', String((data as { shop_id: number }).shop_id))
      router.push('/dashboard?shop_registered=1')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setError(msg || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return null

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Register your shop</h1>
        <p className="text-gray-400 text-sm mt-1">Your shop will be reviewed and approved within 24 hours.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Shop name */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Shop Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
            placeholder="Sharma Jewellers"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600 resize-none"
            placeholder="Brief description of your shop..."
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Address *</label>
          <input
            type="text"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
            placeholder="123 MG Road, Shivajinagar"
          />
        </div>

        {/* City / State / Pincode */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'City', key: 'city', placeholder: 'Pune' },
            { label: 'State', key: 'state', placeholder: 'Maharashtra' },
            { label: 'Pincode', key: 'pincode', placeholder: '411001' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">{f.label} *</label>
              <input
                type="text"
                required
                value={form[f.key as keyof ShopRegisterPayload] as string}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>

        {/* Phone / Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Phone *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
              placeholder="9999999999"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
              placeholder="shop@email.com"
            />
          </div>
        </div>

        {/* GSTIN */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">GSTIN</label>
          <input
            type="text"
            value={form.gstin}
            onChange={(e) => setForm({ ...form, gstin: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-600"
            placeholder="27AAPFU0939F1ZV"
          />
        </div>

        {/* Location */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Shop Location</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${locationSet ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
              {locationSet ? '✓ Location set' : '⚠ Using default'}
            </span>
          </div>
          <p className="text-gray-500 text-xs mb-3">
            Lat: {form.latitude.toFixed(6)}, Lng: {form.longitude.toFixed(6)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={geocodeAddress}
              disabled={geocoding}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            >
              {geocoding ? 'Looking up…' : '🔍 Get from address'}
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.geolocation?.getCurrentPosition(
                  (pos) => {
                    setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
                    setLocationSet(true)
                    setGeocodeError('')
                  },
                  () => setGeocodeError('GPS not available. Try "Get from address" instead.')
                )
              }}
              className="text-xs bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-300 px-3 py-1.5 rounded-lg transition-all"
            >
              📍 Use my GPS
            </button>
          </div>
          {geocodeError && <p className="text-red-400 text-xs mt-2">{geocodeError}</p>}
          <p className="text-gray-600 text-xs mt-2">Tip: &quot;Get from address&quot; gives the most accurate location for your shop.</p>
        </div>

        {/* Services */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Services Offered</label>
          <div className="flex flex-wrap gap-2">
            {ALL_SERVICES.map((svc) => (
              <button
                key={svc}
                type="button"
                onClick={() => toggleService(svc)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  form.services.includes(svc)
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'border-white/[0.08] text-gray-400 hover:border-white/[0.16]'
                }`}
              >
                {svc}
              </button>
            ))}
          </div>
        </div>

        {/* EMI toggle */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <div>
            <p className="text-white text-sm font-medium">Accept EMI Plans</p>
            <p className="text-gray-500 text-xs">Allow customers to pay in monthly instalments</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, accepts_emi: !form.accepts_emi })}
            className={`w-11 h-6 rounded-full transition-colors relative ${form.accepts_emi ? 'bg-amber-500' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.accepts_emi ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors mt-2"
        >
          {loading ? 'Submitting…' : 'Submit for Approval'}
        </button>
      </form>
    </div>
  )
}
