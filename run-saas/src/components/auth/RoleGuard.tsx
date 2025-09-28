// components/auth/RoleGuard.tsx
"use client"

import { useAuth, usePermissions } from '@/hooks'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { UserRole } from '@/types'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole | UserRole[]
  fallbackPath?: string
  requireAuth?: boolean
}

export function RoleGuard({
  children,
  allowedRoles,
  fallbackPath = '/login',
  requireAuth = true
}: RoleGuardProps) {
  const { user, isAuthenticated, sessionStatus } = useAuth()
  const { hasRole } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    // Wait for session to load
    if (sessionStatus === 'loading') return

    // Redirect to login if auth required but not authenticated
    if (requireAuth && !isAuthenticated) {
      router.push(fallbackPath)
      return
    }

    // Check role permissions if specified
    if (allowedRoles && user) {
      const hasValidRole = hasRole(allowedRoles)
      if (!hasValidRole) {
        // Redirect to appropriate dashboard based on actual role
        const redirectPath = user.role === 'admin' ? '/admin' :
                           user.role === 'teacher' ? '/teacher' :
                           user.role === 'student' ? '/student' : '/login'
        router.push(redirectPath)
        return
      }
    }
  }, [sessionStatus, isAuthenticated, user, allowedRoles, requireAuth, hasRole, router, fallbackPath])

  // Show loading while session loads
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Don't render if auth required but not authenticated
  if (requireAuth && !isAuthenticated) {
    return null
  }

  // Don't render if role check fails
  if (allowedRoles && user && !hasRole(allowedRoles)) {
    return null
  }

  return <>{children}</>
}
