// hooks/admin/useTeacherManagement.ts
import { useApiQuery, useApiMutation } from '@/hooks/api'
import { useNotifications, useModal } from '@/hooks/ui'
import { usePermissions } from '@/hooks/auth'

interface TeacherWithCourse {
  id: string
  email: string
  role: 'HEAD' | 'ADDITIONAL'
  course: {
    id: string
    name: string
    status: string
  }
  createdAt: string
}

/**
 * Teacher management and oversight
 */
export function useTeacherManagement() {
  const { showSuccess, showError } = useNotifications()
  const { openConfirmDialog } = useModal()
  const { canManageSystem } = usePermissions()

  // Fetch all teachers across all courses
  const {
    data: teachers = [],
    isLoading,
    error,
    refetch
  } = useApiQuery<TeacherWithCourse[]>(
    'all-teachers',
    '/api/admin/teachers',
    {
      enabled: canManageSystem,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Deactivate teacher (removes from course)
  const deactivateTeacherMutation = useApiMutation(
    async (teacherId: string) => {
      const response = await fetch(`/api/admin/teachers/${teacherId}/deactivate`, {
        method: 'POST'
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Teacher Deactivated', 'Teacher has been removed from their course')
        refetch()
      },
      onError: (error) => showError('Failed to Deactivate Teacher', error)
    }
  )

  // Reset teacher password
  const resetPasswordMutation = useApiMutation(
    async (teacherId: string) => {
      const response = await fetch(`/api/admin/teachers/${teacherId}/reset-password`, {
        method: 'POST'
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Password Reset', 'Temporary password has been generated')
      },
      onError: (error) => showError('Failed to Reset Password', error)
    }
  )

  // Action handlers
  const deactivateTeacher = async (teacherId: string, teacherEmail: string, courseName: string) => {
    if (!canManageSystem) {
      showError('Permission Denied', 'You do not have permission to deactivate teachers')
      return false
    }

    return new Promise<boolean>((resolve) => {
      openConfirmDialog(
        'Deactivate Teacher',
        `Are you sure you want to remove ${teacherEmail} from "${courseName}"? They will lose access to the course immediately.`,
        async () => {
          try {
            await deactivateTeacherMutation.mutate(teacherId)
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        },
        () => resolve(false),
        'Deactivate Teacher',
        'Cancel'
      )
    })
  }

  const resetTeacherPassword = async (teacherId: string, teacherEmail: string) => {
    if (!canManageSystem) {
      showError('Permission Denied', 'You do not have permission to reset passwords')
      return false
    }

    return new Promise<boolean>((resolve) => {
      openConfirmDialog(
        'Reset Password',
        `Generate a new temporary password for ${teacherEmail}? The teacher will need to change it on next login.`,
        async () => {
          try {
            await resetPasswordMutation.mutate(teacherId)
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        },
        () => resolve(false),
        'Reset Password',
        'Cancel'
      )
    })
  }

  // Teacher statistics
  const teacherStats = {
    total: teachers.length,
    headTeachers: teachers.filter(t => t.role === 'HEAD').length,
    additionalTeachers: teachers.filter(t => t.role === 'ADDITIONAL').length,
    activeCourses: new Set(teachers.filter(t => t.course.status === 'ACTIVE').map(t => t.course.id)).size
  }

  return {
    // Data
    teachers,
    teacherStats,
    
    // State
    isLoading,
    error,
    
    // Mutations state
    isDeactivating: deactivateTeacherMutation.isLoading,
    isResettingPassword: resetPasswordMutation.isLoading,
    
    // Actions
    deactivateTeacher,
    resetTeacherPassword,
    refetch
  }
}
