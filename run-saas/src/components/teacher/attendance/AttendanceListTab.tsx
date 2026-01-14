"use client";

import { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GraduationCap,
  Hash,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSessionAttendance,
  useAttendanceActions,
} from "@/store/teacher/attendance-store";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { AttendanceStatus } from "@/types";
import { cn } from "@/lib/utils";

interface AttendanceListTabProps {
  sessionId: string;
  classId: string;
  isLoading: boolean;
}

export function AttendanceListTab({
  sessionId,
  classId,
  isLoading,
}: AttendanceListTabProps) {
  const { sessionData } = useSessionAttendance();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get attendance records - each record contains student info
  const attendanceRecords = sessionData?.attendanceRecords || [];

  // Build student list from attendance records
  const studentList = attendanceRecords.map((record) => ({
    id: record.studentId,
    name: record.studentName || "Unknown",
    studentNumber: record.studentNumber || "",
    email: "", // Email not included in attendance records
    status: record.status || null,
    scanTime: record.scanTime,
    attendanceId: record.id,
  }));

  // Filter students
  const filteredStudents = studentList.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "unmarked" && !student.status) ||
      student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Check if end-of-day auto-mark should be available
  const canAutoMarkAbsent = () => {
    // Only head teachers can auto-mark
    if (session?.user?.teacherRole !== "HEAD") return false;

    // Check if current time is after all sessions for the day
    // This is a simplified check - you might want more complex logic
    const now = new Date();
    const currentHour = now.getHours();

    // Assume classes end by 6 PM
    return currentHour >= 18;
  };

  const handleAutoMarkAbsent = async () => {
    if (!classId) return;

    try {
      const response = await fetch("/api/attendance/auto-mark-absent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Marked ${result.data.markedAbsent} students as absent`);
        // Reload attendance
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to auto-mark absent");
      }
    } catch (error) {
      toast.error("Failed to auto-mark absent");
    }
  };

  const getStatusBadge = (status: AttendanceStatus | null) => {
    if (!status) {
      return (
        <Badge variant="secondary" className="text-xs">
          Not Marked
        </Badge>
      );
    }

    switch (status) {
      case "PRESENT":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Present
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Absent
          </Badge>
        );
      case "WRONG_SESSION":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Wrong Session
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground text-sm sm:text-base">
            Please select a session to view attendance
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters - Wrapped in Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
              <Input
                type="text"
                placeholder="Search by name or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-emerald-600 focus-visible:ring-emerald-600"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="WRONG_SESSION">Wrong Session</SelectItem>
                <SelectItem value="unmarked">Not Marked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Auto-mark button */}
      {canAutoMarkAbsent() && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                End of Day
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                Mark all remaining students as absent
              </p>
            </div>
            <Button
              onClick={handleAutoMarkAbsent}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              Auto-Mark Absent
            </Button>
          </div>
        </div>
      )}

      {/* Student List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No students found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Name and Student Number */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <GraduationCap className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <p className="font-medium text-sm sm:text-base truncate">
                          {student.name}
                        </p>
                      </div>

                      {/* Student Number */}
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                          {student.studentNumber}
                        </code>
                      </div>

                      {/* Scan Time */}
                      {student.scanTime && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>
                            Marked at{" "}
                            {new Date(student.scanTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(student.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredStudents.length !== studentList.length && (
        <div className="text-xs sm:text-sm text-muted-foreground text-center">
          Showing {filteredStudents.length} of {studentList.length} students
        </div>
      )}
    </div>
  );
}
