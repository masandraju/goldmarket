'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthState {
  token: string | null
  role: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (token: string, role: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, role: null, isLoading: true })
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    setState({ token, role, isLoading: false })
  }, [])

  function login(token: string, role: string) {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    setState({ token, role, isLoading: false })
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setState({ token: null, role: null, isLoading: false })
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAuthenticated: !!state.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
