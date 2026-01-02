"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

interface ContributionGraphProps {
  attendanceData: Array<{
    date: string;
    status: AttendanceStatus;
  }>;
}

interface WeekData {
  saturday: {
    date: Date;
    status: AttendanceStatus | null;
  } | null;
  sunday: {
    date: Date;
    status: AttendanceStatus | null;
  } | null;
}

export function ContributionGraph({ attendanceData }: ContributionGraphProps) {
  // Get last 12 weeks of data
  const getWeeksData = (): WeekData[] => {
    const weeks: WeekData[] = [];
    const today = new Date();

    // Start from 12 weeks ago
    for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (weekOffset * 7));

      // Find Saturday and Sunday of this week
      const currentDay = weekStart.getDay();

      // Calculate days to Saturday (6) and Sunday (0)
      const daysToSaturday = (6 - currentDay + 7) % 7;
      const daysToSunday = (7 - currentDay) % 7;

      const saturday = new Date(weekStart);
      saturday.setDate(weekStart.getDate() + daysToSaturday);
      saturday.setHours(0, 0, 0, 0);

      const sunday = new Date(weekStart);
      sunday.setDate(weekStart.getDate() + daysToSunday);
      sunday.setHours(0, 0, 0, 0);

      // Only include if date is in the past or today
      const saturdayData = saturday <= today ? {
        date: saturday,
        status: findAttendanceStatus(saturday, attendanceData),
      } : null;

      const sundayData = sunday <= today ? {
        date: sunday,
        status: findAttendanceStatus(sunday, attendanceData),
      } : null;

      weeks.push({
        saturday: saturdayData,
        sunday: sundayData,
      });
    }

    return weeks;
  };

  const findAttendanceStatus = (
    date: Date,
    data: Array<{ date: string; status: AttendanceStatus }>
  ): AttendanceStatus | null => {
    const dateString = date.toISOString().split('T')[0];
    const record = data.find(a => a.date.startsWith(dateString));
    return record?.status || null;
  };

  const getStatusColor = (status: AttendanceStatus | null): string => {
    if (!status) return "bg-gray-200 hover:bg-gray-300";

    switch (status) {
      case "PRESENT":
        return "bg-green-500 hover:bg-green-600";
      case "ABSENT":
        return "bg-gray-400 hover:bg-gray-500";
      case "WRONG_SESSION":
        return "bg-yellow-500 hover:bg-yellow-600";
      default:
        return "bg-gray-200 hover:bg-gray-300";
    }
  };

  const getStatusLabel = (status: AttendanceStatus | null): string => {
    if (!status) return "No record";

    switch (status) {
      case "PRESENT":
        return "Present";
      case "ABSENT":
        return "Absent";
      case "WRONG_SESSION":
        return "Wrong Session";
      default:
        return "Unknown";
    }
  };

  const weeks = getWeeksData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📈</span>
          Attendance History (Last 12 Weeks)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs pb-2 border-b">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-muted-foreground">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-400"></div>
              <span className="text-muted-foreground">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span className="text-muted-foreground">Wrong Session</span>
            </div>
          </div>

          {/* Graph */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Day labels */}
              <div className="flex items-center gap-1 mb-2">
                <div className="w-16 text-xs text-muted-foreground"></div>
                <div className="flex-1 grid grid-cols-12 gap-1">
                  {weeks.map((_, index) => (
                    <div key={index} className="text-xs text-center text-muted-foreground">
                      W{index + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Saturday row */}
              <div className="flex items-center gap-1 mb-1">
                <div className="w-16 text-xs text-muted-foreground font-medium">
                  Saturday
                </div>
                <div className="flex-1 grid grid-cols-12 gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex justify-center">
                      {week.saturday ? (
                        <div
                          className={cn(
                            "w-6 h-6 rounded transition-colors cursor-pointer",
                            getStatusColor(week.saturday.status)
                          )}
                          title={`${week.saturday.date.toLocaleDateString()}: ${getStatusLabel(week.saturday.status)}`}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sunday row */}
              <div className="flex items-center gap-1">
                <div className="w-16 text-xs text-muted-foreground font-medium">
                  Sunday
                </div>
                <div className="flex-1 grid grid-cols-12 gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex justify-center">
                      {week.sunday ? (
                        <div
                          className={cn(
                            "w-6 h-6 rounded transition-colors cursor-pointer",
                            getStatusColor(week.sunday.status)
                          )}
                          title={`${week.sunday.date.toLocaleDateString()}: ${getStatusLabel(week.sunday.status)}`}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t text-xs text-muted-foreground text-center">
            Showing attendance records for the last 12 weeks (Saturdays and Sundays only)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
