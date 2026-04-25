'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { goldApi, shopApi, purchaseApi, emiApi, MyShop, Transaction, EMIPlan } from '@/lib/api'

const CUSTOMER_ACTIONS = [
  { label: 'Buy Gold', desc: 'Purchase 22k or 24k gold', icon: '⬇', href: '/shops' },
  { label: 'Start SIP', desc: 'Monthly EMI plan from ₹500', icon: '📅', href: '/shops' },
  { label: 'Find Shops', desc: 'Browse nearby jewellers', icon: '📍', href: '/shops' },
  { label: 'Redeem', desc: 'Convert gold to jewellery', icon: '💍', href: '/dashboard/redeem' },
]

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  approved:  'bg-green-500/10 border-green-500/20 text-green-400',
  suspended: 'bg-red-500/10 border-red-500/20 text-red-400',
  rejected:  'bg-gray-500/10 border-gray-500/20 text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   '⏳ Pending approval',
  approved:  '✓ Approved',
  suspended: '⚠ Suspended',
  rejected:  '✕ Rejected',
}

function ShopStatusCard({ shop, onEmiToggled, onLocationUpdated }: {
  shop: MyShop
  onEmiToggled: (shopId: number, val: boolean) => void
  onLocationUpdated: (shopId: number) => void
}) {
  const [toggling, setToggling] = useState(false)
  const [updatingLoc, setUpdatingLoc] = useState(false)
  const [locMsg, setLocMsg] = useState('')

  async function handleEmiToggle() {
    setToggling(true)
    try {
      const { data } = await shopApi.toggleEmi(shop.id)
      onEmiToggled(shop.id, data.accepts_emi)
    } finally {
      setToggling(false)
    }
  }

  async function handleUpdateLocation() {
    setUpdatingLoc(true)
    setLocMsg('')
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          await shopApi.updateLocation(shop.id, pos.coords.latitude, pos.coords.longitude)
          setLocMsg('✓ Location updated')
          onLocationUpdated(shop.id)
        } catch {
          setLocMsg('Failed to update.')
        } finally {
          setUpdatingLoc(false)
        }
      },
      () => { setLocMsg('GPS unavailable.'); setUpdatingLoc(false) }
    )
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            {shop.name[0]}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{shop.name}</p>
            <p className="text-gray-500 text-xs">{shop.city}</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLES[shop.status]}`}>
          {STATUS_LABELS[shop.status]}
        </span>
      </div>

      <p className="text-gray-500 text-xs mb-3 line-clamp-1">{shop.address}</p>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map((s) => (
            <svg key={s} viewBox="0 0 12 12" fill="none" className="w-3 h-3">
              <path d="M6 1l1.2 3.6H11L8.1 6.9l1.1 3.5L6 8.5l-3.2 1.9 1.1-3.5L1 4.6h3.8z" fill={s <= Math.round(shop.avg_rating) ? '#f59e0b' : '#374151'} />
            </svg>
          ))}
          <span className="text-gray-400 text-xs ml-1">
            {shop.avg_rating > 0 ? shop.avg_rating.toFixed(1) : 'No ratings'}
          </span>
        </div>
        {shop.review_count > 0 && (
          <span className="text-gray-600 text-xs">· {shop.review_count} review{shop.review_count !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/shop/edit?id=${shop.id}`}
          className="text-xs bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-300 px-3 py-1.5 rounded-lg transition-all"
        >
          Edit
        </Link>
        {shop.status === 'approved' && (
          <>
            <Link
              href="/dashboard/rates"
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg transition-all"
            >
              Set Rates
            </Link>
            <Link
              href={`/shops/${shop.id}`}
              className="text-xs bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-300 px-3 py-1.5 rounded-lg transition-all"
            >
              View Shop
            </Link>
            <button
              onClick={handleEmiToggle}
              disabled={toggling}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                shop.accepts_emi
                  ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                  : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:border-white/20'
              }`}
            >
              {toggling ? '…' : shop.accepts_emi ? 'EMI On' : 'EMI Off'}
            </button>
            <button
              onClick={handleUpdateLocation}
              disabled={updatingLoc}
              className="text-xs bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            >
              {updatingLoc ? '…' : '📍 Fix Location'}
            </button>
          </>
        )}
        {locMsg && <p className={`text-xs mt-1 w-full ${locMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{locMsg}</p>}
        {shop.status === 'pending' && (
          <p className="text-gray-600 text-xs">Your shop is under review. Usually approved within 24 hours.</p>
        )}
        {shop.status === 'rejected' && (
          <p className="text-gray-600 text-xs">Contact support for more information.</p>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [myShops, setMyShops] = useState<MyShop[]>([])
  const [shopsLoading, setShopsLoading] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txnLoading, setTxnLoading] = useState(false)
  const [emiPlans, setEmiPlans] = useState<EMIPlan[]>([])
  const [emiLoading, setEmiLoading] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    if (role === 'customer') {
      setBalanceLoading(true)
      goldApi.getBalance()
        .then(({ data }) => setBalance(data.balance_grams))
        .catch(() => setBalance(0))
        .finally(() => setBalanceLoading(false))
      setTxnLoading(true)
      purchaseApi.getTransactions()
        .then(({ data }) => setTransactions(data))
        .catch(() => setTransactions([]))
        .finally(() => setTxnLoading(false))
      setEmiLoading(true)
      emiApi.getMyPlans()
        .then(({ data }) => setEmiPlans(data.filter(p => p.status === 'active')))
        .catch(() => setEmiPlans([]))
        .finally(() => setEmiLoading(false))
    }
    if (role === 'jeweller') {
      setShopsLoading(true)
      shopApi.getMyShops()
        .then(({ data }) => setMyShops(data))
        .catch(() => setMyShops([]))
        .finally(() => setShopsLoading(false))
    }
  }, [isAuthenticated, role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-gray-500 text-sm mb-1 capitalize">{role} account</p>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        </div>
        <Link
          href="/dashboard/profile"
          className="text-xs text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] px-3 py-1.5 rounded-lg transition-all"
        >
          Edit Profile
        </Link>
      </div>

      {/* ── CUSTOMER ─────────────────────────────────────────────── */}
      {role === 'customer' && (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border border-amber-500/20 p-6 mb-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="relative">
              <p className="text-amber-400/70 text-xs font-medium uppercase tracking-wider mb-3">Total Gold Balance</p>
              {balanceLoading ? (
                <div className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-white">{balance?.toFixed(4) ?? '0.0000'}</span>
                  <span className="text-amber-400 font-medium mb-1">grams</span>
                </div>
              )}
              <p className="text-gray-500 text-xs mt-2">
                Browse shops to see today&apos;s live 22k &amp; 24k rates
              </p>
            </div>
          </div>

          {/* Active EMI Plans */}
          {(emiLoading || emiPlans.length > 0) && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Active EMI Plans</h2>
              {emiLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
                      <div className="h-4 w-32 bg-white/5 rounded mb-3" />
                      <div className="h-2 w-full bg-white/5 rounded mb-2" />
                      <div className="h-3 w-20 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {emiPlans.map((plan) => {
                    const progress = Math.round((plan.installments_paid / plan.total_installments) * 100)
                    const dueDate = new Date(plan.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    return (
                      <div key={plan.plan_id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-white font-semibold text-sm">{plan.shop_name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">₹{plan.monthly_installment_inr.toLocaleString('en-IN')}/month</p>
                          </div>
                          <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full shrink-0">Active</span>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                            <span>{plan.installments_paid}/{plan.total_installments} paid</span>
                            <span>{plan.gold_accumulated_grams.toFixed(4)}g accumulated</span>
                          </div>
                          <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                            <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-500 text-xs">Next due: <span className="text-gray-300">{dueDate}</span></p>
                          <Link href="/shops" className="text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg transition-all">
                            Pay Now
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CUSTOMER_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-amber-500/20 rounded-xl p-4 text-left transition-all"
                >
                  <div className="text-2xl mb-3">{action.icon}</div>
                  <div className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors mb-0.5">{action.label}</div>
                  <div className="text-gray-500 text-xs">{action.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── JEWELLER ─────────────────────────────────────────────── */}
      {role === 'jeweller' && (
        <>
          {/* My Shops */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">My Shops</h2>
              <Link
                href="/dashboard/shop/register"
                className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add Shop
              </Link>
            </div>

            {shopsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-9 h-9 bg-white/5 rounded-xl" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-white/5 rounded mb-1" />
                        <div className="h-3 w-16 bg-white/5 rounded" />
                      </div>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : myShops.length === 0 ? (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.10] rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3 opacity-20">🏪</div>
                <p className="text-gray-400 text-sm font-medium mb-1">No shops registered yet</p>
                <p className="text-gray-600 text-xs mb-4">Register your shop to start receiving customers.</p>
                <Link
                  href="/dashboard/shop/register"
                  className="inline-block text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2 rounded-xl transition-colors"
                >
                  Register Your Shop
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myShops.map((shop) => (
                  <ShopStatusCard
                    key={shop.id}
                    shop={shop}
                    onEmiToggled={(id, val) =>
                      setMyShops((prev) => prev.map((s) => s.id === id ? { ...s, accepts_emi: val } : s))
                    }
                    onLocationUpdated={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions — only show if has at least one approved shop */}
          {myShops.some((s) => s.status === 'approved') && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Set Gold Rate', desc: "Update today's prices", icon: '📊', href: '/dashboard/rates' },
                  { label: 'Redemptions', desc: 'View pending requests', icon: '📋', href: '/dashboard/redemptions' },
                  { label: 'View Orders', desc: 'Track all transactions', icon: '📦', href: '/dashboard/orders' },
                  { label: 'Add Shop', desc: 'Register another branch', icon: '🏪', href: '/dashboard/shop/register' },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-amber-500/20 rounded-xl p-4 text-left transition-all"
                  >
                    <div className="text-2xl mb-3">{action.icon}</div>
                    <div className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors mb-0.5">{action.label}</div>
                    <div className="text-gray-500 text-xs">{action.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent Transactions */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Recent Transactions</h2>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {role === 'customer' && txnLoading ? (
            <div className="divide-y divide-white/[0.04]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 bg-white/5 rounded-xl shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 w-32 bg-white/5 rounded mb-2" />
                    <div className="h-3 w-20 bg-white/5 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : role === 'customer' && transactions.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {transactions.map((txn) => {
                const isCompleted = txn.status === 'completed'
                const isFailed = txn.status === 'failed'
                const date = new Date(txn.created_at)
                const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={txn.id} className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                      isCompleted ? 'bg-amber-500/10 border border-amber-500/20' :
                      isFailed ? 'bg-red-500/10 border border-red-500/20' :
                      'bg-white/[0.04] border border-white/[0.08]'
                    }`}>
                      {txn.transaction_type === 'redemption' ? '💍' : isCompleted ? '✓' : isFailed ? '✕' : '⏳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{txn.shop_name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {txn.transaction_type === 'redemption' ? 'Redemption · ' : ''}{dateStr} · {timeStr}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {txn.transaction_type !== 'redemption' && (
                        <p className="text-white text-sm font-semibold">₹{txn.amount_inr.toLocaleString('en-IN')}</p>
                      )}
                      {txn.transaction_type === 'redemption' ? (
                        <p className="text-orange-400 text-sm font-semibold">−{txn.gold_grams.toFixed(4)}g</p>
                      ) : isCompleted ? (
                        <p className="text-amber-400 text-xs">+{txn.gold_grams.toFixed(4)}g</p>
                      ) : (
                        <p className={`text-xs capitalize ${isFailed ? 'text-red-400' : 'text-gray-500'}`}>{txn.status}</p>
                      )}
                      {txn.transaction_type === 'redemption' && (
                        <p className={`text-xs capitalize ${txn.status === 'pending' ? 'text-yellow-500' : txn.status === 'rejected' ? 'text-red-400' : 'text-gray-500'}`}>{txn.status}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="text-4xl mb-4 opacity-30">📜</div>
              <p className="text-gray-400 text-sm font-medium mb-1">No transactions yet</p>
              <p className="text-gray-600 text-xs">
                {role === 'customer'
                  ? 'Make your first gold purchase to see it here.'
                  : 'Transactions from your customers will appear here.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
