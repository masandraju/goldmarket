'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { isAuthenticated, role, logout } = useAuth()

  return (
    <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-sm">
            G
          </div>
          <span className="font-bold text-white text-lg">
            Gold<span className="text-amber-400">Market</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {(role === 'customer' || role === 'super_admin') && (
                <Link
                  href="/shops"
                  className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-all"
                >
                  Find Shops
                </Link>
              )}
              {role === 'super_admin' ? (
                <Link
                  href="/admin"
                  className="text-amber-400 hover:text-amber-300 text-sm px-3 py-2 rounded-lg hover:bg-amber-500/[0.08] transition-all font-medium"
                >
                  Admin Panel
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-all"
                >
                  Dashboard
                </Link>
              )}
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-amber-400 text-xs font-semibold uppercase">{role?.[0]}</span>
                  </div>
                  <span className="text-gray-400 text-xs capitalize hidden sm:block">{role}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
