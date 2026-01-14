"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, TrendingUp, Users, ClipboardList } from "lucide-react";
import { useCourseOverview } from "@/store/teacher/attendance-analytics-store";
import { DateRangePicker } from "@/components/admin/attendance/DateRangePicker";

export function CourseOverviewDashboard() {
  const { courseOverview, isLoading, dateRange, loadCourseOverview } =
    useCourseOverview();

  useEffect(() => {
    loadCourseOverview(dateRange.startDate, dateRange.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    loadCourseOverview(startDate, endDate);
  };

  if (isLoading && !courseOverview) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading course overview...
        </div>
      </div>
    );
  }

  const stats = courseOverview || {
    courseName: "",
    totalStudents: 0,
    totalClasses: 0,
    totalSessions: 0,
    averageAttendanceRate: 0,
    presentCount: 0,
    absentCount: 0,
    wrongSessionCount: 0,
    totalRecords: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {stats.courseName || "Course"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Overall attendance statistics
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Stats Grid - 2 columns mobile, 4 desktop */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalStudents}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Students
                </p>
                <p className="text-xs text-muted-foreground">
                  Across {stats.totalClasses} classes
                </p>
              </div>
              <Users className="h-5 w-5 text-emerald-600/50" />
            </div>
          </CardContent>
        </Card>

        {/* Sessions Held */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalSessions}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sessions Held
                </p>
                <p className="text-xs text-muted-foreground">
                  In selected period
                </p>
              </div>
              <Calendar className="h-5 w-5 text-emerald-600/50" />
            </div>
          </CardContent>
        </Card>

        {/* Average Attendance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`text-2xl font-bold ${
                    stats.averageAttendanceRate >= 80
                      ? "text-green-600 dark:text-green-400"
                      : stats.averageAttendanceRate >= 60
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {stats.averageAttendanceRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Attendance Rate
                </p>
                <p className="text-xs text-muted-foreground">Overall average</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Total Records */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalRecords}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Records
                </p>
                <p className="text-xs text-muted-foreground">
                  Attendance entries
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-emerald-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Stats - 2 cols mobile, 3 desktop */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {stats.presentCount}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Present</p>
              </div>
              <div className="text-2xl text-green-600 dark:text-green-400">
                ✓
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                  {stats.absentCount}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Absent</p>
              </div>
              <div className="text-2xl text-red-600 dark:text-red-400">✗</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.wrongSessionCount}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Wrong Session
                </p>
              </div>
              <div className="text-2xl text-orange-600 dark:text-orange-400">
                ⚠
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
