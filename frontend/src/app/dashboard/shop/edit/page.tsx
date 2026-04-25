'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { shopApi, FullShop, ShopEditPayload } from '@/lib/api'
import { Suspense } from 'react'

const ALL_SERVICES = ['Gold Sales', 'Silver Sales', 'Jewellery Making', 'Gold Testing', 'Repair & Polish', 'EMI Plans']

function EditShopForm() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const shopId = Number(searchParams.get('id'))

  const [shop, setShop] = useState<FullShop | null>(null)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState<ShopEditPayload>({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'jeweller')) router.push('/dashboard')
  }, [isAuthenticated, isLoading, role, router])

  useEffect(() => {
    if (!shopId || !isAuthenticated) return
    shopApi.getFullDetails(shopId)
      .then(({ data }) => {
        setShop(data)
        setForm({
          name: data.name,
          description: data.description,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          phone: data.phone,
          email: data.email,
          gstin: data.gstin,
          accepts_emi: data.accepts_emi,
          services: data.services,
        })
      })
      .catch(() => setError('Failed to load shop details.'))
      .finally(() => setFetching(false))
  }, [shopId, isAuthenticated])

  function toggleService(svc: string) {
    setForm((f) => ({
      ...f,
      services: f.services?.includes(svc)
        ? f.services.filter((s) => s !== svc)
        : [...(f.services ?? []), svc],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const updated = await shopApi.editShop(shopId, form)
      setShop(updated.data)
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null
      setError(msg || 'Failed to save changes.')
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

  if (!shop) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-center">
        <p className="text-red-400">{error || 'Shop not found.'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Edit Shop</h1>
        <p className="text-gray-400 text-sm mt-1">{shop.name}</p>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3 mb-6">
          ✓ Changes saved. Redirecting…
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Shop Name *</label>
          <input
            type="text" required value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Description</label>
          <textarea
            rows={2} value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Address *</label>
          <input
            type="text" required value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'City', key: 'city' },
            { label: 'State', key: 'state' },
            { label: 'Pincode', key: 'pincode' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">{f.label}</label>
              <input
                type="text" value={(form[f.key as keyof ShopEditPayload] as string) ?? ''}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Phone *</label>
            <input
              type="tel" required value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email" value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">GSTIN</label>
          <input
            type="text" value={form.gstin ?? ''}
            onChange={(e) => setForm({ ...form, gstin: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/60 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Services Offered</label>
          <div className="flex flex-wrap gap-2">
            {ALL_SERVICES.map((svc) => (
              <button
                key={svc} type="button" onClick={() => toggleService(svc)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  form.services?.includes(svc)
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'border-white/[0.08] text-gray-400 hover:border-white/[0.16]'
                }`}
              >
                {svc}
              </button>
            ))}
          </div>
        </div>

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
          type="submit" disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors mt-2"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

export default function EditShopPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <EditShopForm />
    </Suspense>
  )
}
