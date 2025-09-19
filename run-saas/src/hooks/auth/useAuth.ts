// hooks/auth/useAuth.ts
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/store'
import { hasPermission, getCurrentUser, isAdmin, isTeacher, isHeadTeacher, isStudent } from '@/lib/auth'
import { USER_ROLES, TEACHER_ROLES } from '@/lib/constants'
import type { AuthUser, UserRole } from '@/types'

/**
 * Core authentication hook - manages current user session
 */
export function useAuth() {
  const { data: session, status, update } = useSession()
  const { login, logout, updateProfile } = useAuthStore()

  const user: AuthUser | null = session?.user || null
  const isAuthenticated = !!user && status === 'authenticated'
  const isLoading = status === 'loading'

  // Role checking functions
  const checkIsAdmin = () => user?.role === USER_ROLES.ADMIN
  const checkIsTeacher = () => user?.role === USER_ROLES.TEACHER
  const checkIsHeadTeacher = () => user?.role === USER_ROLES.TEACHER && user?.teacherRole === TEACHER_ROLES.HEAD
  const checkIsStudent = () => user?.role === USER_ROLES.STUDENT

  // Permission checking
  const checkPermission = async (permission: string) => {
    if (!user) return false
    return await hasPermission(permission)
  }

  // Update session data
  const updateSession = async (updates: Partial<AuthUser>) => {
    if (!user) return false
    
    try {
      await update(updates)
      updateProfile(updates)
      return true
    } catch (error) {
      console.error('Failed to update session:', error)
      return false
    }
  }

  return {
    // User data
    user,
    isAuthenticated,
    isLoading,
    
    // Role checks
    isAdmin: checkIsAdmin(),
    isTeacher: checkIsTeacher(),
    isHeadTeacher: checkIsHeadTeacher(),
    isStudent: checkIsStudent(),
    
    // Actions
    checkPermission,
    updateSession,
    
    // Session utilities
    sessionStatus: status,
    refreshSession: update
  }
}
