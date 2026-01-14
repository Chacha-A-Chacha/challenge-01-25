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
  Activity,
  Sparkles,
  UserCheck,
  ClipboardList,
  AlertCircle,
  Settings,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "INACTIVE":
        return "secondary";
      case "COMPLETED":
        return "outline";
      default:
        return "secondary";
    }
  };

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

  const utilizationColor =
    stats.classes.utilizationRate >= 80
      ? "text-green-600"
      : stats.classes.utilizationRate >= 60
        ? "text-yellow-600"
        : "text-red-600";

  const hasPendingItems =
    stats.registrations.pending > 0 || stats.reassignments.pending > 0;

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
                variant={getStatusBadgeVariant(stats.course.status)}
                className={getStatusColor(stats.course.status)}
              >
                {stats.course.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Head Teacher Dashboard
            </p>
          </div>
          {hasPendingItems && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 w-fit"
            >
              <AlertCircle className="h-3 w-3" />
              {stats.registrations.pending + stats.reassignments.pending}{" "}
              Pending
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-muted-foreground pt-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span className="font-medium">Started:</span>{" "}
            {new Date(stats.course.createdAt).toLocaleDateString()}
          </div>
          {stats.course.endDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium">End Date:</span>{" "}
              {new Date(stats.course.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Quick Actions - Only visible on small screens */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <Button
          size="lg"
          className="h-auto py-4 flex flex-col gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => router.push("/teacher/teachers")}
        >
          <Users className="h-5 w-5" />
          <span className="text-xs font-medium">Teachers</span>
        </Button>
        <Button
          size="lg"
          className="h-auto py-4 flex flex-col gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => router.push("/teacher/classes")}
        >
          <School className="h-5 w-5" />
          <span className="text-xs font-medium">Classes</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/students")}
        >
          <GraduationCap className="h-5 w-5" />
          <span className="text-xs font-medium">Students</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2 relative border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/registrations")}
        >
          <CheckCircle className="h-5 w-5" />
          <span className="text-xs font-medium">Registrations</span>
          {stats.registrations.pending > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {stats.registrations.pending}
            </Badge>
          )}
        </Button>
      </div>

      {/* Overview Cards - 2 columns on mobile, 4 on larger screens */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Course Overview
          </h2>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/teacher/teachers")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teachers.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-blue-600 font-medium">
                  {stats.teachers.additional}
                </span>{" "}
                additional
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/teacher/classes")}
          >
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
                  +{stats.students.recentRegistrations}
                </span>{" "}
                this week
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
        </div>
      </div>

      <Separator className="my-6" />

      {/* Detailed Stats Section - 2 columns on mobile, 3 on larger screens */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Teacher Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Teacher Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm">You (Head Teacher)</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Additional Teachers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-purple-600">
                  {stats.teachers.additional}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Team Size</div>
              <div className="text-2xl font-bold">{stats.teachers.total}</div>
              <p className="text-xs text-muted-foreground">
                Total teaching staff
              </p>
            </div>

            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => router.push("/teacher/teachers")}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Teachers
            </Button>
          </CardContent>
        </Card>

        {/* Class & Capacity Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4 text-emerald-600" />
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

            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => router.push("/teacher/classes")}
            >
              <School className="h-4 w-4 mr-2" />
              Manage Classes
            </Button>
          </CardContent>
        </Card>

        {/* Sessions Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Session Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm">Saturday Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  {stats.sessions.saturday}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.sessions.total > 0
                    ? Math.round(
                        (stats.sessions.saturday / stats.sessions.total) * 100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-sm">Sunday Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-purple-600">
                  {stats.sessions.sunday}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {stats.sessions.total > 0
                    ? Math.round(
                        (stats.sessions.sunday / stats.sessions.total) * 100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Total Sessions
              </div>
              <div className="text-2xl font-bold">{stats.sessions.total}</div>
              <p className="text-xs text-muted-foreground">
                Across all classes
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">
                  Students with Sessions
                </span>
              </div>
              <div className="text-xl font-bold">
                {stats.students.withSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                of {stats.students.total} enrolled
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items - Registrations & Reassignments */}
      {hasPendingItems && (
        <>
          <Separator className="my-6" />
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold">Action Required</h2>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {/* Registrations */}
              {stats.registrations.pending > 0 && (
                <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-orange-600" />
                      Pending Registrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Awaiting Review
                      </span>
                      <Badge variant="destructive" className="text-lg px-3">
                        {stats.registrations.pending}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.registrations.approvedThisWeek} approved this week
                    </p>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => router.push("/teacher/registrations")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Review Registrations
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Reassignments */}
              {stats.reassignments.pending > 0 && (
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
              )}
            </div>
          </div>
        </>
      )}

      {/* Info Cards for Approved Items */}
      {!hasPendingItems && (
        <>
          <Separator className="my-6" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Approved This Week</p>
                      <p className="text-xs text-muted-foreground">
                        Student registrations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      {stats.registrations.approvedThisWeek}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950">
                      <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Reassignments</p>
                      <p className="text-xs text-muted-foreground">
                        All time requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.reassignments.total}
                    </div>
                  </div>
                </div>
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
          onClick={() => router.push("/teacher/teachers")}
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Teachers</div>
              <div className="text-xs opacity-90">Manage team</div>
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-auto py-6 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/classes")}
        >
          <div className="flex items-center gap-3">
            <School className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Classes</div>
              <div className="text-xs opacity-90">Manage classes</div>
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
          className="h-auto py-6 relative border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => router.push("/teacher/registrations")}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Registrations</div>
              <div className="text-xs opacity-90">Review requests</div>
            </div>
          </div>
          {stats.registrations.pending > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center"
            >
              {stats.registrations.pending}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
