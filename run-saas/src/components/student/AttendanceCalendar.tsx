"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

interface AttendanceDayData {
  date: Date;
  status: AttendanceStatus | null;
  isWeekend: boolean;
}

interface AttendanceCalendarProps {
  attendanceData: Array<{
    date: string;
    status: AttendanceStatus;
  }>;
}

export function AttendanceCalendar({ attendanceData }: AttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthData = (): AttendanceDayData[][] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const monthLength = lastDay.getDate();

    const weeks: AttendanceDayData[][] = [];
    let week: AttendanceDayData[] = [];

    // Fill in the blanks before the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -(startingDayOfWeek - i - 1));
      week.push({
        date: prevDate,
        status: null,
        isWeekend: false,
      });
    }

    // Fill in the days of the month
    for (let day = 1; day <= monthLength; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

      // Find attendance status for this date
      const dateString = date.toISOString().split('T')[0];
      const attendance = attendanceData.find(a =>
        a.date.startsWith(dateString)
      );

      week.push({
        date,
        status: attendance?.status || null,
        isWeekend,
      });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    // Fill in the remaining days
    if (week.length > 0) {
      while (week.length < 7) {
        const nextDate = new Date(year, month + 1, week.length - lastDay.getDay());
        week.push({
          date: nextDate,
          status: null,
          isWeekend: false,
        });
      }
      weeks.push(week);
    }

    return weeks;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getStatusColor = (status: AttendanceStatus | null, isWeekend: boolean) => {
    if (!isWeekend) return "bg-gray-100 text-gray-400";
    if (!status) return "bg-gray-50 border-2 border-dashed border-gray-300";

    switch (status) {
      case "PRESENT":
        return "bg-green-500 text-white";
      case "ABSENT":
        return "bg-gray-300 text-gray-700";
      case "WRONG_SESSION":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-100";
    }
  };

  const getStatusDot = (status: AttendanceStatus | null, isWeekend: boolean) => {
    if (!isWeekend || !status) return null;

    switch (status) {
      case "PRESENT":
        return <div className="w-1.5 h-1.5 bg-green-600 rounded-full absolute bottom-1 left-1/2 -translate-x-1/2" />;
      case "ABSENT":
        return <div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute bottom-1 left-1/2 -translate-x-1/2" />;
      case "WRONG_SESSION":
        return <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full absolute bottom-1 left-1/2 -translate-x-1/2" />;
      default:
        return null;
    }
  };

  const weeks = getMonthData();
  const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() &&
                         currentDate.getFullYear() === new Date().getFullYear();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-medium">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div
                key={i}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
                  const isToday = day.date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "relative aspect-square flex items-center justify-center rounded-md text-sm transition-colors",
                        getStatusColor(day.status, day.isWeekend),
                        !isCurrentMonth && "opacity-30",
                        isToday && "ring-2 ring-blue-600 ring-offset-2",
                        day.isWeekend && !day.status && "hover:bg-gray-100",
                        day.isWeekend && day.status && "font-semibold"
                      )}
                    >
                      {day.date.getDate()}
                      {getStatusDot(day.status, day.isWeekend)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-4 mt-4 border-t text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span className="text-muted-foreground">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-muted-foreground">Wrong Session</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
