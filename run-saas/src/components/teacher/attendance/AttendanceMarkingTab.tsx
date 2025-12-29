"use client";

import { useState } from "react";
import { QrCode, Search, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQRScanner } from "@/hooks/teacher/useQRScanner";
import { useSessionAttendance } from "@/store/teacher/attendance-store";
import { toast } from "sonner";
import type { AttendanceStatus } from "@/types";

interface AttendanceMarkingTabProps {
  sessionId: string;
  isLoading: boolean;
}

export function AttendanceMarkingTab({
  sessionId,
  isLoading,
}: AttendanceMarkingTabProps) {
  const { sessionData } = useSessionAttendance();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMarkingManual, setIsMarkingManual] = useState(false);

  const {
    isScanning,
    videoRef,
    startScanning,
    stopScanning,
    canScan,
    error: scannerError,
  } = useQRScanner({
    sessionId,
    onScanSuccess: (result) => {
      toast.success("Attendance marked successfully");
    },
    onScanError: (error) => {
      toast.error(error);
    },
  });

  // Get attendance records - each record contains student info
  const attendanceRecords = sessionData?.attendanceRecords || [];

  // Create attendance map
  const attendanceMap = new Map(
    attendanceRecords.map((record) => [record.studentId, record]),
  );

  // Build students list from attendance records for manual marking
  const students = attendanceRecords.map((record) => ({
    id: record.studentId,
    name: record.studentName || "Unknown",
    studentNumber: record.studentNumber || "",
  }));

  // Filter students for manual marking
  const filteredStudents = students.filter((student) => {
    return (
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleManualMark = async (
    studentId: string,
    status: AttendanceStatus,
  ) => {
    if (!sessionId) return;

    setIsMarkingManual(true);

    try {
      const response = await fetch("/api/attendance/scan/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sessionId,
          status,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Marked ${result.data.studentName} as ${status.toLowerCase()}`,
        );
        // Reload to update the list
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to mark attendance");
      }
    } catch (error) {
      toast.error("Failed to mark attendance");
    } finally {
      setIsMarkingManual(false);
    }
  };

  const getStatusBadge = (studentId: string) => {
    const attendance = attendanceMap.get(studentId);
    if (!attendance) return null;

    const statusColors = {
      PRESENT:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      ABSENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      WRONG_SESSION:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    };

    return (
      <Badge className={`${statusColors[attendance.status]} text-xs`}>
        {attendance.status === "PRESENT" && "Present"}
        {attendance.status === "ABSENT" && "Absent"}
        {attendance.status === "WRONG_SESSION" && "Wrong Session"}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground text-sm sm:text-base">
            Please select a session to mark attendance
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* QR Code Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white p-4">
                  <QrCode className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">
                    Click Start Scan to begin
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Scanner Controls */}
          <div className="space-y-3">
            {scannerError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                  {scannerError}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {!isScanning ? (
                <Button
                  onClick={startScanning}
                  disabled={!canScan}
                  className="flex-1"
                  size="lg"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Start Scan
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  Stop Scan
                </Button>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Instructions:</strong> Students should scan their QR
                code. The system will automatically mark them present or
                identify if they&apos;re in the wrong session.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Marking Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Manual Marking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Student List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No students found
                </p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const hasAttendance = attendanceMap.has(student.id);

                return (
                  <div
                    key={student.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {student.name}
                        </p>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                          {student.studentNumber}
                        </code>
                      </div>
                      {getStatusBadge(student.id)}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualMark(student.id, "PRESENT")}
                        disabled={isMarkingManual || hasAttendance}
                        className="text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualMark(student.id, "ABSENT")}
                        disabled={isMarkingManual || hasAttendance}
                        className="text-xs border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <UserX className="h-3 w-3 mr-1" />
                        Absent
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Attendance cannot be edited once marked.
              Please verify before marking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
