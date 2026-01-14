"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  Activity,
  School,
  ClipboardList,
  Calendar,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AdminStats {
  courses: {
    total: number;
    active: number;
    inactive: number;
    completed: number;
  };
  teachers: {
    total: number;
    headTeachers: number;
    additionalTeachers: number;
    withCourse: number;
  };
  classes: {
    total: number;
    totalCapacity: number;
    totalStudents: number;
    utilizationRate: number;
  };
  students: {
    total: number;
    withSessions: number;
    recentRegistrations: number;
  };
}

export function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");

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

  const utilizationColor =
    stats.classes.utilizationRate >= 80
      ? "text-green-600"
      : stats.classes.utilizationRate >= 60
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <Badge
            variant="outline"
            className="hidden sm:flex items-center gap-1"
          >
            <Activity className="h-3 w-3" />
            Live
          </Badge>
        </div>
        <p className="text-muted-foreground">
          System overview and management controls
        </p>
      </div>

      {/* Mobile Quick Actions - Only visible on small screens */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <Button
          size="lg"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => router.push("/admin/courses")}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-medium">Courses</span>
        </Button>
        <Button
          size="lg"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => router.push("/admin/teachers")}
        >
          <Users className="h-5 w-5" />
          <span className="text-xs font-medium">Teachers</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => router.push("/admin/attendance")}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs font-medium">Attendance</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => router.push("/admin/settings")}
        >
          <Settings className="h-5 w-5" />
          <span className="text-xs font-medium">Settings</span>
        </Button>
      </div>

      {/* Overview Cards - 2 columns on mobile, 4 on larger screens */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Overview
          </h2>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/admin/courses")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.courses.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600 font-medium">
                  {stats.courses.active}
                </span>{" "}
                active
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/admin/teachers")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teachers.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-blue-600 font-medium">
                  {stats.teachers.headTeachers}
                </span>{" "}
                head teachers
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.classes.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={`font-medium ${utilizationColor}`}>
                  {stats.classes.utilizationRate}%
                </span>{" "}
                capacity
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.students.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600 font-medium">
                  +{stats.students.recentRegistrations}
                </span>{" "}
                this week
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Detailed Stats Section - 2 columns on mobile, 3 on larger screens */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Course Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Course Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">
                  {stats.courses.active}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.courses.total > 0
                    ? Math.round(
                        (stats.courses.active / stats.courses.total) * 100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm">Inactive</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-yellow-600">
                  {stats.courses.inactive}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.courses.total > 0
                    ? Math.round(
                        (stats.courses.inactive / stats.courses.total) * 100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-500" />
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-600">
                  {stats.courses.completed}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.courses.total > 0
                    ? Math.round(
                        (stats.courses.completed / stats.courses.total) * 100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <Separator />

            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/courses")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Manage Courses
            </Button>
          </CardContent>
        </Card>

        {/* Teacher Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Teacher Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Head Teachers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  {stats.teachers.headTeachers}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Additional Teachers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-purple-600">
                  {stats.teachers.additionalTeachers}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-sm">Assigned to Course</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">
                  {stats.teachers.withCourse}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.teachers.total > 0
                    ? Math.round(
                        (stats.teachers.withCourse / stats.teachers.total) *
                          100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <Separator />

            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/teachers")}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Teachers
            </Button>
          </CardContent>
        </Card>

        {/* Class & Student Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4 text-primary" />
              Capacity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Capacity</span>
                <span className="font-semibold">
                  {stats.classes.totalCapacity}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Enrolled Students</span>
                <span className="font-semibold">
                  {stats.classes.totalStudents}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available Seats</span>
                <span className="font-semibold">
                  {stats.classes.totalCapacity - stats.classes.totalStudents}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Utilization Rate</span>
                <span className={`text-xl font-bold ${utilizationColor}`}>
                  {stats.classes.utilizationRate}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    stats.classes.utilizationRate >= 80
                      ? "bg-green-600"
                      : stats.classes.utilizationRate >= 60
                        ? "bg-yellow-600"
                        : "bg-red-600"
                  }`}
                  style={{ width: `${stats.classes.utilizationRate}%` }}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">
                  Recent Registrations
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Last 7 days
                </span>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                  +{stats.students.recentRegistrations}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Hidden on mobile (shown in quick actions instead) */}
      <div className="hidden sm:grid gap-4 grid-cols-1 md:grid-cols-3 pt-4">
        <Button
          size="lg"
          className="h-auto py-6"
          onClick={() => router.push("/admin/courses")}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Manage Courses</div>
              <div className="text-xs opacity-90">Create and edit courses</div>
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-auto py-6"
          onClick={() => router.push("/admin/teachers")}
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Manage Teachers</div>
              <div className="text-xs opacity-90">Add and assign teachers</div>
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-auto py-6"
          onClick={() => router.push("/admin/attendance")}
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">View Attendance</div>
              <div className="text-xs opacity-90">Track student attendance</div>
            </div>
          </div>
        </Button>
      </div>

      {/* Students with Sessions Info */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Students with Sessions</p>
                <p className="text-xs text-muted-foreground">
                  Enrolled in weekend classes
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {stats.students.withSessions}
              </div>
              <div className="text-xs text-muted-foreground">
                of {stats.students.total} total
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
