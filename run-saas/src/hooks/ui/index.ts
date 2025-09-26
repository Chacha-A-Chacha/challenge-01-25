// hooks/ui/index.ts
export { useForm } from './useForm'

// Re-export UI store hooks for convenience
export {
  useNotifications,
  useModals,
  useGlobalLoading,
  useLayout,
  useTheme
} from '@/store/shared/ui-store'
