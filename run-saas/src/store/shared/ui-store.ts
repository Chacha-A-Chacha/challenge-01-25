// store/shared/ui-store.ts
import { create } from 'zustand'
import type { Notification, Modal, LoadingState, NotificationType } from '@/types'

interface UIState {
  // Notifications
  notifications: Notification[]
  maxNotifications: number
  
  // Modals
  modals: Modal[]
  
  // Loading states
  globalLoading: LoadingState
  componentLoading: Record<string, LoadingState>
  
  // Layout state
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Theme and preferences
  theme: 'light' | 'dark' | 'system'
  compactMode: boolean
  
  // Mobile responsiveness
  isMobile: boolean
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
  clearNotificationsByType: (type: NotificationType) => void
  
  // Modal actions
  openModal: (modal: Omit<Modal, 'id'>) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
  isModalOpen: (component: string) => boolean
  
  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void
  setComponentLoading: (componentId: string, loading: boolean, message?: string) => void
  clearComponentLoading: (componentId: string) => void
  clearAllLoading: () => void
  
  // Layout actions
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  toggleSidebarCollapse: () => void
  
  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setCompactMode: (compact: boolean) => void
  
  // Responsive actions
  setScreenSize: (size: 'sm' | 'md' | 'lg' | 'xl' | '2xl') => void
  setIsMobile: (mobile: boolean) => void
  
  // Utility actions
  showSuccess: (title: string, message: string) => void
  showError: (title: string, message: string) => void
  showWarning: (title: string, message: string) => void
  showInfo: (title: string, message: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  notifications: [],
  maxNotifications: 5,
  
  modals: [],
  
  globalLoading: { isLoading: false },
  componentLoading: {},
  
  sidebarOpen: true,
  sidebarCollapsed: false,
  
  theme: 'system',
  compactMode: false,
  
  isMobile: false,
  screenSize: 'lg',
  
  // Notification management
  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(7)
    const newNotification: Notification = { ...notification, id }
    
    set((state) => {
      const updatedNotifications = [newNotification, ...state.notifications]
      
      // Limit number of notifications
      if (updatedNotifications.length > state.maxNotifications) {
        updatedNotifications.splice(state.maxNotifications)
      }
      
      return { notifications: updatedNotifications }
    })
    
    // Auto-remove after duration (default 5 seconds)
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, notification.duration || 5000)
    }
    
    return id
  },
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  clearNotifications: () => set({ notifications: [] }),
  
  clearNotificationsByType: (type) => set((state) => ({
    notifications: state.notifications.filter(n => n.type !== type)
  })),
  
  // Modal management
  openModal: (modal) => {
    const id = Math.random().toString(36).substring(7)
    const newModal: Modal = { ...modal, id }
    
    set((state) => ({
      modals: [...state.modals, newModal]
    }))
    
    return id
  },
  
  closeModal: (id) => set((state) => ({
    modals: state.modals.filter(m => m.id !== id)
  })),
  
  closeAllModals: () => set({ modals: [] }),
  
  isModalOpen: (component) => {
    return get().modals.some(m => m.component === component)
  },
  
  // Loading state management
  setGlobalLoading: (loading, message) => set({
    globalLoading: { isLoading: loading, message }
  }),
  
  setComponentLoading: (componentId, loading, message) => set((state) => ({
    componentLoading: {
      ...state.componentLoading,
      [componentId]: { isLoading: loading, message }
    }
  })),
  
  clearComponentLoading: (componentId) => set((state) => {
    const newComponentLoading = { ...state.componentLoading }
    delete newComponentLoading[componentId]
    return { componentLoading: newComponentLoading }
  }),
  
  clearAllLoading: () => set({
    globalLoading: { isLoading: false },
    componentLoading: {}
  }),
  
  // Layout management
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Theme management
  setTheme: (theme) => set({ theme }),
  setCompactMode: (compact) => set({ compactMode: compact }),
  
  // Responsive management
  setScreenSize: (size) => set({ screenSize: size }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  
  // Convenience notification methods
  showSuccess: (title, message) => {
    get().addNotification({
      type: 'success',
      title,
      message,
      duration: 4000
    })
  },
  
  showError: (title, message) => {
    get().addNotification({
      type: 'error',
      title,
      message,
      duration: 6000
    })
  },
  
  showWarning: (title, message) => {
    get().addNotification({
      type: 'warning',
      title,
      message,
      duration: 5000
    })
  },
  
  showInfo: (title, message) => {
    get().addNotification({
      type: 'info',
      title,
      message,
      duration: 4000
    })
  }
}))

// Selectors for performance optimization
export const useNotifications = () => useUIStore(state => state.notifications)
export const useModals = () => useUIStore(state => state.modals)
export const useGlobalLoading = () => useUIStore(state => state.globalLoading)
export const useComponentLoading = (componentId: string) => 
  useUIStore(state => state.componentLoading[componentId] || { isLoading: false })
export const useSidebar = () => useUIStore(state => ({
  isOpen: state.sidebarOpen,
  isCollapsed: state.sidebarCollapsed,
  setOpen: state.setSidebarOpen,
  setCollapsed: state.setSidebarCollapsed,
  toggle: state.toggleSidebar,
  toggleCollapse: state.toggleSidebarCollapse
}))
export const useTheme = () => useUIStore(state => ({
  theme: state.theme,
  compactMode: state.compactMode,
  setTheme: state.setTheme,
  setCompactMode: state.setCompactMode
}))
export const useResponsive = () => useUIStore(state => ({
  isMobile: state.isMobile,
  screenSize: state.screenSize,
  setIsMobile: state.setIsMobile,
  setScreenSize: state.setScreenSize
}))
