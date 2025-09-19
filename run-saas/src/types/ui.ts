// types/ui.ts
import type { NotificationType } from './enums'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
  persistent?: boolean
}

export interface NotificationAction {
  label: string
  action: () => void
  variant?: 'default' | 'destructive'
}

export interface Modal {
  id: string
  component: string
  props: Record<string, unknown>
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  persistent?: boolean
}

export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
}

export interface ToastConfig {
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  maxToasts: number
  defaultDuration: number
  pauseOnHover: boolean
  pauseOnFocusLoss: boolean
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  primaryColor: string
  accentColor: string
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  fontFamily: string
}

export interface BreakpointValues {
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

export interface ResponsiveState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  currentBreakpoint: keyof BreakpointValues
  screenWidth: number
  screenHeight: number
}

export interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
  isPinned: boolean
  width: number
  collapsedWidth: number
}
