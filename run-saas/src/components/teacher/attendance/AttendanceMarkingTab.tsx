"use client";

import { useState } from "react";
import {
  QrCode,
  Search,
  UserCheck,
  UserX,
  RefreshCw,
  GraduationCap,
  Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQRScanner } from "@/hooks/teacher/useQRScanner";
import {
  useSessionAttendance,
  useAttendanceActions,
} from "@/store/teacher/attendance-store";
import { toast } from "sonner";
import type { AttendanceStatus } from "@/types";
import { ScannerOverlay } from "./ScannerOverlay";
import { cn } from "@/lib/utils";

interface AttendanceMarkingTabProps {
  sessionId: string;
  isLoading: boolean;
}

export function AttendanceMarkingTab({
  sessionId,
  isLoading,
}: AttendanceMarkingTabProps) {
  const { sessionData } = useSessionAttendance();
  const { markManual, isMarkingAttendance } = useAttendanceActions();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    isScanning,
    videoRef,
    startScanning,
    stopScanning,
    canScan,
    error: scannerError,
    scanStatus,
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

    const success = await markManual(studentId, status);

    if (success) {
      const statusText =
        status === "PRESENT"
          ? "present"
          : status === "ABSENT"
            ? "absent"
            : "wrong session";
      toast.success(`Attendance marked as ${statusText}`);
    } else {
      toast.error("Failed to mark attendance");
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
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* QR Code Scanner Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
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

              {/* Scanner Overlay with Visual Feedback */}
              <ScannerOverlay isScanning={isScanning} scanStatus={scanStatus} />

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
                    disabled={!canScan || !!scannerError}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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

              {scannerError && scannerError.includes("not supported") && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                    <strong>Alternative:</strong> Use manual marking below to
                    record attendance.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Instructions:</strong> Scan student QR codes to
                  automatically mark attendance. The system will identify if
                  they&apos;re in the wrong session.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Marking Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              Manual Marking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
              <Input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-emerald-600 focus-visible:ring-emerald-600"
              />
            </div>

            {/* Student List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No students found
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const attendance = attendanceMap.get(student.id);
                  const hasAttendance = !!attendance;
                  const currentStatus = attendance?.status;
                  const isPresentMarked = currentStatus === "PRESENT";
                  const isAbsentMarked = currentStatus === "ABSENT";

                  return (
                    <div
                      key={student.id}
                      className="border rounded-lg p-4 space-y-3 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <p className="font-medium text-sm truncate">
                              {student.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                              {student.studentNumber}
                            </code>
                          </div>
                        </div>
                        {getStatusBadge(student.id)}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant={isPresentMarked ? "default" : "outline"}
                          onClick={() =>
                            handleManualMark(student.id, "PRESENT")
                          }
                          disabled={isMarkingAttendance || isPresentMarked}
                          className={cn(
                            "text-xs h-9",
                            isPresentMarked
                              ? "bg-green-600 hover:bg-green-700"
                              : "border-green-600 text-green-700 hover:bg-green-50",
                          )}
                        >
                          {isPresentMarked ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                              Present
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                              {hasAttendance ? "Update" : "Mark"} Present
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant={isAbsentMarked ? "default" : "outline"}
                          onClick={() => handleManualMark(student.id, "ABSENT")}
                          disabled={isMarkingAttendance || isAbsentMarked}
                          className={cn(
                            "text-xs h-9",
                            isAbsentMarked
                              ? "bg-red-600 hover:bg-red-700"
                              : "border-red-600 text-red-700 hover:bg-red-50",
                          )}
                        >
                          {isAbsentMarked ? (
                            <>
                              <UserX className="h-3.5 w-3.5 mr-1.5" />
                              Absent
                            </>
                          ) : (
                            <>
                              <UserX className="h-3.5 w-3.5 mr-1.5" />
                              {hasAttendance ? "Update" : "Mark"} Absent
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                <strong>Tip:</strong> You can update attendance status anytime.
                Already marked students show their current status and can be
                updated.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
