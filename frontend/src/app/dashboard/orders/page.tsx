'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { shopApi, ShopOrder } from '@/lib/api'

const TYPE_LABELS: Record<string, string> = {
  lumpsum_buy: 'Gold Purchase',
  emi_payment: 'EMI Payment',
  redemption: 'Redemption',
  refund: 'Refund',
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500/10 border-green-500/20 text-green-400',
  pending: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  failed: 'bg-red-500/10 border-red-500/20 text-red-400',
  refunded: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
}

export default function OrdersPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'jeweller')) router.push('/dashboard')
  }, [isAuthenticated, isLoading, role, router])

  useEffect(() => {
    if (!isAuthenticated || role !== 'jeweller') return
    shopApi.getMyOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [isAuthenticated, role])

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const totalVolume = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.amount_inr, 0)
  const totalGold = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.gold_grams, 0)
  const completedCount = orders.filter((o) => o.status === 'completed').length

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-sm mb-6 transition-colors">
        ← Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="text-gray-400 text-sm mt-1">All customer transactions across your shops</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Total Orders</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
          <p className="text-gray-600 text-xs mt-1">{completedCount} completed</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Total Volume</p>
          <p className="text-2xl font-bold text-white">₹{totalVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-gray-600 text-xs mt-1">Completed only</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Gold Sold</p>
          <p className="text-2xl font-bold text-white">{totalGold.toFixed(4)}g</p>
          <p className="text-gray-600 text-xs mt-1">Completed only</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl w-fit mb-6">
        {(['all', 'completed', 'pending', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === f ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? `All (${orders.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${orders.filter((o) => o.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3 opacity-20">📦</div>
            <p className="text-gray-400 text-sm font-medium mb-1">No orders yet</p>
            <p className="text-gray-600 text-xs">Customer transactions will appear here once they buy gold from your shop.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((order) => {
              const date = new Date(order.created_at)
              const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={order.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${STATUS_STYLES[order.status]}`}>
                    {order.status === 'completed' ? '✓' : order.status === 'failed' ? '✕' : '⏳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-medium">{order.customer_name}</p>
                      <span className="text-gray-600 text-xs hidden sm:inline">·</span>
                      <p className="text-gray-500 text-xs truncate">{order.customer_email}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-gray-600 text-xs">{dateStr} · {timeStr}</p>
                      <span className="text-gray-700 text-xs">·</span>
                      <p className="text-gray-500 text-xs">{order.shop_name}</p>
                      <span className="text-gray-700 text-xs">·</span>
                      <p className="text-gray-600 text-xs">{TYPE_LABELS[order.transaction_type] ?? order.transaction_type}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white text-sm font-semibold">₹{order.amount_inr.toLocaleString('en-IN')}</p>
                    {order.status === 'completed' && (
                      <p className="text-amber-400 text-xs">+{order.gold_grams.toFixed(4)}g</p>
                    )}
                    {order.status !== 'completed' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[order.status]}`}>
                        {order.status}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
