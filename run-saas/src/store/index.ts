// store/index.ts

// ============================================================================
// AUTHENTICATION STORES
// ============================================================================
export { 
  useAuthStore,
  useAuth
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
// REGISTRATION STORES (Public - for student self-registration)
// ============================================================================
export {
  useRegistrationStore,
  useRegistrationForm,
  useRegistrationData,
  useRegistrationSubmission
} from './registration/registration-store'

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
// STORE UTILITIES
// ============================================================================

import { useEffect } from 'react'
import { useAuthStore } from './auth/auth-store'
import { useOfflineStore } from './shared/offline-store'
import { useUIStore } from './shared/ui-store'
import { useCourseStore } from './admin/course-store'
import { useClassStore } from './teacher/class-store'
import { useStudentStore } from './teacher/student-store'
import { useAttendanceStore } from './teacher/attendance-store'
import { useQRStore } from './student/qr-store'
import { useScheduleStore } from './student/schedule-store'
import { useReassignmentStore } from './student/reassignment-store'
import { useRegistrationStore } from './registration/registration-store'

/**
 * Hook to initialize stores on app startup
 * Should be called in the root component or layout
 */
export const useStoreInitialization = () => {
  const { updateNetworkStatus } = useOfflineStore()

  useEffect(() => {
    // Initialize network status detection
    const updateOnlineStatus = () => {
      updateNetworkStatus(navigator.onLine)
    }

    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [updateNetworkStatus])
}

/**
 * Hook to clear all store data (useful for logout)
 */
export const useClearAllStores = () => {
  return () => {
    // Clear persisted data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-store')
      localStorage.removeItem('course-store')
      localStorage.removeItem('class-store')
      localStorage.removeItem('student-store')
      localStorage.removeItem('attendance-store')
      localStorage.removeItem('qr-store')
      localStorage.removeItem('schedule-store')
      localStorage.removeItem('reassignment-store')
      localStorage.removeItem('registration-store')
      localStorage.removeItem('ui-store')
      localStorage.removeItem('offline-store')
    }

    // Reset store states
    useAuthStore.getState().reset()
    useCourseStore.getState().reset()
    useClassStore.getState().reset()
    useStudentStore.getState().reset()
    useAttendanceStore.getState().reset()
    useQRStore.getState().reset()
    useScheduleStore.getState().reset()
    useReassignmentStore.getState().reset()
    useRegistrationStore.getState().reset()
    useUIStore.getState().reset()
    useOfflineStore.getState().reset()
  }
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
  StudentRegistration,
  Attendance,
  ReassignmentRequest,
  QRCodeData,
  StudentSchedule,
  Notification,
  Modal
} from '@/types'
