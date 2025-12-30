// store/admin/attendance-store.ts
import { create } from "zustand";
import type {
  BaseStoreState,
  CourseAttendanceStats,
  CourseAttendanceDetail,
  StudentAttendanceHistory,
  StudentSearchResult,
  ApiResponse,
} from "@/types";

// ============================================================================
// TYPES
// ============================================================================

interface DateRange {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

interface CourseAttendanceState {
  // Course overview data
  coursesStats: CourseAttendanceStats[];
  isLoadingCourses: boolean;

  // Course detail data
  selectedCourseDetail: CourseAttendanceDetail | null;
  isLoadingCourseDetail: boolean;
  selectedCourseId: string | null;
  selectedSessionFilter: string | null; // Session ID for filtering

  // Student tracker data
  searchResults: StudentSearchResult[];
  isSearching: boolean;
  selectedStudentHistory: StudentAttendanceHistory | null;
  isLoadingStudentHistory: boolean;
  selectedStudentId: string | null;

  // Date range for filtering
  dateRange: DateRange;

  // Base store state
  error: string | null;
  isLoading: boolean;

  // Actions - Course Overview
  loadCoursesStats: (startDate: string, endDate: string) => Promise<void>;
  setDateRange: (startDate: string, endDate: string) => void;

  // Actions - Course Detail
  loadCourseDetail: (
    courseId: string,
    startDate: string,
    endDate: string,
    sessionId?: string,
  ) => Promise<void>;
  setSelectedCourse: (courseId: string | null) => void;
  setSessionFilter: (sessionId: string | null) => void;

  // Actions - Student Tracker
  searchStudents: (query: string) => Promise<void>;
  loadStudentHistory: (
    studentId: string,
    startDate: string,
    endDate: string,
  ) => Promise<void>;
  setSelectedStudent: (studentId: string | null) => void;
  clearSearchResults: () => void;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

// ============================================================================
// STORE
// ============================================================================

export const useAdminAttendanceStore = create<CourseAttendanceState>(
  (set, get) => ({
    // Initial state
    coursesStats: [],
    isLoadingCourses: false,

    selectedCourseDetail: null,
    isLoadingCourseDetail: false,
    selectedCourseId: null,
    selectedSessionFilter: null,

    searchResults: [],
    isSearching: false,
    selectedStudentHistory: null,
    isLoadingStudentHistory: false,
    selectedStudentId: null,

    dateRange: getDefaultDateRange(),

    error: null,
    isLoading: false,

    // Course Overview Actions
    loadCoursesStats: async (startDate: string, endDate: string) => {
      set({ isLoadingCourses: true, error: null });

      try {
        const response = await fetch(
          `/api/admin/attendance/courses?startDate=${startDate}&endDate=${endDate}`,
        );

        const result: ApiResponse<CourseAttendanceStats[]> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load courses stats");
        }

        set({
          coursesStats: result.data || [],
          isLoadingCourses: false,
        });
      } catch (error) {
        console.error("Error loading courses stats:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load courses stats",
          isLoadingCourses: false,
        });
      }
    },

    setDateRange: (startDate: string, endDate: string) => {
      set({ dateRange: { startDate, endDate } });
    },

    // Course Detail Actions
    loadCourseDetail: async (
      courseId: string,
      startDate: string,
      endDate: string,
      sessionId?: string,
    ) => {
      set({ isLoadingCourseDetail: true, error: null });

      try {
        const sessionParam = sessionId ? `&sessionId=${sessionId}` : "";
        const response = await fetch(
          `/api/admin/attendance/courses/${courseId}?startDate=${startDate}&endDate=${endDate}${sessionParam}`,
        );

        const result: ApiResponse<CourseAttendanceDetail> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load course detail");
        }

        set({
          selectedCourseDetail: result.data || null,
          selectedCourseId: courseId,
          selectedSessionFilter: sessionId || null,
          isLoadingCourseDetail: false,
        });
      } catch (error) {
        console.error("Error loading course detail:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load course detail",
          isLoadingCourseDetail: false,
        });
      }
    },

    setSelectedCourse: (courseId: string | null) => {
      set({ selectedCourseId: courseId, selectedCourseDetail: null });
    },

    setSessionFilter: (sessionId: string | null) => {
      set({ selectedSessionFilter: sessionId });
    },

    // Student Tracker Actions
    searchStudents: async (query: string) => {
      if (!query || query.trim().length < 2) {
        set({ searchResults: [], error: "Search query too short" });
        return;
      }

      set({ isSearching: true, error: null });

      try {
        const response = await fetch(
          `/api/admin/attendance/students/search?q=${encodeURIComponent(query.trim())}`,
        );

        const result: ApiResponse<StudentSearchResult[]> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to search students");
        }

        set({
          searchResults: result.data || [],
          isSearching: false,
        });
      } catch (error) {
        console.error("Error searching students:", error);
        set({
          error:
            error instanceof Error ? error.message : "Failed to search students",
          isSearching: false,
        });
      }
    },

    loadStudentHistory: async (
      studentId: string,
      startDate: string,
      endDate: string,
    ) => {
      set({ isLoadingStudentHistory: true, error: null });

      try {
        const response = await fetch(
          `/api/admin/attendance/students/${studentId}?startDate=${startDate}&endDate=${endDate}`,
        );

        const result: ApiResponse<StudentAttendanceHistory> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load student history");
        }

        set({
          selectedStudentHistory: result.data || null,
          selectedStudentId: studentId,
          isLoadingStudentHistory: false,
        });
      } catch (error) {
        console.error("Error loading student history:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load student history",
          isLoadingStudentHistory: false,
        });
      }
    },

    setSelectedStudent: (studentId: string | null) => {
      set({ selectedStudentId: studentId, selectedStudentHistory: null });
    },

    clearSearchResults: () => {
      set({ searchResults: [] });
    },

    // Utilities
    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set({
        coursesStats: [],
        isLoadingCourses: false,
        selectedCourseDetail: null,
        isLoadingCourseDetail: false,
        selectedCourseId: null,
        selectedSessionFilter: null,
        searchResults: [],
        isSearching: false,
        selectedStudentHistory: null,
        isLoadingStudentHistory: false,
        selectedStudentId: null,
        dateRange: getDefaultDateRange(),
        error: null,
        isLoading: false,
      });
    },
  }),
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for course overview tab
 */
export const useCourseOverview = () => {
  const {
    coursesStats,
    isLoadingCourses,
    dateRange,
    error,
    loadCoursesStats,
    setDateRange,
  } = useAdminAttendanceStore();

  return {
    coursesStats,
    isLoading: isLoadingCourses,
    dateRange,
    error,
    loadCoursesStats,
    setDateRange,
  };
};

/**
 * Hook for course detail tab
 */
export const useCourseDetail = () => {
  const {
    selectedCourseDetail,
    isLoadingCourseDetail,
    selectedCourseId,
    selectedSessionFilter,
    dateRange,
    error,
    loadCourseDetail,
    setSelectedCourse,
    setSessionFilter,
  } = useAdminAttendanceStore();

  return {
    courseDetail: selectedCourseDetail,
    isLoading: isLoadingCourseDetail,
    selectedCourseId,
    selectedSessionFilter,
    dateRange,
    error,
    loadCourseDetail,
    setSelectedCourse,
    setSessionFilter,
  };
};

/**
 * Hook for student tracker tab
 */
export const useStudentTracker = () => {
  const {
    searchResults,
    isSearching,
    selectedStudentHistory,
    isLoadingStudentHistory,
    selectedStudentId,
    dateRange,
    error,
    searchStudents,
    loadStudentHistory,
    setSelectedStudent,
    clearSearchResults,
  } = useAdminAttendanceStore();

  return {
    searchResults,
    isSearching,
    studentHistory: selectedStudentHistory,
    isLoadingHistory: isLoadingStudentHistory,
    selectedStudentId,
    dateRange,
    error,
    searchStudents,
    loadStudentHistory,
    setSelectedStudent,
    clearSearchResults,
  };
};
