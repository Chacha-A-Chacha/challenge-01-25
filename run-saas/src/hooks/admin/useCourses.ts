// hooks/admin/useCourses.ts
import { useCourseStore } from '@/store/admin/course-store'
import { useNotifications } from '@/store/shared/ui-store'
import { useAuth } from '@/store/auth/auth-store'
import type { CreateCourse, UpdateCourse } from '@/lib/validations'
import type { CourseStatus } from '@/types'

/**
 * Course management hook with permission checking
 * Minimal wrapper around course store
 */
export function useCourses() {
  const { isAdmin } = useAuth()
  const { showSuccess, showError } = useNotifications()
  const store = useCourseStore()

  const createCourse = async (data: CreateCourse) => {
    if (!isAdmin()) {
      showError('Permission Denied', 'You cannot create courses')
      return false
    }

    const course = await store.createCourse(data)
    if (course) {
      showSuccess(
        'Course Created Successfully',
        `Course "${data.courseName}" and head teacher account have been created.`
      )
      return true
    }
    return false
  }

  const updateCourse = async (id: string, updates: UpdateCourse) => {
    if (!isAdmin()) {
      showError('Permission Denied', 'You cannot update courses')
      return false
    }

    const success = await store.updateCourse(id, updates)
    if (success) {
      showSuccess('Course Updated', 'Course information has been updated successfully')
    }
    return success
  }

  const deactivateCourse = async (courseId: string, courseName: string) => {
    if (!isAdmin()) {
      showError('Permission Denied', 'You cannot deactivate courses')
      return false
    }

    const success = await store.updateCourse(courseId, { status: 'INACTIVE' as CourseStatus })
    if (success) {
      showSuccess('Course Deactivated', `"${courseName}" has been deactivated`)
    }
    return success
  }

  return {
    // Pass through all store state and actions
    ...store,

    // Override actions that need permission checks
    createCourse,
    updateCourse,
    deactivateCourse,

    // Add permission flags
    canManage: isAdmin()
  }
}
