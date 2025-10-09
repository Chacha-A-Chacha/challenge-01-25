// hooks/index.ts - Main barrel export for all hooks
export {
  useCourses,
  useSystemStats,
  useTeacherManagement
} from './admin'

// Auth hooks (Permission checking and user context)
export {
  usePermissions,
  useAuth,
  Permission  // Re-export for convenience
} from './auth'

// Teacher hooks (Hardware interaction only)
export {
  useQRScanner
} from './teacher'

// UI hooks (Form management)
export {
  useForm
} from './ui'

// ============================================================================
// STORE CONVENIENCE RE-EXPORTS
// ============================================================================

// Admin stores
export {
  useCourseStore
} from '@/store/admin/course-store'

// Teacher stores
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
  useAttendanceActions
} from '@/store/teacher/attendance-store'

// Student stores
export {
  useQRStore,
  useQRCode,
  useQRSettings
} from '@/store/student/qr-store'

export {
  useScheduleStore,
  useStudentSchedule,
  useCurrentSession,
  useAttendanceHistory
} from '@/store/student/schedule-store'

export {
  useReassignmentStore,
  useReassignmentRequests,
  useReassignmentActions,
  useReassignmentOptions
} from '@/store/student/reassignment-store'

// Shared stores
export {
  useNotifications,
  useModals,
  useGlobalLoading,
  useLayout,
  useTheme
} from '@/store/shared/ui-store'

export {
  useOfflineData,
  useOfflineSync,
  useOfflineConfig
} from '@/store/shared/offline-store'

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
✅ RECOMMENDED USAGE PATTERNS:

// 1. TYPE-SAFE PERMISSION CHECKING
import { usePermissions, Permission } from '@/hooks'

function CreateCourseButton() {
  const { can } = usePermissions()

  if (!can(Permission.CREATE_COURSE)) {
    return null
  }

  return <Button onClick={handleCreate}>Create Course</Button>
}

// 2. MULTIPLE PERMISSION CHECK
function TeacherToolbar() {
  const { canAny } = usePermissions()

  const showToolbar = canAny([
    Permission.IMPORT_STUDENTS,
    Permission.CREATE_SESSION,
    Permission.SCAN_ATTENDANCE
  ])

  if (!showToolbar) return null

  return <Toolbar />
}

// 3. ROLE-BASED RENDERING
function Dashboard() {
  const { isAdmin, isTeacher, isStudent } = usePermissions()

  if (isAdmin) return <AdminDashboard />
  if (isTeacher) return <TeacherDashboard />
  if (isStudent) return <StudentDashboard />

  return <Login />
}

// 4. PERMISSION GROUPS
function ManagementPanel() {
  const { canManageUsers } = usePermissions()

  if (!canManageUsers) {
    return <AccessDenied />
  }

  return <UserManagement />
}

// 5. PROTECTING OPERATIONS
function deleteUser(userId: string) {
  const { requireRole } = usePermissions()

  // Throws if not admin
  requireRole('admin')

  // Proceed with delete
  return api.deleteUser(userId)
}
*/
