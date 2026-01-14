import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, Users, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassAttendanceStats } from "@/types";

interface ClassAttendanceCardProps {
  classData: ClassAttendanceStats;
  onClick?: () => void;
}

export function ClassAttendanceCard({
  classData,
  onClick,
}: ClassAttendanceCardProps) {
  const getAttendanceVariant = (rate: number) => {
    if (rate >= 80) return "success";
    if (rate >= 60) return "warning";
    return "danger";
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const variant = getAttendanceVariant(classData.attendanceRate);

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Class Name and Attendance Rate */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <School className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <h3 className="font-semibold text-base truncate">
                  {classData.className}
                </h3>
              </div>
            </div>
            <Badge
              variant={
                variant === "success"
                  ? "default"
                  : variant === "warning"
                    ? "secondary"
                    : "destructive"
              }
              className={cn("flex-shrink-0", getAttendanceColor(classData.attendanceRate))}
            >
              {classData.attendanceRate}%
            </Badge>
          </div>

          {/* Primary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Users className="h-3.5 w-3.5" />
                <span>Students</span>
              </div>
              <p className="text-2xl font-bold">{classData.totalStudents}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>Sessions</span>
              </div>
              <p className="text-2xl font-bold">{classData.totalSessionsCount}</p>
            </div>
          </div>

          {/* Session Split */}
          <div className="flex items-center justify-between text-sm py-2 border-t">
            <span className="text-muted-foreground">Sat / Sun Sessions</span>
            <span className="font-medium">
              {classData.saturdaySessionsCount} / {classData.sundaySessionsCount}
            </span>
          </div>

          {/* Attendance Breakdown */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Present</span>
              <span className="font-semibold text-green-600">
                {classData.presentCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Absent</span>
              <span className="font-semibold text-red-600">
                {classData.absentCount}
              </span>
            </div>
            {classData.wrongSessionCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wrong Session</span>
                <span className="font-semibold text-orange-600">
                  {classData.wrongSessionCount}
                </span>
              </div>
            )}
          </div>

          {/* Last Recorded */}
          {classData.lastRecordedDate && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Last recorded</span>
              <span>
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
