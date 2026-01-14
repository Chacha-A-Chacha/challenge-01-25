"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { CourseOverviewDashboard } from "@/components/teacher/attendance/analytics/CourseOverviewDashboard";
import { ClassBreakdownTable } from "@/components/teacher/attendance/analytics/ClassBreakdownTable";
import { SessionHistoryTable } from "@/components/teacher/attendance/analytics/SessionHistoryTable";
import { StudentTrackerView } from "@/components/teacher/attendance/analytics/StudentTrackerView";
import { TeacherExportButton } from "@/components/teacher/attendance/analytics/TeacherExportButton";
import { useCourseOverview } from "@/store/teacher/attendance-analytics-store";

export default function AttendanceReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const { dateRange } = useCourseOverview();

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/teacher/attendance")}
            className="gap-2 self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Button>
          <div className="w-full sm:w-auto">
            <TeacherExportButton
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Attendance Reports & Analytics
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View and analyze attendance data for your course
          </p>
        </div>
      </div>

      {/* Tabs - Mobile Optimized with Horizontal Scroll */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full min-w-[400px] sm:min-w-0 sm:max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-xs sm:text-sm">
              Classes
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm">
              Sessions
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs sm:text-sm">
              Students
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Course Overview */}
        <TabsContent value="overview" className="space-y-6">
          <CourseOverviewDashboard />
        </TabsContent>

        {/* Tab 2: Class Breakdown */}
        <TabsContent value="classes" className="space-y-6">
          <ClassBreakdownTable />
        </TabsContent>

        {/* Tab 3: Session History */}
        <TabsContent value="sessions" className="space-y-6">
          <SessionHistoryTable />
        </TabsContent>

        {/* Tab 4: Student Tracker */}
        <TabsContent value="students" className="space-y-6">
          <StudentTrackerView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
