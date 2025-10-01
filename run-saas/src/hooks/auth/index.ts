
// hooks/auth/index.ts
export { usePermissions } from './usePermissions'

// Re-export auth store hooks for convenience
export {
  useAuth,
  useStudentLogin,
  useAdminTeacherLogin
} from '@/store/auth/auth-store'
