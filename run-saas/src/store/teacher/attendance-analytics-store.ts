// store/teacher/attendance-analytics-store.ts
import { create } from "zustand";
import type { ApiResponse } from "@/types";

// ============================================================================
// TYPES
// ============================================================================

interface DateRange {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

interface CourseOverviewStats {
  courseName: string;
  totalStudents: number;
  totalClasses: number;
  totalSessions: number;
  averageAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  totalRecords: number;
}

interface ClassBreakdownData {
  classId: string;
  className: string;
  totalStudents: number;
  totalSessions: number;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  lastRecordedDate: string | null;
}

interface SessionHistoryData {
  sessionId: string;
  date: string;
  day: "SATURDAY" | "SUNDAY";
  startTime: string;
  endTime: string;
  className: string;
  classId: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  wrongSessionCount: number;
  attendanceRate: number;
}

interface SessionDetailData {
  session: {
    id: string;
    date: string;
    day: "SATURDAY" | "SUNDAY";
    startTime: string;
    endTime: string;
    className: string;
  };
  attendanceRecords: {
    studentId: string;
    studentName: string;
    studentNumber: string;
    status: "PRESENT" | "ABSENT" | "WRONG_SESSION";
    scanTime?: string;
    markedBy?: string;
  }[];
}

interface StudentSearchResult {
  studentId: string;
  studentNumber: string;
  fullName: string;
  className: string;
  classId: string;
}

interface StudentAttendanceHistory {
  student: {
    studentNumber: string;
    fullName: string;
    className: string;
    classId: string;
    email: string;
    saturdaySession: {
      id: string;
      day: string;
      time: string;
    };
    sundaySession: {
      id: string;
      day: string;
      time: string;
    };
  };
  stats: {
    attendanceRate: number;
    saturdayAttendanceRate: number;
    sundayAttendanceRate: number;
    presentDays: number;
    absentDays: number;
    totalClassDays: number;
  };
  attendanceRecords: {
    date: string;
    day: string;
    sessionTime: string;
    status: "PRESENT" | "ABSENT" | "WRONG_SESSION";
    isCorrectSession: boolean;
  }[];
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface TeacherAttendanceAnalyticsState {
  // Course Overview
  courseOverview: CourseOverviewStats | null;
  isLoadingOverview: boolean;

  // Class Breakdown
  classBreakdown: ClassBreakdownData[];
  isLoadingClasses: boolean;

  // Session History
  sessionHistory: SessionHistoryData[];
  selectedSessionDetail: SessionDetailData | null;
  isLoadingHistory: boolean;
  isLoadingSessionDetail: boolean;

  // Student Tracker
  searchResults: StudentSearchResult[];
  isSearching: boolean;
  selectedStudent: StudentAttendanceHistory | null;
  selectedStudentId: string | null;
  isLoadingStudent: boolean;

  // Date Range
  dateRange: DateRange;

  // Filters
  selectedClassFilter: string | null;
  selectedDayFilter: "SATURDAY" | "SUNDAY" | null;

  // Error handling
  error: string | null;

  // Actions - Overview
  loadCourseOverview: (startDate: string, endDate: string) => Promise<void>;

  // Actions - Classes
  loadClassBreakdown: (startDate: string, endDate: string) => Promise<void>;

  // Actions - Sessions
  loadSessionHistory: (
    startDate: string,
    endDate: string,
    classId?: string,
    day?: "SATURDAY" | "SUNDAY",
  ) => Promise<void>;
  loadSessionDetail: (sessionId: string, date: string) => Promise<void>;

  // Actions - Students
  searchStudents: (query: string, classId?: string) => Promise<void>;
  loadStudentHistory: (
    studentId: string,
    startDate: string,
    endDate: string,
  ) => Promise<void>;
  setSelectedStudent: (studentId: string | null) => void;
  clearSearchResults: () => void;

  // Actions - Filters
  setDateRange: (startDate: string, endDate: string) => void;
  setClassFilter: (classId: string | null) => void;
  setDayFilter: (day: "SATURDAY" | "SUNDAY" | null) => void;

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
// STORE IMPLEMENTATION
// ============================================================================

export const useTeacherAttendanceAnalyticsStore =
  create<TeacherAttendanceAnalyticsState>((set, get) => ({
    // Initial state
    courseOverview: null,
    isLoadingOverview: false,

    classBreakdown: [],
    isLoadingClasses: false,

    sessionHistory: [],
    selectedSessionDetail: null,
    isLoadingHistory: false,
    isLoadingSessionDetail: false,

    searchResults: [],
    isSearching: false,
    selectedStudent: null,
    selectedStudentId: null,
    isLoadingStudent: false,

    dateRange: getDefaultDateRange(),

    selectedClassFilter: null,
    selectedDayFilter: null,

    error: null,

    // ============================================================================
    // COURSE OVERVIEW ACTIONS
    // ============================================================================

    loadCourseOverview: async (startDate: string, endDate: string) => {
      set({ isLoadingOverview: true, error: null });

      try {
        const response = await fetch(
          `/api/teacher/attendance/overview?startDate=${startDate}&endDate=${endDate}`,
        );

        const result: ApiResponse<CourseOverviewStats> = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load course overview");
        }

        set({
          courseOverview: result.data || null,
          isLoadingOverview: false,
        });
      } catch (error) {
        console.error("Error loading course overview:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load course overview",
          isLoadingOverview: false,
        });
      }
    },

    // ============================================================================
    // CLASS BREAKDOWN ACTIONS
    // ============================================================================

    loadClassBreakdown: async (startDate: string, endDate: string) => {
      set({ isLoadingClasses: true, error: null });

      try {
        const response = await fetch(
          `/api/teacher/attendance/classes?startDate=${startDate}&endDate=${endDate}`,
        );

        const result: ApiResponse<ClassBreakdownData[]> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load class breakdown");
        }

        set({
          classBreakdown: result.data || [],
          isLoadingClasses: false,
        });
      } catch (error) {
        console.error("Error loading class breakdown:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load class breakdown",
          isLoadingClasses: false,
        });
      }
    },

    // ============================================================================
    // SESSION HISTORY ACTIONS
    // ============================================================================

    loadSessionHistory: async (
      startDate: string,
      endDate: string,
      classId?: string,
      day?: "SATURDAY" | "SUNDAY",
    ) => {
      set({ isLoadingHistory: true, error: null });

      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        if (classId) params.append("classId", classId);
        if (day) params.append("day", day);

        const response = await fetch(
          `/api/teacher/attendance/sessions?${params.toString()}`,
        );

        const result: ApiResponse<SessionHistoryData[]> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load session history");
        }

        set({
          sessionHistory: result.data || [],
          isLoadingHistory: false,
        });
      } catch (error) {
        console.error("Error loading session history:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load session history",
          isLoadingHistory: false,
        });
      }
    },

    loadSessionDetail: async (sessionId: string, date: string) => {
      set({ isLoadingSessionDetail: true, error: null });

      try {
        const response = await fetch(
          `/api/teacher/attendance/sessions/${sessionId}/detail?date=${date}`,
        );

        const result: ApiResponse<SessionDetailData> = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load session detail");
        }

        set({
          selectedSessionDetail: result.data || null,
          isLoadingSessionDetail: false,
        });
      } catch (error) {
        console.error("Error loading session detail:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load session detail",
          isLoadingSessionDetail: false,
        });
      }
    },

    // ============================================================================
    // STUDENT TRACKER ACTIONS
    // ============================================================================

    searchStudents: async (query: string, classId?: string) => {
      if (!query || query.trim().length < 2) {
        set({ searchResults: [], error: "Search query too short" });
        return;
      }

      set({ isSearching: true, error: null });

      try {
        const params = new URLSearchParams({
          q: query.trim(),
        });

        if (classId) params.append("classId", classId);

        const response = await fetch(
          `/api/teacher/attendance/students/search?${params.toString()}`,
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
      set({ isLoadingStudent: true, error: null });

      try {
        const response = await fetch(
          `/api/teacher/attendance/students/${studentId}?startDate=${startDate}&endDate=${endDate}`,
        );

        const result: ApiResponse<StudentAttendanceHistory> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load student history");
        }

        set({
          selectedStudent: result.data || null,
          selectedStudentId: studentId,
          isLoadingStudent: false,
        });
      } catch (error) {
        console.error("Error loading student history:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load student history",
          isLoadingStudent: false,
        });
      }
    },

    setSelectedStudent: (studentId: string | null) => {
      set({ selectedStudentId: studentId, selectedStudent: null });
    },

    clearSearchResults: () => {
      set({ searchResults: [] });
    },

    // ============================================================================
    // FILTER ACTIONS
    // ============================================================================

    setDateRange: (startDate: string, endDate: string) => {
      set({ dateRange: { startDate, endDate } });
    },

    setClassFilter: (classId: string | null) => {
      set({ selectedClassFilter: classId });
    },

    setDayFilter: (day: "SATURDAY" | "SUNDAY" | null) => {
      set({ selectedDayFilter: day });
    },

    // ============================================================================
    // UTILITIES
    // ============================================================================

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set({
        courseOverview: null,
        isLoadingOverview: false,
        classBreakdown: [],
        isLoadingClasses: false,
        sessionHistory: [],
        selectedSessionDetail: null,
        isLoadingHistory: false,
        isLoadingSessionDetail: false,
        searchResults: [],
        isSearching: false,
        selectedStudent: null,
        selectedStudentId: null,
        isLoadingStudent: false,
        dateRange: getDefaultDateRange(),
        selectedClassFilter: null,
        selectedDayFilter: null,
        error: null,
      });
    },
  }));

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for course overview
 */
export const useCourseOverview = () => {
  const {
    courseOverview,
    isLoadingOverview,
    dateRange,
    error,
    loadCourseOverview,
    setDateRange,
  } = useTeacherAttendanceAnalyticsStore();

  return {
    courseOverview,
    isLoading: isLoadingOverview,
    dateRange,
    error,
    loadCourseOverview,
    setDateRange,
  };
};

/**
 * Hook for class breakdown
 */
export const useClassBreakdown = () => {
  const {
    classBreakdown,
    isLoadingClasses,
    dateRange,
    error,
    loadClassBreakdown,
    setDateRange,
  } = useTeacherAttendanceAnalyticsStore();

  return {
    classBreakdown,
    isLoading: isLoadingClasses,
    dateRange,
    error,
    loadClassBreakdown,
    setDateRange,
  };
};

/**
 * Hook for session history
 */
export const useSessionHistory = () => {
  const {
    sessionHistory,
    selectedSessionDetail,
    isLoadingHistory,
    isLoadingSessionDetail,
    dateRange,
    selectedClassFilter,
    selectedDayFilter,
    error,
    loadSessionHistory,
    loadSessionDetail,
    setDateRange,
    setClassFilter,
    setDayFilter,
  } = useTeacherAttendanceAnalyticsStore();

  return {
    sessionHistory,
    selectedSessionDetail,
    isLoadingHistory,
    isLoadingSessionDetail,
    dateRange,
    selectedClassFilter,
    selectedDayFilter,
    error,
    loadSessionHistory,
    loadSessionDetail,
    setDateRange,
    setClassFilter,
    setDayFilter,
  };
};

/**
 * Hook for student tracker
 */
export const useStudentTracker = () => {
  const {
    searchResults,
    isSearching,
    selectedStudent,
    selectedStudentId,
    isLoadingStudent,
    dateRange,
    error,
    searchStudents,
    loadStudentHistory,
    setSelectedStudent,
    clearSearchResults,
    setDateRange,
  } = useTeacherAttendanceAnalyticsStore();

  return {
    searchResults,
    isSearching,
    selectedStudent,
    selectedStudentId,
    isLoadingStudent,
    dateRange,
    error,
    searchStudents,
    loadStudentHistory,
    setSelectedStudent,
    clearSearchResults,
    setDateRange,
  };
};
