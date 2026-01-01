"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, Calendar } from "lucide-react";
import {
  useCourseOverview,
  useCourseDetail,
  useStudentTracker,
} from "@/store/admin/attendance-store";
import {
  AttendanceStatsCard,
  CourseStatsCard,
} from "@/components/admin/attendance/AttendanceStatsCard";
import { DateRangePicker } from "@/components/admin/attendance/DateRangePicker";
import { ClassAttendanceTable } from "@/components/admin/attendance/ClassAttendanceTable";
import { StudentAttendanceTable } from "@/components/admin/attendance/StudentAttendanceTable";
import { StudentSearchBox } from "@/components/admin/attendance/StudentSearchBox";
import { ExportButton } from "@/components/admin/attendance/ExportButton";

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Course Overview
  const {
    coursesStats,
    isLoading: isLoadingOverview,
    dateRange: overviewDateRange,
    error: overviewError,
    loadCoursesStats,
    setDateRange: setOverviewDateRange,
  } = useCourseOverview();

  // Course Detail
  const {
    courseDetail,
    isLoading: isLoadingDetail,
    selectedCourseId,
    selectedSessionFilter,
    dateRange: detailDateRange,
    error: detailError,
    loadCourseDetail,
    setSelectedCourse,
    setSessionFilter,
  } = useCourseDetail();

  // Student Tracker
  const {
    searchResults,
    isSearching,
    studentHistory,
    isLoadingHistory,
    selectedStudentId,
    dateRange: studentDateRange,
    error: studentError,
    searchStudents,
    loadStudentHistory,
    setSelectedStudent,
  } = useStudentTracker();

  // Load course overview on mount
  useEffect(() => {
    loadCoursesStats(overviewDateRange.startDate, overviewDateRange.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOverviewDateRangeChange = (
    startDate: string,
    endDate: string,
  ) => {
    setOverviewDateRange(startDate, endDate);
    loadCoursesStats(startDate, endDate);
  };

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    loadCourseDetail(
      courseId,
      detailDateRange.startDate,
      detailDateRange.endDate,
    );
  };

  const handleDetailDateRangeChange = (startDate: string, endDate: string) => {
    if (selectedCourseId) {
      loadCourseDetail(
        selectedCourseId,
        startDate,
        endDate,
        selectedSessionFilter || undefined,
      );
    }
  };

  const handleSessionFilterChange = (sessionId: string) => {
    if (selectedCourseId) {
      setSessionFilter(sessionId === "all" ? null : sessionId);
      loadCourseDetail(
        selectedCourseId,
        detailDateRange.startDate,
        detailDateRange.endDate,
        sessionId === "all" ? undefined : sessionId,
      );
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudent(studentId);
    loadStudentHistory(
      studentId,
      studentDateRange.startDate,
      studentDateRange.endDate,
    );
  };

  const handleStudentDateRangeChange = (startDate: string, endDate: string) => {
    if (selectedStudentId) {
      loadStudentHistory(selectedStudentId, startDate, endDate);
    }
  };

  // Calculate overall stats for overview
  const overallStats = {
    totalStudents: coursesStats.reduce((sum, c) => sum + c.totalStudents, 0),
    totalCourses: coursesStats.length,
    avgAttendanceRate:
      coursesStats.length > 0
        ? Math.round(
            coursesStats.reduce((sum, c) => sum + c.attendanceRate, 0) /
              coursesStats.length,
          )
        : 0,
    totalRecords: coursesStats.reduce((sum, c) => sum + c.attendanceRecords, 0),
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Attendance Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          View and analyze attendance data across courses and students
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Course Overview</TabsTrigger>
          <TabsTrigger value="detail">Course Detail</TabsTrigger>
          <TabsTrigger value="student">Student Tracker</TabsTrigger>
        </TabsList>

        {/* Tab 1: Course Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="flex items-center justify-between">
            <DateRangePicker
              startDate={overviewDateRange.startDate}
              endDate={overviewDateRange.endDate}
              onDateRangeChange={handleOverviewDateRangeChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                loadCoursesStats(
                  overviewDateRange.startDate,
                  overviewDateRange.endDate,
                )
              }
              disabled={isLoadingOverview}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoadingOverview ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Overall Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AttendanceStatsCard
              title="Total Courses"
              value={overallStats.totalCourses}
              subtitle="Active courses"
              icon={<Calendar className="h-4 w-4" />}
            />
            <AttendanceStatsCard
              title="Total Students"
              value={overallStats.totalStudents}
              subtitle="Across all courses"
              icon={<Users className="h-4 w-4" />}
            />
            <AttendanceStatsCard
              title="Average Attendance"
              value={`${overallStats.avgAttendanceRate}%`}
              subtitle="Overall rate"
              variant={
                overallStats.avgAttendanceRate >= 80
                  ? "success"
                  : overallStats.avgAttendanceRate >= 60
                    ? "warning"
                    : "danger"
              }
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <AttendanceStatsCard
              title="Total Records"
              value={overallStats.totalRecords}
              subtitle="Attendance entries"
            />
          </div>

          {/* Course Cards */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Courses</h2>
            {isLoadingOverview ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading courses...
              </div>
            ) : overviewError ? (
              <div className="text-center py-12 text-red-600">
                {overviewError}
              </div>
            ) : coursesStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No courses found for the selected date range
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {coursesStats.map((course) => (
                  <CourseStatsCard
                    key={course.courseId}
                    courseName={course.courseName}
                    totalStudents={course.totalStudents}
                    attendanceRate={course.attendanceRate}
                    presentCount={course.presentCount}
                    absentCount={course.absentCount}
                    wrongSessionCount={course.wrongSessionCount}
                    lastRecordedDate={course.lastRecordedDate}
                    onClick={() => {
                      handleCourseSelect(course.courseId);
                      setActiveTab("detail");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Course Detail */}
        <TabsContent value="detail" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Select Course</Label>
              <Select
                value={selectedCourseId || undefined}
                onValueChange={handleCourseSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {coursesStats.map((course) => (
                    <SelectItem key={course.courseId} value={course.courseId}>
                      {course.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {courseDetail && courseDetail.sessions.length > 0 && (
              <div className="flex-1 space-y-2">
                <Label>Filter by Session (Optional)</Label>
                <Select
                  value={selectedSessionFilter || "all"}
                  onValueChange={handleSessionFilterChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sessions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    {courseDetail.sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.className} - {session.day} ({session.startTime}{" "}
                        - {session.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                startDate={detailDateRange.startDate}
                endDate={detailDateRange.endDate}
                onDateRangeChange={handleDetailDateRangeChange}
              />
            </div>
          </div>

          {!selectedCourseId ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              Select a course to view detailed attendance breakdown
            </div>
          ) : isLoadingDetail ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading course details...
            </div>
          ) : detailError ? (
            <div className="text-center py-12 text-red-600">{detailError}</div>
          ) : courseDetail ? (
            <>
              {/* Course Info & Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AttendanceStatsCard
                  title="Total Students"
                  value={courseDetail.overallStats.totalStudents}
                  subtitle={`${courseDetail.overallStats.totalClasses} classes`}
                />
                <AttendanceStatsCard
                  title="Attendance Rate"
                  value={`${courseDetail.overallStats.attendanceRate}%`}
                  variant={
                    courseDetail.overallStats.attendanceRate >= 80
                      ? "success"
                      : courseDetail.overallStats.attendanceRate >= 60
                        ? "warning"
                        : "danger"
                  }
                />
                <AttendanceStatsCard
                  title="Present"
                  value={courseDetail.overallStats.presentCount}
                  variant="success"
                />
                <AttendanceStatsCard
                  title="Absent"
                  value={courseDetail.overallStats.absentCount}
                  variant="danger"
                />
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <ExportButton
                  startDate={detailDateRange.startDate}
                  endDate={detailDateRange.endDate}
                  courseId={selectedCourseId}
                  sessionId={selectedSessionFilter || undefined}
                />
              </div>

              {/* Class Breakdown Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Class Breakdown</h3>
                <ClassAttendanceTable
                  classes={courseDetail.classBreakdown}
                  isLoading={isLoadingDetail}
                />
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Tab 3: Student Tracker */}
        <TabsContent value="student" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <StudentSearchBox
                onSearch={searchStudents}
                onSelectStudent={handleStudentSelect}
                searchResults={searchResults}
                isSearching={isSearching}
                selectedStudentId={selectedStudentId}
              />
            </div>
            <div className="w-full sm:w-64">
              <DateRangePicker
                startDate={studentDateRange.startDate}
                endDate={studentDateRange.endDate}
                onDateRangeChange={handleStudentDateRangeChange}
              />
            </div>
          </div>

          {!selectedStudentId ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              Search for a student to view their attendance history
            </div>
          ) : isLoadingHistory ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading student attendance...
            </div>
          ) : studentError ? (
            <div className="text-center py-12 text-red-600">{studentError}</div>
          ) : studentHistory ? (
            <>
              {/* Student Info Card */}
              <div className="border rounded-lg p-6 bg-muted/50">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Student Information
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Student Number:
                        </dt>
                        <dd className="font-medium">
                          {studentHistory.student.studentNumber}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Class:</dt>
                        <dd className="font-medium">
                          {studentHistory.student.className}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Email:</dt>
                        <dd className="font-medium">
                          {studentHistory.student.email}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Assigned Sessions
                    </h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground mb-1">
                          Saturday:
                        </dt>
                        <dd className="font-medium">
                          {studentHistory.student.saturdaySession.time}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">Sunday:</dt>
                        <dd className="font-medium">
                          {studentHistory.student.sundaySession.time}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Attendance Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AttendanceStatsCard
                  title="Overall Attendance"
                  value={`${studentHistory.stats.attendanceRate}%`}
                  subtitle={`${studentHistory.stats.presentDays} / ${studentHistory.stats.totalClassDays} days`}
                  variant={
                    studentHistory.stats.attendanceRate >= 80
                      ? "success"
                      : studentHistory.stats.attendanceRate >= 60
                        ? "warning"
                        : "danger"
                  }
                />
                <AttendanceStatsCard
                  title="Saturday Attendance"
                  value={`${studentHistory.stats.saturdayAttendanceRate}%`}
                  subtitle="Saturday sessions"
                />
                <AttendanceStatsCard
                  title="Sunday Attendance"
                  value={`${studentHistory.stats.sundayAttendanceRate}%`}
                  subtitle="Sunday sessions"
                />
                <AttendanceStatsCard
                  title="Absent Days"
                  value={studentHistory.stats.absentDays}
                  subtitle="Total absences"
                  variant="danger"
                />
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <ExportButton
                  startDate={studentDateRange.startDate}
                  endDate={studentDateRange.endDate}
                  classId={studentHistory.student.classId}
                />
              </div>

              {/* Attendance Records Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Attendance History
                </h3>
                <StudentAttendanceTable
                  records={studentHistory.attendanceRecords}
                  isLoading={isLoadingHistory}
                />
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
