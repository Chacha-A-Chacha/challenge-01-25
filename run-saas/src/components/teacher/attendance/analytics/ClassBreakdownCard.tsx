"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";

interface ClassBreakdownCardProps {
  classData: {
    classId: string;
    className: string;
    totalStudents: number;
    totalSessions: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    wrongSessionCount: number;
    lastRecordedDate: string | null;
  };
}

export function ClassBreakdownCard({ classData }: ClassBreakdownCardProps) {
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
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-lg">{classData.className}</h3>
            </div>
          </div>

          {/* Stats Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Students</p>
              <p className="text-xl font-bold text-emerald-600">
                {classData.totalStudents}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-xl font-bold text-emerald-600">
                {classData.totalSessions}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-xl font-bold text-green-600">
                {classData.presentCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-xl font-bold text-red-600">
                {classData.absentCount}
              </p>
            </div>
          </div>

          {/* Wrong Session Count */}
          {classData.wrongSessionCount > 0 && (
            <div className="flex items-center justify-between text-sm bg-orange-50 dark:bg-orange-950/20 p-2 rounded">
              <span className="text-muted-foreground">Wrong Session</span>
              <span className="font-medium text-orange-600">
                {classData.wrongSessionCount}
              </span>
            </div>
          )}

          {/* Attendance Rate Badge - Full Width */}
          <div className="pt-2 border-t">
            {getAttendanceRateBadge(classData.attendanceRate)}
          </div>

          {/* Last Recorded */}
          {classData.lastRecordedDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Last recorded:{" "}
                {new Date(classData.lastRecordedDate).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
