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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/teacher/attendance")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attendance
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Attendance Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              View and analyze attendance data for your course
            </p>
          </div>
        </div>
        <TeacherExportButton
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

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
