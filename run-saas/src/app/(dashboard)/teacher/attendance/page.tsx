"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  ClipboardList,
  QrCode,
  Users,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatTimeForDisplay } from "@/lib/validations";
import { useSessionAttendance } from "@/store/teacher/attendance-store";
import { useClassStore } from "@/store/teacher/class-store";
import { AttendanceListTab } from "@/components/teacher/attendance/AttendanceListTab";
import { AttendanceMarkingTab } from "@/components/teacher/attendance/AttendanceMarkingTab";
import Link from "next/link";

export default function AttendancePage() {
  const { sessionData, isLoading, attendanceRate, loadSession } =
    useSessionAttendance();

  const { classes, loadClasses } = useClassStore();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Auto-select first class when classes load
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Get sessions for selected class
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const sessions = selectedClass?.sessions || [];

  // Auto-select session based on current day
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

      // Filter sessions by current day
      const todaySessions = sessions.filter(
        (s) =>
          (dayOfWeek === 6 && s.day === "SATURDAY") ||
          (dayOfWeek === 0 && s.day === "SUNDAY"),
      );

      if (todaySessions.length > 0) {
        setSelectedSessionId(todaySessions[0].id);
      } else {
        // Default to first session if no match for today
        setSelectedSessionId(sessions[0].id);
      }
    }
  }, [sessions, selectedSessionId]);

  // Check if today is a weekend day
  const today = new Date();
  const dayOfWeek = today.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const isCorrectDay = selectedSession
    ? (dayOfWeek === 6 && selectedSession.day === "SATURDAY") ||
      (dayOfWeek === 0 && selectedSession.day === "SUNDAY")
    : false;

  // Load attendance when session is selected
  useEffect(() => {
    if (selectedSessionId) {
      loadSession(selectedSessionId);
    }
  }, [selectedSessionId, loadSession]);

  const stats = sessionData
    ? {
        total: sessionData.totalStudents,
        present: sessionData.presentCount,
        absent: sessionData.absentCount,
        wrongSession: sessionData.wrongSessionCount,
        rate: attendanceRate,
      }
    : {
        total: 0,
        present: 0,
        absent: 0,
        wrongSession: 0,
        rate: 0,
      };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Attendance
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Mark and manage student attendance
          </p>
        </div>
        <Link href="/teacher/attendance/reports">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </Button>
        </Link>
      </div>

      {/* Weekend Day Alert */}
      {!isCorrectDay && selectedSession && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900 dark:text-amber-100">
                {isWeekend ? "Different Session Day" : "Weekday Notice"}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                {isWeekend
                  ? `This is a ${selectedSession.day} session, but today is ${dayOfWeek === 0 ? "Sunday" : "Saturday"}. QR scanning will not work.`
                  : `Today is a weekday. This ${selectedSession.day} session is scheduled for the weekend. You can view records and manually mark attendance, but QR scanning is disabled on weekdays.`}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                ✓ Manual marking is available • ✗ QR scanning disabled
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Classes Alert */}
      {classes.length === 0 && !isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                No Classes Available
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                There are no classes with sessions set up yet. Please create
                classes and sessions first.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Wrapped in Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            Session Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class-select">Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No classes available
                    </SelectItem>
                  ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-select">Session</Label>
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
                disabled={!selectedClassId}
              >
                <SelectTrigger id="session-select">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.day} ({formatTimeForDisplay(session.startTime)} -{" "}
                      {formatTimeForDisplay(session.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-select">Date</Label>
              <input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Better Mobile Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-emerald-600" />
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-4 w-4 text-green-600" />
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {stats.present}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-red-600" />
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {stats.absent}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="h-4 w-4 text-orange-600" />
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {stats.wrongSession}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Wrong Session</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                {stats.rate}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Attendance Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="list" className="text-xs sm:text-sm py-2.5">
            <ClipboardList className="h-4 w-4 mr-2" />
            Attendance List
          </TabsTrigger>
          <TabsTrigger value="mark" className="text-xs sm:text-sm py-2.5">
            <QrCode className="h-4 w-4 mr-2" />
            Mark Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <AttendanceListTab
            sessionId={selectedSessionId}
            classId={selectedClassId}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="mark" className="mt-4">
          <AttendanceMarkingTab
            sessionId={selectedSessionId}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
