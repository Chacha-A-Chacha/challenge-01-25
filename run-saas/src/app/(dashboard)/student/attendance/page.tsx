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
import { AlertCircle, TrendingUp, Calendar, Sparkles } from "lucide-react";

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
    date: record.date.toString(),
    status: record.status,
  }));

  // Calculate absences and wrong sessions
  const absences = history.filter((r) => r.status === "ABSENT").length;
  const wrongSessions = history.filter(
    (r) => r.status === "WRONG_SESSION",
  ).length;

  return (
    <div className="w-full">
      {/* Max-width container for consistency */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold">
                      Attendance Tracking
                    </h1>
                    <p className="text-green-100 text-sm md:text-base">
                      Monitor your class attendance and progress
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats in Header */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-200" />
                    <span className="text-xs text-green-200 font-medium">
                      Attendance Rate
                    </span>
                  </div>
                  <div className="text-3xl font-bold">
                    {stats.attendanceRate.toFixed(0)}%
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-green-200" />
                    <span className="text-xs text-green-200 font-medium">
                      Total Sessions
                    </span>
                  </div>
                  <div className="text-3xl font-bold">
                    {stats.totalSessions}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Statistics
              </h3>
              <AttendanceStats
                absences={absences}
                wrongSessions={wrongSessions}
              />
            </div>
          </div>
        </div>

        {/* Full Width - Contribution Graph */}
        <ContributionGraph attendanceData={attendanceData} />
      </div>
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
