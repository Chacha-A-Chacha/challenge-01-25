"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClassBreakdown } from "@/store/teacher/attendance-analytics-store";
import { DateRangePicker } from "@/components/admin/attendance/DateRangePicker";
import { ClassBreakdownCard } from "./ClassBreakdownCard";

export function ClassBreakdownTable() {
  const { classBreakdown, isLoading, dateRange, loadClassBreakdown } =
    useClassBreakdown();

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    loadClassBreakdown(dateRange.startDate, dateRange.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    loadClassBreakdown(startDate, endDate);
  };

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 80) {
      return (
        <Badge variant="default" className="bg-green-600">
          {rate}%
        </Badge>
      );
    }
    if (rate >= 60) {
      return <Badge variant="secondary">{rate}%</Badge>;
    }
    return <Badge variant="destructive">{rate}%</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header with Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Class Breakdown</h3>
          <p className="text-sm text-muted-foreground">
            Attendance statistics by class
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading class data...</div>
        </div>
      ) : classBreakdown.length === 0 ? (
        <div className="flex items-center justify-center h-64 border rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">No class data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Select a different date range
            </p>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Table View - Desktop */
        <ScrollArea className="w-full">
          <div className="min-w-[900px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="text-center">Attendance Rate</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Wrong Session</TableHead>
                  <TableHead>Last Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classBreakdown.map((cls) => (
                  <TableRow key={cls.classId}>
                    <TableCell className="font-medium">
                      {cls.className}
                    </TableCell>
                    <TableCell className="text-center">
                      {cls.totalStudents}
                    </TableCell>
                    <TableCell className="text-center">
                      {cls.totalSessions}
                    </TableCell>
                    <TableCell className="text-center">
                      {getAttendanceRateBadge(cls.attendanceRate)}
                    </TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {cls.presentCount}
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {cls.absentCount}
                    </TableCell>
                    <TableCell className="text-center text-orange-600 font-medium">
                      {cls.wrongSessionCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cls.lastRecordedDate
                        ? new Date(cls.lastRecordedDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      ) : (
        /* Card View - Mobile */
        <div className="space-y-3">
          {classBreakdown.map((cls) => (
            <ClassBreakdownCard key={cls.classId} classData={cls} />
          ))}
        </div>
      )}
    </div>
  );
}
