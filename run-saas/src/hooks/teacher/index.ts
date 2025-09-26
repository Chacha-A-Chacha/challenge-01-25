
// hooks/teacher/index.ts
export { useQRScanner } from './useQRScanner'

// Re-export teacher store hooks for convenience
export { 
  useClassStore,
  useClasses,
  useClassActions,
  useClassSessions
} from '@/store/teacher/class-store'

export { 
  useStudentStore,
  useStudents,
  useStudentActions,
  useStudentImport
} from '@/store/teacher/student-store'

export { 
  useAttendanceStore,
  useSessionAttendance,
  useQRScanner as useQRScannerStore,
  useAttendanceActions
} from '@/store/teacher/attendance-store'
