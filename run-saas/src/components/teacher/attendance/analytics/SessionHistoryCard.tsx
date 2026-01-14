"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { formatTimeForDisplay } from "@/lib/validations";

interface SessionHistoryCardProps {
  session: {
    sessionId: string;
    date: string;
    day: string;
    className: string;
    startTime: string;
    endTime: string;
    totalStudents: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    wrongSessionCount: number;
  };
}

export function SessionHistoryCard({ session }: SessionHistoryCardProps) {
  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 80) {
      return (
        <Badge variant="default" className="bg-green-600 text-white">
          {rate}% Attendance
        </Badge>
      );
    }
    if (rate >= 60) {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {rate}% Attendance
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-red-600 text-white">
        {rate}% Attendance
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header - Date and Day */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-semibold text-base">
                  {new Date(session.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">{session.day}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {session.totalStudents} students
            </Badge>
          </div>

          {/* Class Info */}
          <div className="space-y-1">
            <p className="font-medium text-base">{session.className}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {formatTimeForDisplay(session.startTime)} -{" "}
                {formatTimeForDisplay(session.endTime)}
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 py-3 border-y">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Present</p>
              <p className="text-lg font-bold text-green-600">
                {session.presentCount}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Absent</p>
              <p className="text-lg font-bold text-red-600">
                {session.absentCount}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Wrong</p>
              <p className="text-lg font-bold text-orange-600">
                {session.wrongSessionCount}
              </p>
            </div>
          </div>

          {/* Attendance Rate Badge - Full Width */}
          <div className="pt-2">
            {getAttendanceRateBadge(session.attendanceRate)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
