// store/index.ts

// ============================================================================
// AUTHENTICATION STORES
// ============================================================================
export { 
  useAuthStore,
  useAuth,
  useLogin
} from './auth/auth-store'

// ============================================================================
// ADMIN STORES
// ============================================================================
export {
  useCourseStore
} from './admin/course-store'

// ============================================================================
// TEACHER STORES
// ============================================================================
export {
  useAttendanceStore,
  useSessionAttendance,
  useQRScanner,
  useAttendanceActions
} from './teacher/attendance-store'

export {
  useClassStore,
  useClasses,
  useClassActions,
  useClassSessions,
  useClassFilters
} from './teacher/class-store'

export {
  useStudentStore,
  useStudents,
  useStudentActions,
  useStudentImport,
  useStudentFilters
} from './teacher/student-store'

// ============================================================================
// STUDENT STORES
// ============================================================================
export {
  useQRStore,
  useQRCode,
  useQRSettings
} from './student/qr-store'

export {
  useScheduleStore,
  useStudentSchedule,
  useCurrentSession,
  useAttendanceHistory
} from './student/schedule-store'

export {
  useReassignmentStore,
  useReassignmentRequests,
  useReassignmentActions,
  useReassignmentOptions
} from './student/reassignment-store'

// ============================================================================
// SHARED STORES
// ============================================================================
export {
  useUIStore,
  useNotifications,
  useModals,
  useGlobalLoading,
  useLayout,
  useTheme
} from './shared/ui-store'

export {
  useOfflineStore,
  useOfflineData,
  useOfflineSync,
  useOfflineConfig
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
  const { syncSession } = useAuthStore()
  const { updateNetworkStatus } = useOfflineStore()
  const { setThemeMode } = useUIStore()

  useEffect(() => {
    // Initialize network status detection
    const updateOnlineStatus = () => {
      updateNetworkStatus(navigator.onLine)
    }

    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Initialize theme from system preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleThemeChange = (e: MediaQueryListEvent) => {
        setThemeMode('system')
      }

      mediaQuery.addEventListener('change', handleThemeChange)

      return () => {
        window.removeEventListener('online', updateOnlineStatus)
        window.removeEventListener('offline', updateOnlineStatus)
        mediaQuery.removeEventListener('change', handleThemeChange)
      }
    }
  }, [syncSession, updateNetworkStatus, setThemeMode])
}

/**
 * Hook for role-based store access
 * Returns only the stores relevant to the current user's role
 */
export const useRoleBasedStores = () => {
  const { user } = useAuthStore()

  return {
    // Universal stores
    auth: useAuthStore,
    ui: useUIStore,
    offline: useOfflineStore,

    // Admin stores
    ...(user?.role === 'admin' && {
      courses: useCourseStore
    }),

    // Teacher stores
    ...(user?.role === 'teacher' && {
      classes: useClassStore,
      students: useStudentStore,
      attendance: useAttendanceStore
    }),

    // Student stores
    ...(user?.role === 'student' && {
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-store')
      localStorage.removeItem('qr-store')
      localStorage.removeItem('offline-store')
      localStorage.removeItem('reassignment-store')
      localStorage.removeItem('course-store')
      localStorage.removeItem('class-store')
      localStorage.removeItem('student-store')
      localStorage.removeItem('attendance-store')
      localStorage.removeItem('schedule-store')
      localStorage.removeItem('ui-store')
    }

    // Reset store states
    useAuthStore.getState().reset()
    useUIStore.getState().reset()
    useOfflineStore.getState().reset()
    useCourseStore.getState().reset()
    useClassStore.getState().reset()
    useStudentStore.getState().reset()
    useAttendanceStore.getState().reset()
    useQRStore.getState().reset()
    useScheduleStore.getState().reset()
    useReassignmentStore.getState().reset()
  }
}

/**
 * Development helper to log all store states
 * Only available in development mode
 */
export const useLogStoreStates = () => {
  if (process.env.NODE_ENV === 'development') {
    return () => {
      console.group('📊 Store States')
      console.log('🔐 Auth:', useAuthStore.getState())
      console.log('🎨 UI:', useUIStore.getState())
      console.log('📱 Offline:', useOfflineStore.getState())
      console.log('🎓 Courses:', useCourseStore.getState())
      console.log('📚 Classes:', useClassStore.getState())
      console.log('👥 Students:', useStudentStore.getState())
      console.log('✅ Attendance:', useAttendanceStore.getState())
      console.log('📱 QR:', useQRStore.getState())
      console.log('📅 Schedule:', useScheduleStore.getState())
      console.log('🔄 Reassignment:', useReassignmentStore.getState())
      console.groupEnd()
    }
  }
  return () => {}
}

// ============================================================================
// CONVENIENCE HOOK COLLECTIONS
// ============================================================================

/**
 * Collection of all admin-related hooks
 */
export const useAdminHooks = () => ({
  courses: useCourseStore,
  ui: useUIStore,
  auth: useAuthStore
})

/**
 * Collection of all teacher-related hooks
 */
export const useTeacherHooks = () => ({
  // Core teacher functionality
  classes: useClasses,
  classActions: useClassActions,
  classSessions: useClassSessions,
  classFilters: useClassFilters,

  students: useStudents,
  studentActions: useStudentActions,
  studentImport: useStudentImport,
  studentFilters: useStudentFilters,

  attendance: useSessionAttendance,
  qrScanner: useQRScanner,
  attendanceActions: useAttendanceActions,

  // Shared functionality
  ui: useUIStore,
  auth: useAuthStore,
  offline: useOfflineStore
})

/**
 * Collection of all student-related hooks
 */
export const useStudentHooks = () => ({
  // Core student functionality
  qr: useQRCode,
  qrSettings: useQRSettings,

  schedule: useStudentSchedule,
  currentSession: useCurrentSession,
  attendanceHistory: useAttendanceHistory,

  reassignmentRequests: useReassignmentRequests,
  reassignmentActions: useReassignmentActions,
  reassignmentOptions: useReassignmentOptions,

  // Shared functionality
  ui: useUIStore,
  auth: useAuthStore,
  offline: useOfflineStore
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Re-export commonly used types for convenience
export type {
  // Core entities
  AuthUser,
  Course,
  Class,
  Session,
  Student,
  Attendance,
  ReassignmentRequest,

  // Business types
  QRCodeData,
  StudentSchedule,
  AttendanceRecord,

  // UI types
  Notification,
  Modal,

  // State types
  BaseStoreState
} from '@/types'