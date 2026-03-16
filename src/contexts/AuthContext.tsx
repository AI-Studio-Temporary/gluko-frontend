'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authApi, type User } from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, passwordConfirm: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const REFRESH_KEY = 'gluko_refresh'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
  })

  const setAuth = (user: User | null, accessToken: string | null) => {
    setState({ user, accessToken, isLoading: false })
    // Store a flag in a cookie so middleware can read it
    if (accessToken) {
      document.cookie = `gluko_auth=1; path=/; max-age=${60 * 60}`
    } else {
      document.cookie = 'gluko_auth=; path=/; max-age=0'
    }
  }

  // Attempt silent refresh on mount
  useEffect(() => {
    const refresh = localStorage.getItem(REFRESH_KEY)
    if (!refresh) {
      setState(s => ({ ...s, isLoading: false }))
      return
    }
    authApi
      .refresh(refresh)
      .then(tokens => {
        localStorage.setItem(REFRESH_KEY, tokens.refresh)
        // We don't have user info from refresh — store a minimal user object
        setAuth({ id: 0, email: '' }, tokens.access)
      })
      .catch(() => {
        localStorage.removeItem(REFRESH_KEY)
        setState(s => ({ ...s, isLoading: false }))
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password)
    localStorage.setItem(REFRESH_KEY, tokens.refresh)
    setAuth({ id: 0, email }, tokens.access)
    router.push('/dashboard')
  }, [router])

  const register = useCallback(async (email: string, password: string, passwordConfirm: string) => {
    const { user, tokens } = await authApi.register(email, password, passwordConfirm)
    localStorage.setItem(REFRESH_KEY, tokens.refresh)
    setAuth(user, tokens.access)
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY)
    if (state.accessToken && refresh) {
      await authApi.logout(state.accessToken, refresh).catch(() => {})
    }
    localStorage.removeItem(REFRESH_KEY)
    setAuth(null, null)
    router.push('/login')
  }, [state.accessToken, router])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
