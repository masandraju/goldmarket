import Link from 'next/link'

const STATS = [
  { value: '500+', label: 'Verified Jewellers' },
  { value: '₹50Cr+', label: 'Gold Traded' },
  { value: '10,000+', label: 'Happy Customers' },
  { value: '22k & 24k', label: 'Purity Options' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Find a Jeweller',
    desc: 'Browse verified jewellers near you. See live gold rates, ratings, and services.',
  },
  {
    step: '02',
    title: 'Buy or Start SIP',
    desc: 'Buy gold instantly or set up a monthly EMI plan starting at just ₹500.',
  },
  {
    step: '03',
    title: 'Redeem Anytime',
    desc: 'Convert your digital gold balance into jewellery or coins at any partner store.',
  },
]

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center">
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Now live in Pune
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              India&apos;s smartest{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                gold marketplace
              </span>
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg">
              Buy 22k &amp; 24k gold from trusted local jewellers. Invest via monthly SIP plans or
              one-time purchase. Transparent pricing, zero hidden charges.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Start Investing Free
              </Link>
              <Link
                href="/login"
                className="border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all text-sm"
              >
                Sign In
              </Link>
            </div>

            <p className="text-gray-600 text-xs mt-4">No minimum investment. Cancel anytime.</p>
          </div>

          {/* Right — value card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-5">
                <span className="text-gray-400 text-sm">Why GoldMarket</span>
                <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Trusted
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { icon: '📍', title: 'Local jewellers only', desc: 'Every shop is verified and approved by our team' },
                  { icon: '💰', title: 'Rates set daily', desc: 'Each jeweller publishes their own 22k & 24k price every day' },
                  { icon: '📊', title: 'Full rate history', desc: 'Track price trends before you buy — 1 day to 1 year' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <span className="text-lg mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/shops"
                className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Browse Jewellers & Rates
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">How it works</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            From discovery to doorstep in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-amber-500/20 transition-colors"
            >
              <div className="text-amber-500/40 font-black text-4xl mb-4">{item.step}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/15 rounded-2xl px-8 py-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to start investing in gold?
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Join thousands of customers already investing with GoldMarket
          </p>
          <Link
            href="/register"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  )
}
