// components/auth/AuthRedirect.tsx
"use client"

import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthRedirectProps {
  children: React.ReactNode
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const { user, isAuthenticated, sessionStatus } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (sessionStatus === 'loading') return

    if (isAuthenticated && user) {
      // Redirect authenticated users to their dashboard
      const dashboardPath = user.role === 'admin' ? '/admin' :
                           user.role === 'teacher' ? '/teacher' :
                           user.role === 'student' ? '/student' : '/login'
      router.push(dashboardPath)
    }
  }, [isAuthenticated, user, sessionStatus, router])

  // Don't render children if user is authenticated (will redirect)
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return <>{children}</>
}