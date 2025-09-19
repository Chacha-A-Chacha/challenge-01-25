// hooks/teacher/useClasses.ts
import { useApiQuery, useApiMutation } from '@/hooks/api'
import { useNotifications, useModal } from '@/hooks/ui'
import { usePermissions, useAuth } from '@/hooks/auth'
import { API_ROUTES, PERMISSIONS } from '@/lib/constants'
import { createClassSchema } from '@/lib/validations'
import type { Class, CreateClass } from '@/lib/validations'

/**
 * Class management for teachers
 */
export function useClasses() {
  const { user } = useAuth()
  const { showSuccess, showError } = useNotifications()
  const { openConfirmDialog } = useModal()
  const { canCreateClass } = usePermissions()

  // Fetch classes for current teacher's course
  const {
    data: classes = [],
    isLoading,
    error,
    refetch
  } = useApiQuery<Class[]>(
    ['classes', user?.courseId],
    API_ROUTES.CLASSES,
    {
      enabled: !!user?.courseId,
      staleTime: 2 * 60 * 1000
    }
  )

  // Create class mutation (head teacher only)
  const createClassMutation = useApiMutation(
    async (data: CreateClass) => {
      const response = await fetch(API_ROUTES.CLASSES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Class Created', 'New class has been created successfully')
        refetch()
      },
      onError: (error) => showError('Failed to Create Class', error)
    }
  )

  // Update class mutation
  const updateClassMutation = useApiMutation(
    async ({ id, updates }: { id: string; updates: Partial<CreateClass> }) => {
      const response = await fetch(API_ROUTES.CLASS_BY_ID(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Class Updated', 'Class information updated successfully')
        refetch()
      },
      onError: (error) => showError('Failed to Update Class', error)
    }
  )

  // Delete class mutation
  const deleteClassMutation = useApiMutation(
    async (classId: string) => {
      const response = await fetch(API_ROUTES.CLASS_BY_ID(classId), {
        method: 'DELETE'
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Class Deleted', 'Class has been permanently removed')
        refetch()
      },
      onError: (error) => showError('Failed to Delete Class', error)
    }
  )

  // Action handlers
  const createClass = async (data: CreateClass) => {
    if (!canCreateClass) {
      showError('Permission Denied', 'Only head teachers can create classes')
      return false
    }

    try {
      await createClassMutation.mutate(data)
      return true
    } catch (error) {
      return false
    }
  }

  const updateClass = async (id: string, updates: Partial<CreateClass>) => {
    try {
      await updateClassMutation.mutate({ id, updates })
      return true
    } catch (error) {
      return false
    }
  }

  const deleteClass = async (classId: string, className: string) => {
    return new Promise<boolean>((resolve) => {
      openConfirmDialog(
        'Delete Class',
        `Are you sure you want to delete "${className}"? This will remove all sessions and student assignments.`,
        async () => {
          try {
            await deleteClassMutation.mutate(classId)
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        },
        () => resolve(false),
        'Delete Class',
        'Cancel'
      )
    })
  }

  return {
    // Data
    classes,
    
    // State
    isLoading,
    error,
    
    // Mutations state
    isCreating: createClassMutation.isLoading,
    isUpdating: updateClassMutation.isLoading,
    isDeleting: deleteClassMutation.isLoading,
    
    // Actions
    createClass,
    updateClass,
    deleteClass,
    refetch
  }
}

// hooks/teacher/useSessions.ts
import { useState, useCallback } from 'react'
import { useApiQuery, useApiMutation } from '@/hooks/api'
import { useNotifications } from '@/hooks/ui'
import { createSessionSchema, updateSessionSchema } from '@/lib/validations'
import { validateSessionConflicts } from '@/lib/validations'
import type { Session, CreateSession, UpdateSession } from '@/lib/validations'

/**
 * Session management with conflict detection
 */
export function useSessions(classId?: string) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const { showSuccess, showError } = useNotifications()

  // Fetch sessions for a class
  const {
    data: sessions = [],
    isLoading,
    error,
    refetch
  } = useApiQuery<Session[]>(
    ['sessions', classId],
    classId ? API_ROUTES.SESSIONS_BY_CLASS(classId) : '',
    {
      enabled: !!classId,
      staleTime: 2 * 60 * 1000
    }
  )

  // Create session mutation
  const createSessionMutation = useApiMutation(
    async (data: CreateSession & { classId: string }) => {
      // Validate no conflicts before creating
      const conflictError = await validateSessionConflicts(
        data.classId,
        data.day,
        data.startTime,
        data.endTime
      )
      
      if (conflictError) {
        throw new Error(conflictError)
      }

      const response = await fetch(API_ROUTES.SESSIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Session Created', 'New session has been created successfully')
        refetch()
      },
      onError: (error) => showError('Failed to Create Session', error)
    }
  )

  // Update session mutation
  const updateSessionMutation = useApiMutation(
    async ({ id, updates }: { id: string; updates: UpdateSession }) => {
      const response = await fetch(API_ROUTES.SESSION_BY_ID(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Session Updated', 'Session has been updated successfully')
        refetch()
      },
      onError: (error) => showError('Failed to Update Session', error)
    }
  )

  // Delete session mutation
  const deleteSessionMutation = useApiMutation(
    async (sessionId: string) => {
      const response = await fetch(API_ROUTES.SESSION_BY_ID(sessionId), {
        method: 'DELETE'
      })
      return await response.json()
    },
    {
      onSuccess: () => {
        showSuccess('Session Deleted', 'Session has been removed')
        refetch()
      },
      onError: (error) => showError('Failed to Delete Session', error)
    }
  )

  // Action handlers
  const createSession = async (classId: string, data: CreateSession) => {
    try {
      await createSessionMutation.mutate({ ...data, classId })
      return true
    } catch (error) {
      return false
    }
  }

  const updateSession = async (id: string, updates: UpdateSession) => {
    try {
      await updateSessionMutation.mutate({ id, updates })
      return true
    } catch (error) {
      return false
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await deleteSessionMutation.mutate(sessionId)
      return true
    } catch (error) {
      return false
    }
  }

  // Get sessions by day
  const saturdaySessions = sessions.filter(s => s.day === 'SATURDAY')
  const sundaySessions = sessions.filter(s => s.day === 'SUNDAY')

  // Check for scheduling conflicts
  const checkTimeConflict = useCallback(async (
    day: 'SATURDAY' | 'SUNDAY',
    startTime: string,
    endTime: string,
    excludeSessionId?: string
  ) => {
    if (!classId) return false
    
    const conflictError = await validateSessionConflicts(
      classId,
      day,
      startTime,
      endTime,
      excludeSessionId
    )
    
    return !!conflictError
  }, [classId])

  return {
    // Data
    sessions,
    saturdaySessions,
    sundaySessions,
    selectedSession,
    
    // State
    isLoading,
    error,
    
    // Mutations state
    isCreating: createSessionMutation.isLoading,
    isUpdating: updateSessionMutation.isLoading,
    isDeleting: deleteSessionMutation.isLoading,
    
    // Actions
    createSession,
    updateSession,
    deleteSession,
    setSelectedSession,
    checkTimeConflict,
    refetch
  }
}
