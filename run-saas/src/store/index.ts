// store/index.ts

// ============================================================================
// AUTHENTICATION STORES
// ============================================================================
export { 
  useAuthStore 
} from './auth/auth-store'

// ============================================================================
// ADMIN STORES
// ============================================================================
export { 
  useCourseStore,
  useCourses,
  useSelectedCourse,
  useCourseStats,
  useActiveCourses,
  useCourseCreation
} from './admin/course-store'

// ============================================================================
// TEACHER STORES
// ============================================================================
export { 
  useAttendanceStore,
  useCurrentSession,
  useTodayAttendance,
  useAttendanceStats,
  useScanningState
} from './teacher/attendance-store'

export { 
  useClassStore,
  useClasses,
  useSelectedClass,
  useSessionsByClass,
  useClassSessions,
  useClassCreation,
  useSessionCreation
} from './teacher/class-store'

export { 
  useStudentStore,
  useStudents,
  useSelectedStudent,
  useStudentStats,
  useStudentImport,
  useStudentAssignment
} from './teacher/student-store'

// ============================================================================
// STUDENT STORES
// ============================================================================
export { 
  useQRStore,
  useQRCode,
  useQRGeneration,
  useQRSettings
} from './student/qr-store'

export { 
  useScheduleStore,
  useStudentSchedule,
  useCurrentSession as useStudentCurrentSession,
  useAttendanceHistory
} from './student/schedule-store'

export { 
  useReassignmentStore,
  useReassignmentRequests,
  useReassignmentOptions,
  useReassignmentActions
} from './student/reassignment-store'

// ============================================================================
// SHARED STORES
// ============================================================================
export { 
  useUIStore,
  useNotifications,
  useModals,
  useGlobalLoading,
  useComponentLoading,
  useSidebar,
  useTheme,
  useResponsive
} from './shared/ui-store'

export { 
  useOfflineStore,
  useConnectionStatus,
  usePendingData,
  useSyncControls
} from './shared/offline-store'

// ============================================================================
// STORE PROVIDER & HOOKS
// ============================================================================

import { useEffect } from 'react'
import { useAuthStore } from './auth/auth-store'
import { useOfflineStore } from './shared/offline-store'
import { useUIStore } from './shared/ui-store'

/**
 * Hook to initialize stores on app startup
 * Should be called in the root component or layout
 */
export const useStoreInitialization = () => {
  const { checkSession, updateLastActivity } = useAuthStore()
  const { setOnlineStatus } = useOfflineStore()
  const { setScreenSize, setIsMobile } = useUIStore()

  useEffect(() => {
    // Initialize auth session check
    const sessionValid = checkSession()
    if (!sessionValid) {
      useAuthStore.getState().logout()
    }

    // Set up periodic session validation
    const sessionInterval = setInterval(() => {
      const isValid = useAuthStore.getState().checkSession()
      if (!isValid) {
        useAuthStore.getState().logout()
      }
    }, 60000) // Check every minute

    // Set up activity tracking
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    const updateActivity = () => {
      if (useAuthStore.getState().isAuthenticated) {
        updateLastActivity()
      }
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    // Initialize online/offline detection
    setOnlineStatus(navigator.onLine)

    // Initialize responsive breakpoints
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setScreenSize('sm')
        setIsMobile(true)
      } else if (width < 768) {
        setScreenSize('md')
        setIsMobile(true)
      } else if (width < 1024) {
        setScreenSize('lg')
        setIsMobile(false)
      } else if (width < 1280) {
        setScreenSize('xl')
        setIsMobile(false)
      } else {
        setScreenSize('2xl')
        setIsMobile(false)
      }
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)

    // Cleanup
    return () => {
      clearInterval(sessionInterval)
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
      window.removeEventListener('resize', updateScreenSize)
    }
  }, [checkSession, updateLastActivity, setOnlineStatus, setScreenSize, setIsMobile])
}

/**
 * Hook for role-based store access
 * Returns only the stores relevant to the current user's role
 */
export const useRoleBasedStores = () => {
  const { user, isAdmin, isTeacher, isStudent } = useAuthStore()

  return {
    // Universal stores
    auth: useAuthStore,
    ui: useUIStore,
    offline: useOfflineStore,

    // Admin stores
    ...(isAdmin() && {
      courses: useCourseStore
    }),

    // Teacher stores
    ...(isTeacher() && {
      classes: useClassStore,
      students: useStudentStore,
      attendance: useAttendanceStore
    }),

    // Student stores
    ...(isStudent() && {
      qr: useQRStore,
      schedule: useScheduleStore,
      reassignment: useReassignmentStore
    }),

    // User info
    user,
    role: user?.role
  }
}

/**
 * Hook to clear all store data (useful for logout)
 */
export const useClearAllStores = () => {
  return () => {
    // Clear persisted data
    localStorage.removeItem('auth-storage')
    localStorage.removeItem('qr-storage')
    localStorage.removeItem('offline-storage')
    localStorage.removeItem('reassignment-storage')

    // Reset store states
    useAuthStore.getState().logout()
    useUIStore.getState().clearNotifications()
    useUIStore.getState().closeAllModals()
    useOfflineStore.getState().clearPendingData()
    useOfflineStore.getState().clearFailedSyncs()

    // Reset other stores to initial state
    useCourseStore.setState({
      courses: [],
      selectedCourse: null,
      isLoading: false,
      error: null
    })

    useClassStore.setState({
      classes: [],
      sessions: [],
      selectedClass: null,
      selectedSession: null,
      isLoading: false,
      error: null
    })

    useStudentStore.setState({
      students: [],
      selectedStudent: null,
      isLoading: false,
      error: null,
      importResult: null
    })

    useAttendanceStore.getState().resetState()
    useQRStore.getState().clearQRCode()
    
    useScheduleStore.setState({
      schedule: null,
      saturdaySession: null,
      sundaySession: null,
      attendanceHistory: [],
      isLoading: false,
      error: null
    })
  }
}

/**
 * Development helper to log all store states
 * Only available in development mode
 */
export const useLogStoreStates = () => {
  if (process.env.NODE_ENV === 'development') {
    return () => {
      console.group('Store States')
      console.log('Auth:', useAuthStore.getState())
      console.log('UI:', useUIStore.getState())
      console.log('Offline:', useOfflineStore.getState())
      console.log('Courses:', useCourseStore.getState())
      console.log('Classes:', useClassStore.getState())
      console.log('Students:', useStudentStore.getState())
      console.log('Attendance:', useAttendanceStore.getState())
      console.log('QR:', useQRStore.getState())
      console.log('Schedule:', useScheduleStore.getState())
      console.log('Reassignment:', useReassignmentStore.getState())
      console.groupEnd()
    }
  }
  return () => {}
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Re-export commonly used types
export type {
  AuthUser,
  Course,
  Class,
  Session,
  Student,
  Attendance,
  ReassignmentRequest,
  QRCodeData,
  StudentSchedule,
  Notification,
  Modal
} from '@/types'