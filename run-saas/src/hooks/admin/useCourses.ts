// hooks/admin/useCourses.ts
import { useApiQuery, useApiMutation } from '@/hooks/api'
import { useNotifications, useModal } from '@/hooks/ui'
import { usePermissions } from '@/hooks/auth'
import { API_ROUTES, PERMISSIONS } from '@/lib/constants'
import { createCourseSchema, updateCourseSchema } from '@/lib/validations'
import { createApiResponse } from '@/lib/utils'
import type { Course, CreateCourse, UpdateCourse } from '@/lib/validations'

/**
 * Course CRUD operations for admin
 */
export function useCourses() {
  const { showSuccess, showError } = useNotifications()
  const { openConfirmDialog } = useModal()
  const { canCreateCourse, canManageSystem } = usePermissions()

  // Fetch all courses
  const {
    data: courses = [],
    isLoading,
    error,
    refetch
  } = useApiQuery<Course[]>('courses', API_ROUTES.COURSES, {
    enabled: canManageSystem,
    staleTime: 2 * 60 * 1000, // 2 minutes
    onError: (error) => showError('Failed to Load Courses', error)
  })

  // Create course mutation
  const createCourseMutation = useApiMutation(
    async (data: CreateCourse) => {
      const response = await fetch(API_ROUTES.COURSES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Course Created', 'Course and head teacher created successfully')
        refetch()
      },
      onError: (error) => showError('Failed to Create Course', error)
    }
  )

  // Update course mutation
  const updateCourseMutation = useApiMutation(
    async ({ id, updates }: { id: string; updates: UpdateCourse }) => {
      const response = await fetch(API_ROUTES.COURSE_BY_ID(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Course Updated', 'Course information updated successfully')
        refetch()
      },
      onError: (error) => showError('Failed to Update Course', error)
    }
  )

  // Delete course mutation
  const deleteCourseMutation = useApiMutation(
    async (courseId: string) => {
      const response = await fetch(API_ROUTES.COURSE_BY_ID(courseId), {
        method: 'DELETE'
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Course Deleted', 'Course has been permanently removed')
        refetch()
      },
      onError: (error) => showError('Failed to Delete Course', error)
    }
  )

  // Remove head teacher mutation (deactivates course)
  const removeHeadTeacherMutation = useApiMutation(
    async (courseId: string) => {
      const response = await fetch(API_ROUTES.REMOVE_HEAD_TEACHER(courseId), {
        method: 'POST'
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Head Teacher Removed', 'Course has been deactivated')
        refetch()
      },
      onError: (error) => showError('Failed to Remove Head Teacher', error)
    }
  )

  // Action handlers
  const createCourse = async (data: CreateCourse) => {
    if (!canCreateCourse) {
      showError('Permission Denied', 'You do not have permission to create courses')
      return false
    }

    try {
      await createCourseMutation.mutate(data)
      return true
    } catch (error) {
      return false
    }
  }

  const updateCourse = async (id: string, updates: UpdateCourse) => {
    if (!canManageSystem) {
      showError('Permission Denied', 'You do not have permission to update courses')
      return false
    }

    try {
      await updateCourseMutation.mutate({ id, updates })
      return true
    } catch (error) {
      return false
    }
  }

  const deleteCourse = async (courseId: string, courseName: string) => {
    if (!canManageSystem) {
      showError('Permission Denied', 'You do not have permission to delete courses')
      return false
    }

    return new Promise<boolean>((resolve) => {
      openConfirmDialog(
        'Delete Course',
        `Are you sure you want to permanently delete "${courseName}"? This action cannot be undone and will remove all associated classes, sessions, and attendance records.`,
        async () => {
          try {
            await deleteCourseMutation.mutate(courseId)
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        },
        () => resolve(false),
        'Delete Course',
        'Cancel'
      )
    })
  }

  const removeHeadTeacher = async (courseId: string, courseName: string) => {
    if (!canManageSystem) {
      showError('Permission Denied', 'You do not have permission to remove head teachers')
      return false
    }

    return new Promise<boolean>((resolve) => {
      openConfirmDialog(
        'Remove Head Teacher',
        `Removing the head teacher from "${courseName}" will deactivate the course. Are you sure you want to continue?`,
        async () => {
          try {
            await removeHeadTeacherMutation.mutate(courseId)
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        },
        () => resolve(false),
        'Remove Head Teacher',
        'Cancel'
      )
    })
  }

  // Course statistics
  const courseStats = {
    total: courses.length,
    active: courses.filter(c => c.status === 'ACTIVE').length,
    inactive: courses.filter(c => c.status === 'INACTIVE').length,
    completed: courses.filter(c => c.status === 'COMPLETED').length
  }

  return {
    // Data
    courses,
    courseStats,
    
    // State
    isLoading,
    error,
    
    // Mutations state
    isCreating: createCourseMutation.isLoading,
    isUpdating: updateCourseMutation.isLoading,
    isDeleting: deleteCourseMutation.isLoading,
    isRemovingHeadTeacher: removeHeadTeacherMutation.isLoading,
    
    // Actions
    createCourse,
    updateCourse,
    deleteCourse,
    removeHeadTeacher,
    refetch
  }
}

