// hooks/auth/useLogout.ts
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useClearAllStores } from '@/store'
import { useUIStore } from '@/store'

/**
 * Handle user logout with cleanup
 */
export function useLogout() {
  const router = useRouter()
  const clearStores = useClearAllStores()
  const { showSuccess } = useUIStore()

  const logout = async (redirectTo: string = '/') => {
    try {
      // Clear all store data
      clearStores()
      
      // Sign out from NextAuth
      await signOut({ redirect: false })
      
      showSuccess('Goodbye!', 'Successfully logged out')
      
      // Redirect to specified route
      router.push(redirectTo)
      router.refresh()
      
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if error occurs
      router.push(redirectTo)
    }
  }

  const logoutAndRedirect = (redirectTo: string) => () => logout(redirectTo)

  return {
    logout,
    logoutAndRedirect
  }
}

// hooks/auth/usePermissions.ts
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { PERMISSIONS } from '@/lib/constants'

/**
 * Permission checking and role validation
 */
export function usePermissions() {
  const { user, checkPermission } = useAuth()
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load user permissions on mount and user change
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) {
        setPermissions({})
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const permissionChecks = Object.values(PERMISSIONS).map(async (permission) => {
        const hasAccess = await checkPermission(permission)
        return [permission, hasAccess]
      })

      const results = await Promise.all(permissionChecks)
      const permissionMap = Object.fromEntries(results)
      
      setPermissions(permissionMap)
      setIsLoading(false)
    }

    loadPermissions()
  }, [user, checkPermission])

  // Check specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    return permissions[permission] || false
  }, [permissions])

  // Check multiple permissions (all must be true)
  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => hasPermission(permission))
  }, [hasPermission])

  // Check multiple permissions (at least one must be true)
  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => hasPermission(permission))
  }, [hasPermission])

  // Convenient permission groups
  const canManageSystem = hasPermission(PERMISSIONS.MANAGE_SYSTEM)
  const canCreateCourse = hasPermission(PERMISSIONS.CREATE_COURSE)
  const canAddTeacher = hasPermission(PERMISSIONS.ADD_TEACHER)
  const canImportStudents = hasPermission(PERMISSIONS.IMPORT_STUDENTS)
  const canScanAttendance = hasPermission(PERMISSIONS.SCAN_ATTENDANCE)
  const canGenerateQR = hasPermission(PERMISSIONS.GENERATE_QR)
  const canRequestReassignment = hasPermission(PERMISSIONS.REQUEST_REASSIGNMENT)

  return {
    // State
    permissions,
    isLoading,
    
    // Permission checks
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    
    // Convenient checks
    canManageSystem,
    canCreateCourse,
    canAddTeacher,
    canImportStudents,
    canScanAttendance,
    canGenerateQR,
    canRequestReassignment
  }
}
