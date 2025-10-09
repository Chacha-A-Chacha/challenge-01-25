// components/auth/RoleGuard.tsx
"use client"

import { useAuthStore } from '@/store/auth/auth-store'
import { usePermissions } from '@/hooks'
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
  const router = useRouter()

  // ✅ Direct selectors - stable references
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const sessionStatus = useAuthStore(state => state.sessionStatus)

  const { hasRole } = usePermissions()

  useEffect(() => {
    if (sessionStatus === 'loading') return

    if (requireAuth && !isAuthenticated) {
      router.push(fallbackPath)
      return
    }

    if (allowedRoles && user) {
      const hasValidRole = hasRole(allowedRoles)
      if (!hasValidRole) {
        const redirectPath = user.role === 'admin' ? '/admin' :
                           user.role === 'teacher' ? '/teacher' :
                           user.role === 'student' ? '/student' : '/login'
        router.push(redirectPath)
        return
      }
    }
  }, [sessionStatus, isAuthenticated, user?.role, allowedRoles, requireAuth, fallbackPath, router, hasRole])
  // ✅ Use user.role instead of user object

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) return null
  if (allowedRoles && user && !hasRole(allowedRoles)) return null

  return <>{children}</>
}
