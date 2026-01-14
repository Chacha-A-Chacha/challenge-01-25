"use client";

import { useEffect } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  AlertCircle,
  GraduationCap,
  School,
  Sparkles,
  Info,
} from "lucide-react";
import { useStudentSchedule } from "@/store/student/schedule-store";
import { formatTimeForDisplay } from "@/lib/validations";

function SchedulePage() {
  const { schedule, isLoading, loadSchedule } = useStudentSchedule();

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your schedule...</p>
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

  const getDayOfWeek = (day: string) => {
    const now = new Date();
    const currentDay = now.getDay();
    const targetDay = day === "Saturday" ? 6 : 0;

    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    return `in ${daysUntil} days`;
  };

  return (
    <div className="w-full">
      {/* Max-width container for consistency */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">My Schedule</h1>
                <p className="text-blue-100 text-sm md:text-base">
                  Your weekly class timetable
                </p>
              </div>
            </div>

            {/* Course & Class Info in Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-blue-200" />
                  <span className="text-xs text-blue-200 font-medium">
                    Course
                  </span>
                </div>
                <div className="text-lg font-bold">{schedule.course.name}</div>
                <Badge
                  variant="secondary"
                  className="mt-2 bg-white/20 text-white border-0"
                >
                  {schedule.course.status}
                </Badge>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <School className="h-4 w-4 text-blue-200" />
                  <span className="text-xs text-blue-200 font-medium">
                    Class
                  </span>
                </div>
                <div className="text-lg font-bold">{schedule.class.name}</div>
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-100">
                  <Users className="h-3 w-3" />
                  <span>{schedule.class.capacity} students</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-blue-200" />
                  <span className="text-xs text-blue-200 font-medium">
                    Sessions
                  </span>
                </div>
                <div className="text-lg font-bold">2 Weekly</div>
                <div className="mt-2 text-sm text-blue-100">
                  Saturday & Sunday
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Schedule Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Weekly Sessions
            </h2>
            <p className="text-muted-foreground mt-1">
              Your class schedule for this week
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Saturday Session */}
            {schedule.saturdaySession ? (
              <div className="bg-white border-2 border-blue-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          SATURDAY
                        </h3>
                        <p className="text-blue-100 text-sm">Weekend Session</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      {getDayOfWeek("Saturday")}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Time Display */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Session Time
                      </span>
                    </div>
                    <div className="ml-12">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatTimeForDisplay(
                          schedule.saturdaySession.startTime,
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-px w-6 bg-blue-300"></div>
                        <span className="text-sm text-muted-foreground">
                          Until{" "}
                          {formatTimeForDisplay(
                            schedule.saturdaySession.endTime,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Class Capacity
                        </span>
                      </div>
                      <span className="font-semibold text-lg">
                        {schedule.saturdaySession.capacity} students
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-900">
                        Active Session
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-600 mb-2">
                  SATURDAY
                </h3>
                <p className="text-muted-foreground">No session scheduled</p>
              </div>
            )}

            {/* Sunday Session */}
            {schedule.sundaySession ? (
              <div className="bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          SUNDAY
                        </h3>
                        <p className="text-indigo-100 text-sm">
                          Weekend Session
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      {getDayOfWeek("Sunday")}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Time Display */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Clock className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Session Time
                      </span>
                    </div>
                    <div className="ml-12">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatTimeForDisplay(schedule.sundaySession.startTime)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-px w-6 bg-indigo-300"></div>
                        <span className="text-sm text-muted-foreground">
                          Until{" "}
                          {formatTimeForDisplay(schedule.sundaySession.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Class Capacity
                        </span>
                      </div>
                      <span className="font-semibold text-lg">
                        {schedule.sundaySession.capacity} students
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-indigo-900">
                        Active Session
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-600 mb-2">SUNDAY</h3>
                <p className="text-muted-foreground">No session scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Important Info Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2 text-lg">
                Remember: QR Code Attendance
              </h3>
              <p className="text-blue-800 mb-3">
                QR codes can be generated <strong>30 minutes before</strong>{" "}
                your class starts and <strong>during the session</strong>.
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>
                  Go to the Dashboard to generate your attendance QR code
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">
              {schedule.saturdaySession && schedule.sundaySession
                ? "2"
                : schedule.saturdaySession || schedule.sundaySession
                  ? "1"
                  : "0"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Weekly Sessions
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">
              {schedule.class.capacity}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Class Size</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow text-white">
            <div className="text-2xl font-bold">SAT</div>
            <div className="text-sm text-blue-100 mt-1">
              {schedule.saturdaySession ? "Active" : "No Session"}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow text-white">
            <div className="text-2xl font-bold">SUN</div>
            <div className="text-sm text-indigo-100 mt-1">
              {schedule.sundaySession ? "Active" : "No Session"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePageWithGuard() {
  return (
    <RoleGuard allowedRoles="student">
      <SchedulePage />
    </RoleGuard>
  );
}
