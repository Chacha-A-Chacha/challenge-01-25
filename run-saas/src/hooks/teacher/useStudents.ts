// hooks/teacher/useStudents.ts
import { useState } from 'react'
import { useApiQuery, useApiMutation } from '@/hooks/api'
import { useNotifications, useModal } from '@/hooks/ui'
import { useAuth } from '@/hooks/auth'
import { API_ROUTES } from '@/lib/constants'
import type { Student, UpdateStudent } from '@/lib/validations'

/**
 * Student management for teachers
 */
export function useStudents(classId?: string) {
  const { user } = useAuth()
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const { showSuccess, showError } = useNotifications()
  const { openConfirmDialog } = useModal()

  // Use current teacher's class if no specific classId provided
  const targetClassId = classId || user?.classId

  // Fetch students for class
  const {
    data: students = [],
    isLoading,
    error,
    refetch
  } = useApiQuery<Student[]>(
    ['students', targetClassId],
    targetClassId ? `${API_ROUTES.STUDENTS}?classId=${targetClassId}` : '',
    {
      enabled: !!targetClassId,
      staleTime: 2 * 60 * 1000
    }
  )

  // Update student mutation
  const updateStudentMutation = useApiMutation(
    async ({ id, updates }: { id: string; updates: UpdateStudent }) => {
      const response = await fetch(API_ROUTES.STUDENT_BY_ID(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Student Updated', 'Student information updated successfully')
        refetch()
      },
      onError: (error) => showError('Failed to Update Student', error)
    }
  )

  // Delete student mutation
  const deleteStudentMutation = useApiMutation(
    async (studentId: string) => {
      const response = await fetch(API_ROUTES.STUDENT_BY_ID(studentId), {
        method: 'DELETE'
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Student Removed', 'Student has been removed from the class')
        refetch()
      },
      onError: (error) => showError('Failed to Remove Student', error)
    }
  )

  // Auto-assign students to sessions
  const autoAssignMutation = useApiMutation(
    async (classId: string) => {
      const response = await fetch(API_ROUTES.STUDENTS_AUTO_ASSIGN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Students Assigned', 'Students have been automatically assigned to sessions')
        refetch()
      },
      onError: (error) => showError('Auto-Assignment Failed', error)
    }
  )

  // Reassign student to different sessions
  const reassignStudentMutation = useApiMutation(
    async ({ 
      studentId, 
      saturdaySessionId, 
      sundaySessionId 
    }: { 
      studentId: string
      saturdaySessionId: string
      sundaySessionId: string 
    }) => {
      const response = await fetch(API_ROUTES.STUDENT_REASSIGN(studentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saturdaySessionId, sundaySessionId })
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Student Reassigned', 'Student has been reassigned to new sessions')
        refetch()
      },
      onError: (error) => showError('Reassignment Failed', error)
    }
  )

  // Action handlers
  const updateStudent = async (id: string, updates: UpdateStudent) => {
    try {
      await updateStudentMutation.mutate({ id, updates })
      return true
    } catch (error) {
      return false
    }
  }

  const deleteStudent = async (studentId: string, studentName: string) => {
    return new Promise<boolean>((resolve) => {
      openConfirmDialog(
        'Remove Student',
        `Are you sure you want to remove ${studentName} from the class? This will delete all their attendance records.`,
        async () => {
          try {
            await deleteStudentMutation.mutate(studentId)
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        },
        () => resolve(false),
        'Remove Student',
        'Cancel'
      )
    })
  }

  const autoAssignStudents = async () => {
    if (!targetClassId) return false

    try {
      await autoAssignMutation.mutate(targetClassId)
      return true
    } catch (error) {
      return false
    }
  }

  const reassignStudent = async (
    studentId: string,
    saturdaySessionId: string,
    sundaySessionId: string
  ) => {
    try {
      await reassignStudentMutation.mutate({ 
        studentId, 
        saturdaySessionId, 
        sundaySessionId 
      })
      return true
    } catch (error) {
      return false
    }
  }

  // Student statistics
  const studentStats = {
    total: students.length,
    assigned: students.filter(s => s.sessions && s.sessions.length >= 2).length,
    unassigned: students.filter(s => !s.sessions || s.sessions.length < 2).length
  }

  return {
    // Data
    students,
    selectedStudent,
    studentStats,
    
    // State
    isLoading,
    error,
    
    // Mutations state
    isUpdating: updateStudentMutation.isLoading,
    isDeleting: deleteStudentMutation.isLoading,
    isAutoAssigning: autoAssignMutation.isLoading,
    isReassigning: reassignStudentMutation.isLoading,
    
    // Actions
    updateStudent,
    deleteStudent,
    autoAssignStudents,
    reassignStudent,
    setSelectedStudent,
    refetch
  }
}
