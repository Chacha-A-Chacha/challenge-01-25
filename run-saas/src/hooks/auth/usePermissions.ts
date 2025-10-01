// hooks/auth/usePermissions.ts
import { useAuth } from '@/store/auth/auth-store'
import { Permission, checkPermission, hasRole as checkRole } from '@/lib/permissions'
import type { UserRole } from '@/types'

/**
 * Minimal permission hook - computes permissions on demand
 *
 * Usage:
 *   const { can, isAdmin, isHeadTeacher } = usePermissions()
 *
 *   if (can(Permission.CREATE_COURSE)) {
 *     // Show create course UI
 *   }
 */
export function usePermissions() {
  const { user } = useAuth()

  return {

    // ROLE FLAGS (Computed from current user)
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    isHeadTeacher: user?.role === 'teacher' && user?.teacherRole === 'HEAD',
    isAdditionalTeacher: user?.role === 'teacher' && user?.teacherRole === 'ADDITIONAL',
    isAuthenticated: !!user,

    // PERMISSION CHECKING (On-demand, type-safe)
    /**
     * Check if user has a specific permission
     *
     * @example
     * if (can(Permission.CREATE_COURSE)) {
     *   // User can create courses
     * }
     */
    can: (permission: Permission): boolean => {
      return checkPermission(user, permission)
    },

    /**
     * Check if user has ANY of the provided permissions
     *
     * @example
     * if (canAny([Permission.IMPORT_STUDENTS, Permission.CREATE_SESSION])) {
     *   // User can do at least one of these
     * }
     */
    canAny: (permissions: Permission[]): boolean => {
      return permissions.some(p => checkPermission(user, p))
    },

    /**
     * Check if user has ALL of the provided permissions
     *
     * @example
     * if (canAll([Permission.CREATE_CLASS, Permission.ADD_TEACHER])) {
     *   // User can do both (likely a head teacher)
     * }
     */
    canAll: (permissions: Permission[]): boolean => {
      return permissions.every(p => checkPermission(user, p))
    },

    /**
     * Check if user has a specific role
     *
     * @example
     * if (hasRole(['admin', 'teacher'])) {
     *   // User is either admin or teacher
     * }
     */
    hasRole: (roles: UserRole | UserRole[]): boolean => {
      return checkRole(user, roles)
    },

    /**
     * Require a specific role or throw error
     * Useful for protecting operations
     *
     * @example
     * requireRole('admin') // Throws if not admin
     */
    requireRole: (roles: UserRole | UserRole[]): boolean => {
      if (!checkRole(user, roles)) {
        throw new Error('Insufficient permissions')
      }
      return true
    },


    // CONTEXT (Current user info)
    user,
    courseId: user?.courseId,
    classId: user?.classId,


    // CONVENIENCE FLAGS (Common permission groups)
    canManageUsers: user?.role === 'admin' || (user?.role === 'teacher' && user?.teacherRole === 'HEAD'),
    canAccessAdminFeatures: user?.role === 'admin',
    canAccessTeacherFeatures: user?.role === 'teacher',
    canAccessStudentFeatures: user?.role === 'student',
  }
}
