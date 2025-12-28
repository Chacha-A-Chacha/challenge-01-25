// store/ui-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BaseStoreState, NotificationType } from "@/types";

// ============================================================================
// TYPES - Only what's needed for UI state
// ============================================================================

interface UINotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface UIModal {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  size?: "sm" | "md" | "lg" | "xl";
  persistent?: boolean;
}

interface UITheme {
  mode: "light" | "dark" | "system";
  compactMode: boolean;
}

interface UILayout {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface UIState extends BaseStoreState {
  // Core UI state
  notifications: UINotification[];
  modals: UIModal[];
  theme: UITheme;
  layout: UILayout;

  // Simple loading state
  isGlobalLoading: boolean;
  globalLoadingMessage?: string;

  // Notification actions
  addNotification: (notification: Omit<UINotification, "id">) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Modal actions
  openModal: (modal: Omit<UIModal, "id">) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Layout actions
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Theme actions
  setThemeMode: (mode: "light" | "dark" | "system") => void;
  setCompactMode: (compact: boolean) => void;

  // Convenience methods
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;

  // Utils
  reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_THEME: UITheme = {
  mode: "system",
  compactMode: false,
};

const DEFAULT_LAYOUT: UILayout = {
  sidebarOpen: true,
  sidebarCollapsed: false,
};

const MAX_NOTIFICATIONS = 5;
const DEFAULT_NOTIFICATION_DURATION = 5000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateUIId(): string {
  return `ui_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function shouldAutoRemove(notification: UINotification): boolean {
  return !notification.persistent && notification.duration !== 0;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core UI state
      notifications: [],
      modals: [],
      theme: DEFAULT_THEME,
      layout: DEFAULT_LAYOUT,

      // Loading state
      isGlobalLoading: false,
      globalLoadingMessage: undefined,

      // ============================================================================
      // NOTIFICATION ACTIONS
      // ============================================================================

      addNotification: (notification) => {
        const id = generateUIId();
        const newNotification: UINotification = {
          ...notification,
          id,
          duration: notification.duration ?? DEFAULT_NOTIFICATION_DURATION,
        };

        set((state) => {
          const updatedNotifications = [
            newNotification,
            ...state.notifications,
          ];

          // Limit number of notifications
          if (updatedNotifications.length > MAX_NOTIFICATIONS) {
            updatedNotifications.splice(MAX_NOTIFICATIONS);
          }

          return {
            notifications: updatedNotifications,
            lastUpdated: new Date(),
          };
        });

        // Auto-remove after duration
        if (shouldAutoRemove(newNotification)) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }

        return id;
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          lastUpdated: new Date(),
        }));
      },

      clearNotifications: () => {
        set({
          notifications: [],
          lastUpdated: new Date(),
        });
      },

      // ============================================================================
      // MODAL ACTIONS
      // ============================================================================

      openModal: (modal) => {
        const id = generateUIId();
        const newModal: UIModal = {
          ...modal,
          id,
          size: modal.size ?? "md",
        };

        set((state) => ({
          modals: [...state.modals, newModal],
          lastUpdated: new Date(),
        }));

        return id;
      },

      closeModal: (id) => {
        set((state) => ({
          modals: state.modals.filter((m) => m.id !== id),
          lastUpdated: new Date(),
        }));
      },

      closeAllModals: () => {
        set({
          modals: [],
          lastUpdated: new Date(),
        });
      },

      // ============================================================================
      // LOADING ACTIONS
      // ============================================================================

      setGlobalLoading: (loading, message) => {
        set({
          isGlobalLoading: loading,
          globalLoadingMessage: loading ? message : undefined,
          lastUpdated: new Date(),
        });
      },

      // ============================================================================
      // LAYOUT ACTIONS
      // ============================================================================

      setSidebarOpen: (open) => {
        set((state) => ({
          layout: { ...state.layout, sidebarOpen: open },
          lastUpdated: new Date(),
        }));
      },

      setSidebarCollapsed: (collapsed) => {
        set((state) => ({
          layout: { ...state.layout, sidebarCollapsed: collapsed },
          lastUpdated: new Date(),
        }));
      },

      toggleSidebar: () => {
        set((state) => ({
          layout: { ...state.layout, sidebarOpen: !state.layout.sidebarOpen },
          lastUpdated: new Date(),
        }));
      },

      // ============================================================================
      // THEME ACTIONS
      // ============================================================================

      setThemeMode: (mode) => {
        set((state) => ({
          theme: { ...state.theme, mode },
          lastUpdated: new Date(),
        }));
      },

      setCompactMode: (compact) => {
        set((state) => ({
          theme: { ...state.theme, compactMode: compact },
          lastUpdated: new Date(),
        }));
      },

      // ============================================================================
      // CONVENIENCE METHODS
      // ============================================================================

      showSuccess: (title, message) => {
        get().addNotification({
          type: "success",
          title,
          message,
          duration: 4000,
        });
      },

      showError: (title, message) => {
        get().addNotification({
          type: "error",
          title,
          message,
          duration: 6000,
        });
      },

      showWarning: (title, message) => {
        get().addNotification({
          type: "warning",
          title,
          message,
          duration: 5000,
        });
      },

      showInfo: (title, message) => {
        get().addNotification({
          type: "info",
          title,
          message,
          duration: 4000,
        });
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      reset: () => {
        set({
          notifications: [],
          modals: [],
          theme: DEFAULT_THEME,
          layout: DEFAULT_LAYOUT,
          isGlobalLoading: false,
          globalLoadingMessage: undefined,
          isLoading: false,
          error: null,
          lastUpdated: null,
        });
      },
    }),
    {
      name: "ui-store",
      partialize: (state) => ({
        // Persist user preferences only
        theme: state.theme,
        layout: state.layout,
        // Don't persist notifications, modals, or loading states
      }),
    },
  ),
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for notifications
 */
export function useNotifications() {
  const notifications = useUIStore((state) => state.notifications);
  const addNotification = useUIStore((state) => state.addNotification);
  const removeNotification = useUIStore((state) => state.removeNotification);
  const clearNotifications = useUIStore((state) => state.clearNotifications);
  const showSuccess = useUIStore((state) => state.showSuccess);
  const showError = useUIStore((state) => state.showError);
  const showWarning = useUIStore((state) => state.showWarning);
  const showInfo = useUIStore((state) => state.showInfo);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

/**
 * Hook for modals
 */
export function useModals() {
  const modals = useUIStore((state) => state.modals);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const closeAllModals = useUIStore((state) => state.closeAllModals);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
  };
}

/**
 * Hook for loading state
 */
export function useGlobalLoading() {
  const isGlobalLoading = useUIStore((state) => state.isGlobalLoading);
  const globalLoadingMessage = useUIStore(
    (state) => state.globalLoadingMessage,
  );
  const setGlobalLoading = useUIStore((state) => state.setGlobalLoading);

  return {
    isLoading: isGlobalLoading,
    message: globalLoadingMessage,
    setLoading: setGlobalLoading,
  };
}

/**
 * Hook for layout state
 */
export function useLayout() {
  const layout = useUIStore((state) => state.layout);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return {
    sidebarOpen: layout.sidebarOpen,
    sidebarCollapsed: layout.sidebarCollapsed,
    setSidebarOpen,
    setSidebarCollapsed,
    toggleSidebar,
  };
}

/**
 * Hook for theme state
 */
export function useTheme() {
  const theme = useUIStore((state) => state.theme);
  const setThemeMode = useUIStore((state) => state.setThemeMode);
  const setCompactMode = useUIStore((state) => state.setCompactMode);

  return {
    mode: theme.mode,
    compactMode: theme.compactMode,
    setThemeMode,
    setCompactMode,
  };
}
