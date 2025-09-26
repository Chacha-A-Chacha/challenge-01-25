// hooks/admin/useTeacherManagement.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth/auth-store'
import { useNotifications } from '@/store/shared/ui-store'
import { useModals } from '@/store/shared/ui-store'
import { fetchWithTimeout, handleApiError } from '@/lib/utils'
import type { ApiResponse, TeacherWithCourse } from '@/types'

interface TeacherStats {
  total: number
  headTeachers: number
  additionalTeachers: number
  activeCourses: number
  recentlyAdded: number
}

/**
 * Teacher oversight and management for admins
 * Handles cross-course teacher operations
 */
export function useTeacherManagement() {
  const { isAdmin } = useAuth()
  const { showSuccess, showError } = useNotifications()
  const { openModal } = useModals()

  const [teachers, setTeachers] = useState<TeacherWithCourse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeachers = async () => {
    if (!isAdmin()) {
      setError('Permission denied')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithTimeout('/api/admin/teachers')

      if (!response.ok) {
        throw new Error(`Failed to fetch teachers: ${response.status}`)
      }

      const result: ApiResponse<TeacherWithCourse[]> = await response.json()

      if (result.success && result.data) {
        setTeachers(result.data)
      } else {
        throw new Error(result.error || 'Failed to load teachers')
      }
    } catch (error) {
      const errorMessage = handleApiError(error).error
      setError(errorMessage)
      showError('Failed to Load Teachers', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDeactivateTeacher = (teacherId: string, teacherEmail: string, courseName: string) => {
    openModal({
      component: 'ConfirmDialog',
      props: {
        title: 'Deactivate Teacher',
        message: `Are you sure you want to remove ${teacherEmail} from "${courseName}"? They will lose access to the course immediately.`,
        confirmLabel: 'Deactivate Teacher',
        cancelLabel: 'Cancel',
        variant: 'destructive',
        onConfirm: () => deactivateTeacher(teacherId),
        onCancel: () => {}
      },
      size: 'md'
    })
  }

  const deactivateTeacher = async (teacherId: string) => {
    try {
      const response = await fetchWithTimeout(`/api/admin/teachers/${teacherId}/deactivate`, {
        method: 'POST'
      })

      const result: ApiResponse<void> = await response.json()

      if (result.success) {
        showSuccess('Teacher Deactivated', 'Teacher has been removed from their course')
        await fetchTeachers() // Refresh the list
        return true
      } else {
        throw new Error(result.error || 'Failed to deactivate teacher')
      }
    } catch (error) {
      const errorMessage = handleApiError(error).error
      showError('Deactivation Failed', errorMessage)
      return false
    }
  }

  const confirmResetPassword = (teacherId: string, teacherEmail: string) => {
    openModal({
      component: 'ConfirmDialog',
      props: {
        title: 'Reset Password',
        message: `Generate a new temporary password for ${teacherEmail}? The teacher will need to change it on next login.`,
        confirmLabel: 'Reset Password',
        cancelLabel: 'Cancel',
        onConfirm: () => resetPassword(teacherId),
        onCancel: () => {}
      },
      size: 'md'
    })
  }

  const resetPassword = async (teacherId: string) => {
    try {
      const response = await fetchWithTimeout(`/api/admin/teachers/${teacherId}/reset-password`, {
        method: 'POST'
      })

      const result: ApiResponse<{ temporaryPassword: string }> = await response.json()

      if (result.success && result.data) {
        // Show the temporary password to the admin
        openModal({
          component: 'InfoDialog',
          props: {
            title: 'Password Reset Successful',
            message: `Temporary password: ${result.data.temporaryPassword}\n\nPlease share this with the teacher securely. They must change it on next login.`,
            confirmLabel: 'Copy Password',
            onConfirm: () => {
              navigator.clipboard.writeText(result.data!.temporaryPassword)
              showSuccess('Copied', 'Password copied to clipboard')
            }
          },
          size: 'md'
        })
        return result.data.temporaryPassword
      } else {
        throw new Error(result.error || 'Failed to reset password')
      }
    } catch (error) {
      const errorMessage = handleApiError(error).error
      showError('Password Reset Failed', errorMessage)
      return null
    }
  }

  // Calculate teacher statistics
  const teacherStats: TeacherStats = {
    total: teachers.length,
    headTeachers: teachers.filter(t => t.role === 'HEAD').length,
    additionalTeachers: teachers.filter(t => t.role === 'ADDITIONAL').length,
    activeCourses: new Set(teachers.filter(t => t.course?.status === 'ACTIVE').map(t => t.course?.id)).size,
    recentlyAdded: teachers.filter(t => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(t.createdAt) > weekAgo
    }).length
  }

  // Load teachers on mount
  useEffect(() => {
    if (isAdmin()) {
      fetchTeachers()
    }
  }, [isAdmin])

  return {
    // Data
    teachers,
    teacherStats,

    // State
    isLoading,
    error,

    // Actions
    confirmDeactivateTeacher,
    confirmResetPassword,
    refresh: fetchTeachers,
    clearError: () => setError(null)
  }
}
