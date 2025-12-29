"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  School,
  Calendar,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HeadTeacherStats {
  course: {
    name: string;
    status: string;
    endDate: Date | null;
    createdAt: Date;
  };
  teachers: {
    total: number;
    additional: number;
  };
  classes: {
    total: number;
    totalCapacity: number;
    totalStudents: number;
    utilizationRate: number;
  };
  sessions: {
    total: number;
    saturday: number;
    sunday: number;
  };
  students: {
    total: number;
    withSessions: number;
    recentRegistrations: number;
  };
  registrations: {
    pending: number;
    approvedThisWeek: number;
  };
  reassignments: {
    pending: number;
    total: number;
  };
}

export function HeadTeacherDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<HeadTeacherStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/teacher/stats");

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "success";
      case "INACTIVE":
        return "warning";
      case "COMPLETED":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Course Info */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {stats.course.name}
            </h1>
            <p className="text-muted-foreground">Head Teacher Dashboard</p>
          </div>
          <Badge variant={getStatusBadgeVariant(stats.course.status)}>
            {stats.course.status}
          </Badge>
        </div>
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Started:</span>{" "}
            {new Date(stats.course.createdAt).toLocaleDateString()}
          </div>
          {stats.course.endDate && (
            <div>
              <span className="font-medium">End Date:</span>{" "}
              {new Date(stats.course.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Button
          className="h-20"
          onClick={() => router.push("/teacher/teachers")}
        >
          <Users className="mr-2 h-5 w-5" />
          Manage Teachers
        </Button>
        <Button
          className="h-20"
          onClick={() => router.push("/teacher/classes")}
          variant="outline"
        >
          <School className="mr-2 h-5 w-5" />
          Manage Classes
        </Button>
        <Button
          className="h-20"
          onClick={() => router.push("/teacher/students")}
          variant="outline"
        >
          <GraduationCap className="mr-2 h-5 w-5" />
          Manage Students
        </Button>
        <Button
          className="h-20"
          onClick={() => router.push("/teacher/registrations")}
          variant="outline"
        >
          <CheckCircle className="mr-2 h-5 w-5" />
          Registrations
          {stats.registrations.pending > 0 && (
            <Badge className="ml-2" variant="destructive">
              {stats.registrations.pending}
            </Badge>
          )}
        </Button>
      </div>

      {/* Teachers & Classes Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Teachers */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Teachers</h2>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Teachers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.teachers.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Including you (Head Teacher)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Additional Teachers
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.teachers.additional}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Classes */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Classes</h2>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Classes
                </CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.classes.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Class Utilization
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.classes.utilizationRate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.classes.totalStudents} / {stats.classes.totalCapacity}{" "}
                  students
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sessions & Students Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sessions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Sessions</h2>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sessions
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.sessions.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Saturday / Sunday
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.sessions.saturday} / {stats.sessions.sunday}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Students */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Students</h2>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Students
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.students.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recent Registrations
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.students.recentRegistrations}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Registrations & Reassignments */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Registrations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Student Registrations</h2>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Approval
                </CardTitle>
                <BookOpen className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.registrations.pending}
                </div>
                {stats.registrations.pending > 0 && (
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => router.push("/teacher/registrations")}
                  >
                    Review Now
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Approved This Week
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.registrations.approvedThisWeek}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reassignments */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Session Reassignments</h2>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Review
                </CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.reassignments.pending}
                </div>
                {stats.reassignments.pending > 0 && (
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => router.push("/teacher/reassignments")}
                  >
                    Review Now
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Requests
                </CardTitle>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.reassignments.total}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
