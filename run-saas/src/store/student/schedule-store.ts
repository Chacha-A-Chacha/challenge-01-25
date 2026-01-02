// store/student/schedule-store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BaseStoreState,
  Session,
  Class,
  Course,
  AttendanceRecord,
  ApiResponse,
} from "@/types";
import { API_ROUTES } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/utils";

// ============================================================================
// TYPES - Only what's needed for schedule state
// ============================================================================

interface StudentSchedule {
  student: {
    id: string;
    firstName: string;
    lastName?: string;
    studentNumber: string;
  };
  class: Class;
  course: Course;
  saturdaySession?: Session;
  sundaySession?: Session;
}

interface AttendanceStats {
  totalSessions: number;
  attendedSessions: number;
  missedSessions: number;
  attendanceRate: number;
}

interface SessionInfo {
  isSessionTime: boolean;
  currentSession: Session | null;
  nextSession: Session | null;
  canGenerateQR: boolean;
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface ScheduleState extends BaseStoreState {
  // Core data
  schedule: StudentSchedule | null;
  attendanceHistory: AttendanceRecord[];
  attendanceStats: AttendanceStats | null;

  // Current session state
  sessionInfo: SessionInfo | null;

  // Loading states
  isLoadingSchedule: boolean;
  isLoadingAttendance: boolean;

  // Actions
  loadSchedule: () => Promise<void>;
  loadAttendanceHistory: (limit?: number) => Promise<void>;
  refreshSessionInfo: () => void;

  // Computed
  getCurrentSession: () => Session | null;
  getUpcomingSession: () => Session | null;
  getTodaysSessions: () => Session[];

  // Utils
  clearErrors: () => void;
  reset: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ATTENDANCE_STATS: AttendanceStats = {
  totalSessions: 0,
  attendedSessions: 0,
  missedSessions: 0,
  attendanceRate: 0,
};

const DEFAULT_SESSION_INFO: SessionInfo = {
  isSessionTime: false,
  currentSession: null,
  nextSession: null,
  canGenerateQR: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isCurrentlyInSession(session: Session): boolean {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const sessionDay = session.day === "SATURDAY" ? 6 : 0;

  if (currentDay !== sessionDay) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sessionStart = parseTimeToMinutes(session.startTime);
  const sessionEnd = parseTimeToMinutes(session.endTime);

  return currentMinutes >= sessionStart && currentMinutes <= sessionEnd;
}

function canGenerateQRCode(session: Session): boolean {
  const now = new Date();
  const currentDay = now.getDay();
  const sessionDay = session.day === "SATURDAY" ? 6 : 0;

  if (currentDay !== sessionDay) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sessionStart = parseTimeToMinutes(session.startTime);
  const sessionEnd = parseTimeToMinutes(session.endTime);
  const qrWindow = sessionStart - 30; // 30 minutes before session

  return currentMinutes >= qrWindow && currentMinutes <= sessionEnd;
}

function getNextSession(
  saturdaySession?: Session,
  sundaySession?: Session,
): Session | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Saturday (day 6)
  if (currentDay === 6 && saturdaySession) {
    const sessionStart = parseTimeToMinutes(saturdaySession.startTime);
    if (currentMinutes < sessionStart) {
      return saturdaySession; // Today's session hasn't started
    }
    return sundaySession || null; // Next is Sunday
  }

  // Sunday (day 0)
  if (currentDay === 0 && sundaySession) {
    const sessionStart = parseTimeToMinutes(sundaySession.startTime);
    if (currentMinutes < sessionStart) {
      return sundaySession; // Today's session hasn't started
    }
    return saturdaySession || null; // Next is Saturday
  }

  // Other days - return next session
  if (currentDay < 6) return saturdaySession || null;
  return sundaySession || saturdaySession || null;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core data
      schedule: null,
      attendanceHistory: [],
      attendanceStats: null,

      // Session state
      sessionInfo: null,

      // Loading states
      isLoadingSchedule: false,
      isLoadingAttendance: false,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      loadSchedule: async () => {
        set({ isLoadingSchedule: true, error: null });

        try {
          const response = await fetchWithTimeout(API_ROUTES.STUDENT.SCHEDULE);

          if (!response.ok) {
            throw new Error(`Failed to load schedule: ${response.status}`);
          }

          const result: ApiResponse<StudentSchedule> = await response.json();

          if (result.success && result.data) {
            set({
              schedule: result.data,
              isLoadingSchedule: false,
              lastUpdated: new Date(),
            });

            // Update session info after loading schedule
            get().refreshSessionInfo();
          } else {
            throw new Error(result.error || "Failed to load schedule");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load schedule";
          set({
            error: errorMessage,
            isLoadingSchedule: false,
          });
        }
      },

      loadAttendanceHistory: async (limit = 50) => {
        set({ isLoadingAttendance: true, error: null });

        try {
          const response = await fetchWithTimeout(
            `${API_ROUTES.STUDENT.ATTENDANCE}?limit=${limit}`,
          );

          if (!response.ok) {
            throw new Error(`Failed to load attendance: ${response.status}`);
          }

          const result: ApiResponse<{
            attendanceRecords: AttendanceRecord[];
            stats: AttendanceStats;
          }> = await response.json();

          if (result.success && result.data) {
            set({
              attendanceHistory: result.data.attendanceRecords,
              attendanceStats: result.data.stats,
              isLoadingAttendance: false,
              lastUpdated: new Date(),
            });
          } else {
            throw new Error(
              result.error || "Failed to load attendance history",
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load attendance";
          set({
            error: errorMessage,
            isLoadingAttendance: false,
          });
        }
      },

      refreshSessionInfo: () => {
        const { schedule } = get();

        if (!schedule) {
          set({ sessionInfo: DEFAULT_SESSION_INFO });
          return;
        }

        const { saturdaySession, sundaySession } = schedule;

        // Find current session
        let currentSession: Session | null = null;
        if (saturdaySession && isCurrentlyInSession(saturdaySession)) {
          currentSession = saturdaySession;
        } else if (sundaySession && isCurrentlyInSession(sundaySession)) {
          currentSession = sundaySession;
        }

        // Find next session
        const nextSession = getNextSession(saturdaySession, sundaySession);

        // Check if can generate QR
        let canGenerateQR = false;
        if (currentSession) {
          canGenerateQR = true; // Can generate during session
        } else if (nextSession) {
          canGenerateQR = canGenerateQRCode(nextSession); // Can generate 30 min before
        }

        set({
          sessionInfo: {
            isSessionTime: !!currentSession,
            currentSession,
            nextSession,
            canGenerateQR,
          },
          lastUpdated: new Date(),
        });
      },

      // ============================================================================
      // COMPUTED VALUES
      // ============================================================================

      getCurrentSession: () => {
        return get().sessionInfo?.currentSession || null;
      },

      getUpcomingSession: () => {
        return get().sessionInfo?.nextSession || null;
      },

      getTodaysSessions: () => {
        const { schedule } = get();
        if (!schedule) return [];

        const now = new Date();
        const currentDay = now.getDay();

        const sessions: Session[] = [];
        if (currentDay === 6 && schedule.saturdaySession) {
          sessions.push(schedule.saturdaySession);
        }
        if (currentDay === 0 && schedule.sundaySession) {
          sessions.push(schedule.sundaySession);
        }

        return sessions;
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      clearErrors: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          schedule: null,
          attendanceHistory: [],
          attendanceStats: null,
          sessionInfo: null,
          isLoadingSchedule: false,
          isLoadingAttendance: false,
          isLoading: false,
          error: null,
          lastUpdated: null,
        });
      },
    }),
    {
      name: "schedule-store",
      partialize: (state) => ({
        // Don't persist any schedule data - always fetch fresh
        // Schedule changes frequently and should be current
      }),
    },
  ),
);

// Auto-refresh session info every minute
if (typeof window !== "undefined") {
  setInterval(() => {
    const state = useScheduleStore.getState();
    if (state.schedule) {
      state.refreshSessionInfo();
    }
  }, 60000); // Every minute
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for student schedule data
 */
export function useStudentSchedule() {
  const schedule = useScheduleStore((state) => state.schedule);
  const isLoadingSchedule = useScheduleStore(
    (state) => state.isLoadingSchedule,
  );
  const error = useScheduleStore((state) => state.error);
  const loadSchedule = useScheduleStore((state) => state.loadSchedule);

  return {
    schedule,
    isLoading: isLoadingSchedule,
    error,
    loadSchedule,
  };
}

/**
 * Hook for current session information
 */
export function useCurrentSession() {
  const sessionInfo = useScheduleStore((state) => state.sessionInfo);
  const getCurrentSession = useScheduleStore(
    (state) => state.getCurrentSession,
  );
  const getUpcomingSession = useScheduleStore(
    (state) => state.getUpcomingSession,
  );
  const getTodaysSessions = useScheduleStore(
    (state) => state.getTodaysSessions,
  );
  const refreshSessionInfo = useScheduleStore(
    (state) => state.refreshSessionInfo,
  );

  return {
    sessionInfo,
    currentSession: getCurrentSession(),
    upcomingSession: getUpcomingSession(),
    todaysSessions: getTodaysSessions(),
    canGenerateQR: sessionInfo?.canGenerateQR || false,
    isSessionTime: sessionInfo?.isSessionTime || false,
    refreshSessionInfo,
  };
}

/**
 * Hook for attendance history
 */
export function useAttendanceHistory() {
  const attendanceHistory = useScheduleStore(
    (state) => state.attendanceHistory,
  );
  const attendanceStats = useScheduleStore((state) => state.attendanceStats);
  const isLoadingAttendance = useScheduleStore(
    (state) => state.isLoadingAttendance,
  );
  const loadAttendanceHistory = useScheduleStore(
    (state) => state.loadAttendanceHistory,
  );

  return {
    history: attendanceHistory,
    stats: attendanceStats || DEFAULT_ATTENDANCE_STATS,
    isLoading: isLoadingAttendance,
    loadHistory: loadAttendanceHistory,
  };
}
