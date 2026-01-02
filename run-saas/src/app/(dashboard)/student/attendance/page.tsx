"use client";

import { useEffect } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import {
  AttendanceCalendar,
  UpcomingSessions,
  AttendanceStats,
  ContributionGraph,
} from "@/components/student";
import {
  useStudentSchedule,
  useAttendanceHistory,
} from "@/store/student/schedule-store";
import { AlertCircle } from "lucide-react";

function AttendancePage() {
  const {
    schedule,
    isLoading: isLoadingSchedule,
    loadSchedule,
  } = useStudentSchedule();
  const {
    history,
    stats,
    isLoading: isLoadingHistory,
    loadHistory,
  } = useAttendanceHistory();

  useEffect(() => {
    loadSchedule();
    loadHistory();
  }, [loadSchedule, loadHistory]);

  if (isLoadingSchedule || isLoadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Schedule Found</h2>
          <p className="text-muted-foreground">
            You are not currently enrolled in any classes.
          </p>
        </div>
      </div>
    );
  }

  // Transform attendance history for components
  const attendanceData = history.map((record) => ({
    date: record.attendedAt.toString(),
    status: record.status,
  }));

  // Calculate absences and wrong sessions
  const absences = history.filter((r) => r.status === "ABSENT").length;
  const wrongSessions = history.filter((r) => r.status === "WRONG_SESSION").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Tracking</h1>
        <p className="text-muted-foreground">
          View your attendance history and upcoming sessions
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Calendar (Takes 2 columns on large screens) */}
        <div className="lg:col-span-2">
          <AttendanceCalendar attendanceData={attendanceData} />
        </div>

        {/* Right Column - Upcoming Sessions and Stats */}
        <div className="space-y-6">
          <UpcomingSessions
            saturdaySession={schedule.saturdaySession}
            sundaySession={schedule.sundaySession}
          />

          <div>
            <h3 className="text-lg font-semibold mb-3">Statistics</h3>
            <AttendanceStats absences={absences} wrongSessions={wrongSessions} />
          </div>
        </div>
      </div>

      {/* Full Width - Contribution Graph */}
      <ContributionGraph attendanceData={attendanceData} />
    </div>
  );
}

export default function AttendancePageWithGuard() {
  return (
    <RoleGuard allowedRoles="student">
      <AttendancePage />
    </RoleGuard>
  );
}
