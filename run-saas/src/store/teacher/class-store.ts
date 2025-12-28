// store/teacher/class-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BaseStoreState,
  Class,
  Session,
  Student,
  WeekDay,
  ApiResponse,
} from "@/types";
import { API_ROUTES } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/utils";

// ============================================================================
// TYPES - Only what's needed for class state
// ============================================================================

interface ClassWithDetails extends Class {
  sessions: Session[];
  students: Student[];
  _count: {
    sessions: number;
    students: number;
  };
}

interface SessionFormData {
  day: WeekDay;
  startTime: string;
  endTime: string;
  capacity: number;
}

interface ClassFilters {
  search: string;
  sortBy: "name" | "capacity" | "createdAt";
  sortOrder: "asc" | "desc";
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface ClassState extends BaseStoreState {
  // Core data
  classes: ClassWithDetails[];
  selectedClass: ClassWithDetails | null;

  // UI state
  filters: ClassFilters;

  // Loading states
  isCreating: boolean;
  isUpdating: boolean;

  // Actions
  loadClasses: () => Promise<void>;
  createClass: (
    name: string,
    capacity: number,
  ) => Promise<ClassWithDetails | null>;
  updateClass: (id: string, updates: Partial<Class>) => Promise<boolean>;
  deleteClass: (id: string) => Promise<boolean>;
  selectClass: (classItem: ClassWithDetails | null) => void;

  // Session actions
  loadSessions: (classId: string) => Promise<void>;
  createSession: (
    classId: string,
    sessionData: SessionFormData,
  ) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<boolean>;

  // Computed
  getFilteredClasses: () => ClassWithDetails[];
  getClassById: (id: string) => ClassWithDetails | undefined;
  getSessionsByClass: (classId: string) => Session[];
  getSaturdaySessions: (classId: string) => Session[];
  getSundaySessions: (classId: string) => Session[];

  // Utils
  setFilters: (filters: Partial<ClassFilters>) => void;
  clearErrors: () => void;
  reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_FILTERS: ClassFilters = {
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function hasTimeConflict(
  existingSessions: Session[],
  day: WeekDay,
  startTime: string,
  endTime: string,
  excludeId?: string,
): boolean {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  return existingSessions.some((session) => {
    if (excludeId && session.id === excludeId) return false;
    if (session.day !== day) return false;

    const sessionStart = parseTimeToMinutes(session.startTime);
    const sessionEnd = parseTimeToMinutes(session.endTime);

    return (
      (startMinutes >= sessionStart && startMinutes < sessionEnd) ||
      (endMinutes > sessionStart && endMinutes <= sessionEnd) ||
      (startMinutes <= sessionStart && endMinutes >= sessionEnd)
    );
  });
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useClassStore = create<ClassState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core data
      classes: [],
      selectedClass: null,

      // UI state
      filters: DEFAULT_FILTERS,

      // Loading states
      isCreating: false,
      isUpdating: false,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      loadClasses: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetchWithTimeout(API_ROUTES.CLASSES);

          if (!response.ok) {
            throw new Error(`Failed to load classes: ${response.status}`);
          }

          const result: ApiResponse<ClassWithDetails[]> = await response.json();

          if (result.success && result.data) {
            set({
              classes: result.data,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } else {
            throw new Error(result.error || "Failed to load classes");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load classes";
          set({
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      createClass: async (name, capacity) => {
        set({ isCreating: true, error: null });

        try {
          const response = await fetchWithTimeout(API_ROUTES.CLASSES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, capacity }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create class: ${response.status}`);
          }

          const result: ApiResponse<ClassWithDetails> = await response.json();

          if (result.success && result.data) {
            const newClass = result.data;

            set((state) => ({
              classes: [newClass, ...state.classes],
              selectedClass: newClass,
              isCreating: false,
              lastUpdated: new Date(),
            }));

            return newClass;
          } else {
            throw new Error(result.error || "Failed to create class");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to create class";
          set({
            error: errorMessage,
            isCreating: false,
          });
          return null;
        }
      },

      updateClass: async (id, updates) => {
        set({ isUpdating: true, error: null });

        try {
          const response = await fetchWithTimeout(
            `${API_ROUTES.CLASSES}/${id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to update class: ${response.status}`);
          }

          const result: ApiResponse<ClassWithDetails> = await response.json();

          if (result.success && result.data) {
            set((state) => ({
              classes: state.classes.map((cls) =>
                cls.id === id ? result.data! : cls,
              ),
              selectedClass:
                state.selectedClass?.id === id
                  ? result.data
                  : state.selectedClass,
              isUpdating: false,
              lastUpdated: new Date(),
            }));

            return true;
          } else {
            throw new Error(result.error || "Failed to update class");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to update class";
          set({
            error: errorMessage,
            isUpdating: false,
          });
          return false;
        }
      },

      deleteClass: async (id) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetchWithTimeout(
            `${API_ROUTES.CLASSES}/${id}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete class: ${response.status}`);
          }

          const result: ApiResponse<void> = await response.json();

          if (result.success) {
            set((state) => ({
              classes: state.classes.filter((cls) => cls.id !== id),
              selectedClass:
                state.selectedClass?.id === id ? null : state.selectedClass,
              isLoading: false,
              lastUpdated: new Date(),
            }));

            return true;
          } else {
            throw new Error(result.error || "Failed to delete class");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete class";
          set({
            error: errorMessage,
            isLoading: false,
          });
          return false;
        }
      },

      selectClass: (classItem) => {
        set({ selectedClass: classItem });
      },

      // ============================================================================
      // SESSION ACTIONS
      // ============================================================================

      loadSessions: async (classId) => {
        const classToUpdate = get().classes.find((cls) => cls.id === classId);
        if (!classToUpdate) return;

        set({ isLoading: true, error: null });

        try {
          const response = await fetchWithTimeout(
            `${API_ROUTES.SESSIONS}?classId=${classId}`,
          );

          if (!response.ok) {
            throw new Error(`Failed to load sessions: ${response.status}`);
          }

          const result: ApiResponse<Session[]> = await response.json();

          if (result.success && result.data) {
            set((state) => ({
              classes: state.classes.map((cls) =>
                cls.id === classId ? { ...cls, sessions: result.data! } : cls,
              ),
              selectedClass:
                state.selectedClass?.id === classId
                  ? { ...state.selectedClass, sessions: result.data! }
                  : state.selectedClass,
              isLoading: false,
              lastUpdated: new Date(),
            }));
          } else {
            throw new Error(result.error || "Failed to load sessions");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load sessions";
          set({
            error: errorMessage,
            isLoading: false,
          });
        }
      },

      createSession: async (classId, sessionData) => {
        const classItem = get().classes.find((cls) => cls.id === classId);
        if (!classItem) {
          set({ error: "Class not found" });
          return false;
        }

        // Check for time conflicts
        if (
          hasTimeConflict(
            classItem.sessions,
            sessionData.day,
            sessionData.startTime,
            sessionData.endTime,
          )
        ) {
          set({ error: "Session time conflicts with existing session" });
          return false;
        }

        set({ isCreating: true, error: null });

        try {
          const response = await fetchWithTimeout(API_ROUTES.SESSIONS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...sessionData, classId }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create session: ${response.status}`);
          }

          const result: ApiResponse<Session> = await response.json();

          if (result.success && result.data) {
            const newSession = result.data;

            set((state) => ({
              classes: state.classes.map((cls) =>
                cls.id === classId
                  ? { ...cls, sessions: [...cls.sessions, newSession] }
                  : cls,
              ),
              selectedClass:
                state.selectedClass?.id === classId
                  ? {
                      ...state.selectedClass,
                      sessions: [...state.selectedClass.sessions, newSession],
                    }
                  : state.selectedClass,
              isCreating: false,
              lastUpdated: new Date(),
            }));

            return true;
          } else {
            throw new Error(result.error || "Failed to create session");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to create session";
          set({
            error: errorMessage,
            isCreating: false,
          });
          return false;
        }
      },

      deleteSession: async (sessionId) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetchWithTimeout(
            `${API_ROUTES.SESSIONS}/${sessionId}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete session: ${response.status}`);
          }

          const result: ApiResponse<void> = await response.json();

          if (result.success) {
            set((state) => ({
              classes: state.classes.map((cls) => ({
                ...cls,
                sessions: cls.sessions.filter(
                  (session) => session.id !== sessionId,
                ),
              })),
              selectedClass: state.selectedClass
                ? {
                    ...state.selectedClass,
                    sessions: state.selectedClass.sessions.filter(
                      (session) => session.id !== sessionId,
                    ),
                  }
                : state.selectedClass,
              isLoading: false,
              lastUpdated: new Date(),
            }));

            return true;
          } else {
            throw new Error(result.error || "Failed to delete session");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete session";
          set({
            error: errorMessage,
            isLoading: false,
          });
          return false;
        }
      },

      // ============================================================================
      // COMPUTED VALUES
      // ============================================================================

      getFilteredClasses: () => {
        const { classes, filters } = get();
        let filtered = [...classes];

        // Search filter
        if (filters.search.trim()) {
          const query = filters.search.toLowerCase();
          filtered = filtered.filter((cls) =>
            cls.name.toLowerCase().includes(query),
          );
        }

        // Sort
        filtered.sort((a, b) => {
          let comparison = 0;

          switch (filters.sortBy) {
            case "name":
              comparison = a.name.localeCompare(b.name);
              break;
            case "capacity":
              comparison = a.capacity - b.capacity;
              break;
            case "createdAt":
              comparison =
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime();
              break;
          }

          return filters.sortOrder === "asc" ? comparison : -comparison;
        });

        return filtered;
      },

      getClassById: (id) => {
        return get().classes.find((cls) => cls.id === id);
      },

      getSessionsByClass: (classId) => {
        const classItem = get().classes.find((cls) => cls.id === classId);
        return classItem?.sessions || [];
      },

      getSaturdaySessions: (classId) => {
        return get()
          .getSessionsByClass(classId)
          .filter((s) => s.day === "SATURDAY");
      },

      getSundaySessions: (classId) => {
        return get()
          .getSessionsByClass(classId)
          .filter((s) => s.day === "SUNDAY");
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      clearErrors: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          classes: [],
          selectedClass: null,
          filters: DEFAULT_FILTERS,
          isCreating: false,
          isUpdating: false,
          isLoading: false,
          error: null,
          lastUpdated: null,
        });
      },
    }),
    {
      name: "class-store",
      partialize: (state) => ({
        // Only persist user preferences
        selectedClass: state.selectedClass,
        filters: state.filters,
        // Don't persist: classes data, loading states, errors
      }),
    },
  ),
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for class data and operations
 */
export function useClasses() {
  const classes = useClassStore((state) => state.classes);
  const getFilteredClasses = useClassStore((state) => state.getFilteredClasses);
  const selectedClass = useClassStore((state) => state.selectedClass);
  const isLoading = useClassStore((state) => state.isLoading);
  const error = useClassStore((state) => state.error);
  const loadClasses = useClassStore((state) => state.loadClasses);
  const selectClass = useClassStore((state) => state.selectClass);
  const getClassById = useClassStore((state) => state.getClassById);

  return {
    classes,
    filteredClasses: getFilteredClasses(),
    selectedClass,
    isLoading,
    error,
    loadClasses,
    selectClass,
    getClassById,
  };
}

/**
 * Hook for class management actions
 */
export function useClassActions() {
  const isCreating = useClassStore((state) => state.isCreating);
  const isUpdating = useClassStore((state) => state.isUpdating);
  const createClass = useClassStore((state) => state.createClass);
  const updateClass = useClassStore((state) => state.updateClass);
  const deleteClass = useClassStore((state) => state.deleteClass);
  const error = useClassStore((state) => state.error);
  const clearErrors = useClassStore((state) => state.clearErrors);

  return {
    isCreating,
    isUpdating,
    createClass,
    updateClass,
    deleteClass,
    error,
    clearErrors,
  };
}

/**
 * Hook for session management
 */
export function useClassSessions() {
  const getSessionsByClass = useClassStore((state) => state.getSessionsByClass);
  const getSaturdaySessions = useClassStore(
    (state) => state.getSaturdaySessions,
  );
  const getSundaySessions = useClassStore((state) => state.getSundaySessions);
  const loadSessions = useClassStore((state) => state.loadSessions);
  const createSession = useClassStore((state) => state.createSession);
  const deleteSession = useClassStore((state) => state.deleteSession);
  const isCreating = useClassStore((state) => state.isCreating);
  const isLoading = useClassStore((state) => state.isLoading);

  return {
    getSessionsByClass,
    getSaturdaySessions,
    getSundaySessions,
    loadSessions,
    createSession,
    deleteSession,
    isCreating,
    isLoading,
  };
}

/**
 * Hook for filtering and search
 */
export function useClassFilters() {
  const filters = useClassStore((state) => state.filters);
  const setFilters = useClassStore((state) => state.setFilters);
  const getFilteredClasses = useClassStore((state) => state.getFilteredClasses);

  return {
    filters,
    setFilters,
    filteredClasses: getFilteredClasses(),
  };
}
