"use client";

import { useEffect } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, BookOpen, AlertCircle } from "lucide-react";
import { useStudentSchedule } from "@/store/student/schedule-store";
import { formatTimeForDisplay } from "@/lib/validations";

function SchedulePage() {
  const { schedule, isLoading, loadSchedule } = useStudentSchedule();

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Schedule Found</h2>
          <p className="text-muted-foreground">
            You are not currently enrolled in any classes.
          </p>
        </div>
      </div>
    );
  }

  const getDayOfWeek = (day: string) => {
    const now = new Date();
    const currentDay = now.getDay();
    const targetDay = day === "Saturday" ? 6 : 0;

    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    return `in ${daysUntil} days`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">
          View your class schedule and session times
        </p>
      </div>

      {/* Course Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Information
            </CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {schedule.course.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Course Name
            </label>
            <p className="text-xl font-semibold mt-1">{schedule.course.name}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Class
              </label>
              <p className="text-lg font-medium mt-1">{schedule.class.name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Class Capacity
              </label>
              <p className="text-lg font-medium mt-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {schedule.class.capacity} students
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Weekly Schedule</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Saturday Session */}
          <Card className={schedule.saturdaySession ? "border-2 border-blue-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Saturday
                </span>
                {schedule.saturdaySession && (
                  <Badge className="bg-blue-600">
                    {getDayOfWeek("Saturday")}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.saturdaySession ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Time
                    </label>
                    <p className="text-2xl font-bold mt-1 text-blue-600">
                      {formatTimeForDisplay(schedule.saturdaySession.startTime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      to {formatTimeForDisplay(schedule.saturdaySession.endTime)}
                    </p>
                  </div>

                  <div className="pt-3 border-t">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Capacity
                    </label>
                    <p className="text-lg font-medium mt-1">
                      {schedule.saturdaySession.capacity} students
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No session scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sunday Session */}
          <Card className={schedule.sundaySession ? "border-2 border-purple-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Sunday
                </span>
                {schedule.sundaySession && (
                  <Badge className="bg-purple-600">
                    {getDayOfWeek("Sunday")}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedule.sundaySession ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Time
                    </label>
                    <p className="text-2xl font-bold mt-1 text-purple-600">
                      {formatTimeForDisplay(schedule.sundaySession.startTime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      to {formatTimeForDisplay(schedule.sundaySession.endTime)}
                    </p>
                  </div>

                  <div className="pt-3 border-t">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Capacity
                    </label>
                    <p className="text-lg font-medium mt-1">
                      {schedule.sundaySession.capacity} students
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No session scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Remember to generate your QR code</p>
              <p className="text-sm text-blue-700">
                QR codes can be generated 30 minutes before your class starts and during the session.
                Go to the Dashboard to generate your attendance QR code.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SchedulePageWithGuard() {
  return (
    <RoleGuard allowedRoles="student">
      <SchedulePage />
    </RoleGuard>
  );
}
