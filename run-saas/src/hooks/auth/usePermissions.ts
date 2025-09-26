// hooks/auth/usePermissions.ts
import { useAuth } from '@/store/auth/auth-store'
import type { UserRole } from '@/types'

/**
 * Permission checking hook
 * Uses auth store to determine user permissions based on role and context
 */
export function usePermissions() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth()

  const permissions = {
    // Admin permissions
    canCreateCourse: isAdmin(),
    canManageSystem: isAdmin(),
    canRemoveHeadTeacher: isAdmin(),
    canViewAllCourses: isAdmin(),
    canManageTeachers: isAdmin(),
    canViewSystemStats: isAdmin(),
    canResetTeacherPasswords: isAdmin(),
    canDeactivateTeachers: isAdmin(),

    // Head teacher permissions (only if teacher role is HEAD)
    canAddTeacher: isTeacher() && user?.teacherRole === 'HEAD',
    canRemoveTeacher: isTeacher() && user?.teacherRole === 'HEAD',
    canCreateClass: isTeacher() && user?.teacherRole === 'HEAD',
    canManageCourse: isTeacher() && user?.teacherRole === 'HEAD',
    canManageAllCourseData: isTeacher() && user?.teacherRole === 'HEAD',

    // All teacher permissions (HEAD and ADDITIONAL)
    canImportStudents: isTeacher(),
    canScanAttendance: isTeacher(),
    canCreateSession: isTeacher(),
    canApproveReassignment: isTeacher(),
    canMarkAttendance: isTeacher(),
    canViewStudents: isTeacher(),
    canManageSessions: isTeacher(),
    canViewAttendanceReports: isTeacher(),
    canBulkMarkAttendance: isTeacher(),

    // Student permissions
    canGenerateQR: isStudent(),
    canViewOwnAttendance: isStudent(),
    canRequestReassignment: isStudent(),
    canViewSchedule: isStudent(),
    canViewOwnProfile: isStudent()
  }

  const hasPermission = (permission: keyof typeof permissions): boolean => {
    return permissions[permission] || false
  }

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user?.role) return false

    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    return allowedRoles.includes(user.role)
  }

  const hasAllPermissions = (permissionList: (keyof typeof permissions)[]): boolean => {
    return permissionList.every(permission => hasPermission(permission))
  }

  const hasAnyPermission = (permissionList: (keyof typeof permissions)[]): boolean => {
    return permissionList.some(permission => hasPermission(permission))
  }

  const requireRole = (requiredRoles: UserRole | UserRole[]): boolean => {
    if (!hasRole(requiredRoles)) {
      throw new Error('Insufficient permissions')
    }
    return true
  }

  return {
    // All permissions
    ...permissions,

    // Permission checking methods
    hasPermission,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
    requireRole,

    // User context
    user,

    // Role flags for convenience
    isAdmin: isAdmin(),
    isTeacher: isTeacher(),
    isStudent: isStudent(),
    isHeadTeacher: isTeacher() && user?.teacherRole === 'HEAD',
    isAdditionalTeacher: isTeacher() && user?.teacherRole === 'ADDITIONAL',
    isAuthenticated: !!user,

    // Course context (for teachers)
    courseId: user?.courseId,
    classId: user?.classId,

    // Permission groups for convenience
    canManageUsers: isAdmin() || (isTeacher() && user?.teacherRole === 'HEAD'),
    canAccessAdminFeatures: isAdmin(),
    canAccessTeacherFeatures: isTeacher(),
    canAccessStudentFeatures: isStudent()
  }
}
