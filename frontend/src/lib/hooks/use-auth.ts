'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { consumeLoginRedirect } from '@/lib/utils/login-redirect'
import { requestNavigation } from '@/lib/utils/request-navigation'

export function useAuth() {
  const router = useRouter()
  const {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
    checkAuthRequired,
    error,
    hasHydrated,
    authRequired
  } = useAuthStore()

  useEffect(() => {
    // Only check auth after the store has hydrated from localStorage
    if (hasHydrated) {
      // First check if auth is required
      if (authRequired === null) {
        checkAuthRequired().then((required) => {
          // If auth is required, check if we have valid credentials
          if (required) {
            checkAuth()
          }
        }).catch(() => {
          // The store retains the connection error for the login recovery UI.
        })
      } else if (authRequired) {
        // Auth is required, check credentials
        checkAuth()
      }
      // If authRequired === false, we're already authenticated (set in checkAuthRequired)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, authRequired])

  const handleLogin = async (password: string) => {
    const success = await login(password)
    if (success) {
      // Check if there's a stored redirect path
      router.push(consumeLoginRedirect())
    }
    return success
  }

  const handleLogout = () => {
    requestNavigation(() => {
      logout()
      router.push('/login')
    })
  }

  return {
    isAuthenticated,
    isLoading: isLoading || !hasHydrated || (authRequired === null && !error),
    error,
    login: handleLogin,
    logout: handleLogout
  }
}
