"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  QrCode,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRightLeft,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useStudentSchedule,
  useCurrentSession,
  useAttendanceHistory,
} from "@/store/student/schedule-store";
import { useQRCode } from "@/store/student/qr-store";
import { useReassignmentRequests } from "@/store/student/reassignment-store";
import { formatTimeForDisplay } from "@/lib/validations";
import { ReassignmentRequestModal } from "./ReassignmentRequestModal";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";

export function StudentDashboard() {
  const {
    schedule,
    isLoading: isLoadingSchedule,
    loadSchedule,
  } = useStudentSchedule();
  const { sessionInfo, canGenerateQR, isSessionTime, refreshSessionInfo } =
    useCurrentSession();
  const {
    stats,
    isLoading: isLoadingHistory,
    loadHistory,
  } = useAttendanceHistory();
  const { dataUrl, isGenerating, generateQRCode, clearQRCode } = useQRCode();
  const { loadRequests } = useReassignmentRequests();

  const [showQR, setShowQR] = useState(false);
  const [showReassignmentModal, setShowReassignmentModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    loadSchedule();
    loadHistory();
    loadRequests();
  }, [loadSchedule, loadHistory, loadRequests]);

  // Refresh session info periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSessionInfo();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [refreshSessionInfo]);

  const handleGenerateQR = async () => {
    if (!schedule) return;

    const qrData = {
      uuid: crypto.randomUUID(),
      student_id: schedule.student.id,
      timestamp: Date.now(),
    };

    await generateQRCode(qrData);
    setShowQR(true);
  };

  const handleCloseQR = () => {
    setShowQR(false);
    clearQRCode();
  };

  if (isLoadingSchedule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Schedule Found</h2>
          <p className="text-muted-foreground">
            You are not currently enrolled in any classes. Please contact your
            teacher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {schedule.student.firstName}!
          </h1>
          <p className="text-muted-foreground">
            Student Number: {schedule.student.studentNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChangePasswordModal(true)}
          >
            <Lock className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        </div>
      </div>

      {/* QR Code Generation Section */}
      {showQR && dataUrl ? (
        <Card className="border-2 border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Your Attendance QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <img
              src={dataUrl}
              alt="Attendance QR Code"
              className="w-64 h-64 mb-4"
            />
            <p className="text-sm text-muted-foreground mb-4">
              Show this code to your teacher to mark your attendance
            </p>
            <Button variant="outline" onClick={handleCloseQR}>
              Close
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className={canGenerateQR ? "border-2 border-blue-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Attendance QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canGenerateQR ? (
              <div className="text-center">
                <p className="text-green-600 font-medium mb-4">
                  {isSessionTime
                    ? "Your class is in session!"
                    : "Your class starts soon!"}
                </p>
                <Button
                  size="lg"
                  onClick={handleGenerateQR}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-5 w-5" />
                      Generate QR Code
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>QR code generation is only available</p>
                <p>30 minutes before and during your class sessions.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Course & Class Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course</CardTitle>
            <Badge variant="secondary">{schedule.course.status}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedule.course.name}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedule.class.name}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Capacity: {schedule.class.capacity} students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Sessions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReassignmentModal(true)}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Request Reassignment
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {schedule.saturdaySession ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saturday</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {formatTimeForDisplay(schedule.saturdaySession.startTime)} -{" "}
                  {formatTimeForDisplay(schedule.saturdaySession.endTime)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Capacity: {schedule.saturdaySession.capacity} students
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="opacity-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saturday</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No session scheduled</p>
              </CardContent>
            </Card>
          )}

          {schedule.sundaySession ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sunday</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {formatTimeForDisplay(schedule.sundaySession.startTime)} -{" "}
                  {formatTimeForDisplay(schedule.sundaySession.endTime)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Capacity: {schedule.sundaySession.capacity} students
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="opacity-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sunday</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">No session scheduled</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Attendance Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Attendance Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Attendance Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.attendanceRate >= 80
                    ? "text-green-600"
                    : stats.attendanceRate >= 60
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {stats.attendanceRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sessions
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attended</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.attendedSessions}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.missedSessions}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ReassignmentRequestModal
        open={showReassignmentModal}
        onOpenChange={setShowReassignmentModal}
      />
      <ChangePasswordModal
        open={showChangePasswordModal}
        onOpenChange={setShowChangePasswordModal}
      />
    </div>
  );
}
