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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useSessionHistory,
  useClassBreakdown,
} from "@/store/teacher/attendance-analytics-store";
import { DateRangePicker } from "@/components/admin/attendance/DateRangePicker";
import { formatTimeForDisplay } from "@/lib/validations";

export function SessionHistoryTable() {
  const {
    sessionHistory,
    isLoadingHistory,
    dateRange,
    selectedClassFilter,
    selectedDayFilter,
    loadSessionHistory,
    setClassFilter,
    setDayFilter,
  } = useSessionHistory();

  const { classBreakdown, loadClassBreakdown } = useClassBreakdown();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      loadClassBreakdown(dateRange.startDate, dateRange.endDate);
      loadSessionHistory(dateRange.startDate, dateRange.endDate);
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    loadSessionHistory(
      startDate,
      endDate,
      selectedClassFilter || undefined,
      selectedDayFilter || undefined,
    );
    loadClassBreakdown(startDate, endDate);
  };

  const handleClassFilterChange = (value: string) => {
    const classId = value === "all" ? null : value;
    setClassFilter(classId);
    loadSessionHistory(
      dateRange.startDate,
      dateRange.endDate,
      classId || undefined,
      selectedDayFilter || undefined,
    );
  };

  const handleDayFilterChange = (value: string) => {
    const day = value === "all" ? null : (value as "SATURDAY" | "SUNDAY");
    setDayFilter(day);
    loadSessionHistory(
      dateRange.startDate,
      dateRange.endDate,
      selectedClassFilter || undefined,
      day || undefined,
    );
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
      {/* Header and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Session History</h3>
            <p className="text-sm text-muted-foreground">
              Past attendance sessions
            </p>
          </div>
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label>Filter by Class</Label>
            <Select
              value={selectedClassFilter || "all"}
              onValueChange={handleClassFilterChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classBreakdown.map((cls) => (
                  <SelectItem key={cls.classId} value={cls.classId}>
                    {cls.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <Label>Filter by Day</Label>
            <Select
              value={selectedDayFilter || "all"}
              onValueChange={handleDayFilterChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="SATURDAY">Saturday</SelectItem>
                <SelectItem value="SUNDAY">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoadingHistory ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">
            Loading session history...
          </div>
        </div>
      ) : sessionHistory.length === 0 ? (
        <div className="flex items-center justify-center h-64 border rounded-lg">
          <div className="text-center">
            <p className="text-muted-foreground">No sessions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or date range
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Date & Day</TableHead>
                <TableHead>Class & Time</TableHead>
                <TableHead className="text-center w-[80px]">Students</TableHead>
                <TableHead className="text-center w-[100px]">Rate</TableHead>
                <TableHead className="text-center w-[70px]">Present</TableHead>
                <TableHead className="text-center w-[70px]">Absent</TableHead>
                <TableHead className="text-center w-[70px]">Wrong</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionHistory.map((session, index) => (
                <TableRow key={`${session.sessionId}-${session.date}-${index}`}>
                  <TableCell className="py-3">
                    <div className="font-medium text-sm">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.day}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="text-sm font-medium">
                      {session.className}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeForDisplay(session.startTime)} -{" "}
                      {formatTimeForDisplay(session.endTime)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-3 text-sm">
                    {session.totalStudents}
                  </TableCell>
                  <TableCell className="text-center py-3">
                    {getAttendanceRateBadge(session.attendanceRate)}
                  </TableCell>
                  <TableCell className="text-center py-3 text-sm text-green-600 font-medium">
                    {session.presentCount}
                  </TableCell>
                  <TableCell className="text-center py-3 text-sm text-red-600 font-medium">
                    {session.absentCount}
                  </TableCell>
                  <TableCell className="text-center py-3 text-sm text-orange-600 font-medium">
                    {session.wrongSessionCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
