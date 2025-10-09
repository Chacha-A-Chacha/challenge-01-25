// components/auth/AuthRedirect.tsx
"use client"

import { useAuthStore } from '@/store/auth/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthRedirectProps {
  children: React.ReactNode
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const router = useRouter()

  // ✅ Direct selectors - stable references
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const sessionStatus = useAuthStore(state => state.sessionStatus)

  useEffect(() => {
    if (sessionStatus === 'loading') return

    if (isAuthenticated && user) {
      const dashboardPath = user.role === 'admin' ? '/admin' :
                           user.role === 'teacher' ? '/teacher' :
                           user.role === 'student' ? '/student' : '/login'
      router.push(dashboardPath)
    }
  }, [isAuthenticated, user?.role, sessionStatus, router])
  // ✅ Use user.role instead of user object

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return <>{children}</>
}

