"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth/auth-store";
import { HeadTeacherDashboard } from "./HeadTeacherDashboard";
import { TEACHER_ROLES } from "@/types";
import {
  Users,
  School,
  Calendar,
  GraduationCap,
  Clock,
  CheckCircle,
  Activity,
  Sparkles,
  BookOpen,
  ClipboardList,
  TrendingUp,
  UserCheck,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AdditionalTeacherStats {
  course: {
    name: string;
    status: string;
    headTeacher: string;
  };
  assignedClasses: {
    total: number;
    saturday: number;
    sunday: number;
  };
  sessions: {
    total: number;
    saturday: number;
    sunday: number;
  };
  students: {
    total: number;
    withSessions: number;
    activeToday: number;
  };
  schedule: {
    nextSession: {
      day: string;
      time: string;
      className: string;
    } | null;
    thisWeek: number;
  };
  reassignments: {
    pending: number;
    total: number;
  };
}

function AdditionalTeacherDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdditionalTeacherStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/teacher/additional-stats");

        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setStats(result.data);
        } else {
          throw new Error(result.error || "Failed to load stats");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600";
      case "INACTIVE":
        return "text-yellow-600";
      case "COMPLETED":
        return "text-gray-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {stats.course.name}
              </h1>
              <Badge
                variant="outline"
                className={getStatusColor(stats.course.status)}
              >
                {stats.course.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Additional Teacher Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 w-fit"
            >
              <Activity className="h-3 w-3" />
              Active
            </Badge>
            {stats.reassignments.pending > 0 && (
              <Badge
                variant="destructive"
                className="flex items-center gap-1 w-fit"
              >
                <ArrowRightLeft className="h-3 w-3" />
                {stats.reassignments.pending} Pending
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground pt-2">
          <UserCheck className="h-3 w-3" />
          <span className="font-medium">Head Teacher:</span>{" "}
          {stats.course.headTeacher}
        </div>
      </div>

      {/* Mobile Quick Actions - Only visible on small screens */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <Button
          size="lg"
          className="h-auto py-4 flex flex-col gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => router.push("/teacher/classes")}
        >
          <School className="h-5 w-5" />
          <span className="text-xs font-medium">My Classes</span>
        </Button>
        <Button
          size="lg"
          className="h-auto py-4 flex flex-col gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => router.push("/teacher/students")}
        >
          <GraduationCap className="h-5 w-5" />
          <span className="text-xs font-medium">Students</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/attendance")}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs font-medium">Attendance</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 relative border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/reassignments")}
        >
          <ArrowRightLeft className="h-5 w-5" />
          <span className="text-xs font-medium">Reassignments</span>
          {stats.reassignments.pending > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {stats.reassignments.pending}
            </Badge>
          )}
        </Button>
      </div>

      {/* Next Session Alert - If there's an upcoming session */}
      {stats.schedule.nextSession && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Next Session
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.schedule.nextSession.day} at{" "}
                    {stats.schedule.nextSession.time}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium">
                  {stats.schedule.nextSession.className}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.schedule.thisWeek} sessions this week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards - 2 columns on mobile, 4 on larger screens */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Teaching Overview
          </h2>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/teacher/classes")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Classes</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.assignedClasses.total}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">
                  {stats.assignedClasses.saturday}
                </span>{" "}
                Sat /{" "}
                <span className="font-medium">
                  {stats.assignedClasses.sunday}
                </span>{" "}
                Sun
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sessions.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">{stats.sessions.saturday}</span>{" "}
                Sat /{" "}
                <span className="font-medium">{stats.sessions.sunday}</span> Sun
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/teacher/students")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.students.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600 font-medium">
                  {stats.students.withSessions}
                </span>{" "}
                enrolled
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.schedule.thisWeek}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upcoming sessions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Detailed Stats Section - 2 columns on mobile, 3 on larger screens */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Class Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4 text-emerald-600" />
              Class Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm">Saturday Classes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  {stats.assignedClasses.saturday}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.assignedClasses.total > 0
                    ? Math.round(
                        (stats.assignedClasses.saturday /
                          stats.assignedClasses.total) *
                          100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-sm">Sunday Classes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-purple-600">
                  {stats.assignedClasses.sunday}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.assignedClasses.total > 0
                    ? Math.round(
                        (stats.assignedClasses.sunday /
                          stats.assignedClasses.total) *
                          100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Total Assigned
              </div>
              <div className="text-2xl font-bold">
                {stats.assignedClasses.total}
              </div>
              <p className="text-xs text-muted-foreground">Classes</p>
            </div>

            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => router.push("/teacher/classes")}
            >
              <School className="h-4 w-4 mr-2" />
              View My Classes
            </Button>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Session Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Sessions</span>
                <span className="font-semibold">{stats.sessions.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Saturday</span>
                <span className="font-semibold">{stats.sessions.saturday}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sunday</span>
                <span className="font-semibold">{stats.sessions.sunday}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Week</span>
                <span className="text-xl font-bold text-blue-600">
                  {stats.schedule.thisWeek}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled sessions
              </p>
            </div>

            <Separator />

            {stats.schedule.nextSession && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Next Session</span>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">
                    {stats.schedule.nextSession.day}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.schedule.nextSession.time} -{" "}
                    {stats.schedule.nextSession.className}
                  </p>
                </div>
              </div>
            )}

            {!stats.schedule.nextSession && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No upcoming sessions scheduled
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Total Students</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  {stats.students.total}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">With Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">
                  {stats.students.withSessions}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.students.total > 0
                    ? Math.round(
                        (stats.students.withSessions / stats.students.total) *
                          100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Active Today</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-orange-600">
                  {stats.students.activeToday}
                </span>
              </div>
            </div>

            <Separator />

            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => router.push("/teacher/students")}
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              View All Students
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reassignment Section */}
      {stats.reassignments.pending > 0 && (
        <>
          <Separator className="my-6" />
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold">Action Required</h2>
            </div>
            <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-orange-600" />
                  Pending Reassignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Awaiting Review
                  </span>
                  <Badge variant="destructive" className="text-lg px-3">
                    {stats.reassignments.pending}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.reassignments.total} total requests received
                </p>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => router.push("/teacher/reassignments")}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Review Reassignments
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Action Buttons - Hidden on mobile (shown in quick actions instead) */}
      <div className="hidden sm:grid gap-4 grid-cols-1 md:grid-cols-4 pt-4">
        <Button
          size="lg"
          className="h-auto py-6 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => router.push("/teacher/classes")}
        >
          <div className="flex items-center gap-3">
            <School className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">My Classes</div>
              <div className="text-xs opacity-90">View classes</div>
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-auto py-6 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/students")}
        >
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Students</div>
              <div className="text-xs opacity-90">Manage students</div>
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-auto py-6 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/attendance")}
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Attendance</div>
              <div className="text-xs opacity-90">Track attendance</div>
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-auto py-6 relative border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/reassignments")}
        >
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Reassignments</div>
              <div className="text-xs opacity-90">Review requests</div>
            </div>
          </div>
          {stats.reassignments.pending > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center"
            >
              {stats.reassignments.pending}
            </Badge>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-emerald-100">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Course Information</p>
              <p className="text-xs text-muted-foreground">
                You are assisting in{" "}
                <span className="font-semibold">{stats.course.name}</span>
              </p>
            </div>
            <Badge
              variant="outline"
              className={getStatusColor(stats.course.status)}
            >
              {stats.course.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TeacherDashboard() {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  // Check if head teacher
  const isHeadTeacher = user.teacherRole === TEACHER_ROLES.HEAD;

  if (isHeadTeacher) {
    return <HeadTeacherDashboard />;
  }

  // Additional teacher dashboard
  return <AdditionalTeacherDashboard />;
}
