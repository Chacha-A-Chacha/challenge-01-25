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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, TrendingUp, Users, Calendar, Download } from "lucide-react";
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
import { ClassAttendanceCard } from "@/components/admin/attendance/ClassAttendanceCard";
import { StudentAttendanceTable } from "@/components/admin/attendance/StudentAttendanceTable";
import { StudentAttendanceCard } from "@/components/admin/attendance/StudentAttendanceCard";
import { StudentSearchBox } from "@/components/admin/attendance/StudentSearchBox";
import { ExportButton } from "@/components/admin/attendance/ExportButton";

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

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

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Attendance Reports
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View and analyze attendance data across courses and students
        </p>
      </div>

      {/* Tabs - Mobile Optimized with Horizontal Scroll */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full min-w-[400px] sm:min-w-0 sm:max-w-md grid-cols-3">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="detail" className="text-xs sm:text-sm">
              Detail
            </TabsTrigger>
            <TabsTrigger value="student" className="text-xs sm:text-sm">
              Student
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Course Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Controls - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="w-full sm:w-auto">
              <DateRangePicker
                startDate={overviewDateRange.startDate}
                endDate={overviewDateRange.endDate}
                onDateRangeChange={handleOverviewDateRangeChange}
              />
            </div>
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
              className="w-full sm:w-auto border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoadingOverview ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Overall Stats - 2 columns on mobile */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Courses</h2>
            {isLoadingOverview ? (
              <Card>
                <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                  Loading courses...
                </CardContent>
              </Card>
            ) : overviewError ? (
              <Card>
                <CardContent className="pt-6 pb-6 text-center text-red-600">
                  {overviewError}
                </CardContent>
              </Card>
            ) : coursesStats.length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                  No courses found for the selected date range
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {/* Filters - Mobile Optimized: Stack Vertically */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
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
              <div className="space-y-2">
                <Label>Filter by Session</Label>
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

            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                startDate={detailDateRange.startDate}
                endDate={detailDateRange.endDate}
                onDateRangeChange={handleDetailDateRangeChange}
              />
            </div>
          </div>

          {!selectedCourseId ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                Select a course to view detailed attendance breakdown
              </CardContent>
            </Card>
          ) : isLoadingDetail ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                Loading course details...
              </CardContent>
            </Card>
          ) : detailError ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-red-600">
                {detailError}
              </CardContent>
            </Card>
          ) : courseDetail ? (
            <>
              {/* Course Info & Stats - 2 columns on mobile */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

              {/* Export Button - Full width on mobile */}
              <div className="flex justify-end">
                <ExportButton
                  startDate={detailDateRange.startDate}
                  endDate={detailDateRange.endDate}
                  courseId={selectedCourseId}
                  sessionId={selectedSessionFilter || undefined}
                />
              </div>

              {/* Class Breakdown - Auto-switch between table and cards */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Class Breakdown</h3>

                {viewMode === "table" ? (
                  <ScrollArea className="w-full">
                    <div className="min-w-[900px]">
                      <ClassAttendanceTable
                        classes={courseDetail.classBreakdown}
                        isLoading={isLoadingDetail}
                      />
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="space-y-4">
                    {courseDetail.classBreakdown.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                          No class data available. Select a different date range
                          or course.
                        </CardContent>
                      </Card>
                    ) : (
                      courseDetail.classBreakdown.map((classData) => (
                        <ClassAttendanceCard
                          key={classData.classId}
                          classData={classData}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Tab 3: Student Tracker */}
        <TabsContent value="student" className="space-y-6">
          {/* Search and Date Range - Stack vertically on mobile */}
          <div className="grid gap-4 sm:grid-cols-[1fr,auto]">
            <div>
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
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                Search for a student to view their attendance history
              </CardContent>
            </Card>
          ) : isLoadingHistory ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                Loading student attendance...
              </CardContent>
            </Card>
          ) : studentError ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-red-600">
                {studentError}
              </CardContent>
            </Card>
          ) : studentHistory ? (
            <>
              {/* Student Info Card - Single column on mobile */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg mb-3">
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
                          <dd className="font-medium truncate max-w-[60%]">
                            {studentHistory.student.email}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg mb-3">
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
                          <dt className="text-muted-foreground mb-1">
                            Sunday:
                          </dt>
                          <dd className="font-medium">
                            {studentHistory.student.sundaySession.time}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Stats - 2 columns on mobile */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

              {/* Export Button - Full width on mobile */}
              <div className="flex justify-end">
                <ExportButton
                  startDate={studentDateRange.startDate}
                  endDate={studentDateRange.endDate}
                  classId={studentHistory.student.classId}
                />
              </div>

              {/* Attendance Records - Auto-switch between table and cards */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Attendance History
                </h3>

                {viewMode === "table" ? (
                  <ScrollArea className="w-full">
                    <div className="min-w-[700px]">
                      <StudentAttendanceTable
                        records={studentHistory.attendanceRecords}
                        isLoading={isLoadingHistory}
                      />
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="space-y-3">
                    {studentHistory.attendanceRecords.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                          No attendance records found for the selected date
                          range
                        </CardContent>
                      </Card>
                    ) : (
                      studentHistory.attendanceRecords.map((record) => (
                        <StudentAttendanceCard
                          key={record.id}
                          record={record}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
