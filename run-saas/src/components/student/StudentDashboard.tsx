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
  Mail,
  Phone,
  School,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useStudentSchedule,
  useCurrentSession,
  useAttendanceHistory,
} from "@/store/student/schedule-store";
import { useQRCode } from "@/store/student/qr-store";
import { useReassignmentRequests } from "@/store/student/reassignment-store";
import { formatTimeForDisplay } from "@/lib/validations";
import { ReassignmentRequestModal } from "./ReassignmentRequestModal";

export function StudentDashboard() {
  const {
    schedule,
    isLoading: isLoadingSchedule,
    loadSchedule,
  } = useStudentSchedule();
  const { canGenerateQR, isSessionTime, refreshSessionInfo } =
    useCurrentSession();
  const {
    stats,
    isLoading: isLoadingHistory,
    loadHistory,
  } = useAttendanceHistory();
  const { dataUrl, isGenerating, generateQRCode, clearQRCode } = useQRCode();
  const { requests, loadRequests } = useReassignmentRequests();

  const [showQR, setShowQR] = useState(false);
  const [showReassignmentModal, setShowReassignmentModal] = useState(false);

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

  // Calculate remaining reassignment requests
  const pendingRequests = requests.filter(
    (r) => r.status === "PENDING" || r.status === "APPROVED",
  ).length;
  const remainingRequests = Math.max(0, 3 - pendingRequests);

  // Get student initials for avatar
  const getInitials = () => {
    if (!schedule?.student) return "ST";
    const first = schedule.student.firstName?.charAt(0) || "";
    const last =
      schedule.student.lastName?.charAt(0) ||
      schedule.student.surname?.charAt(0) ||
      "";
    return `${first}${last}`.toUpperCase() || "ST";
  };

  // Format full name
  const getFullName = () => {
    if (!schedule?.student) return "";
    const { firstName, lastName, surname } = schedule.student;
    if (lastName) {
      return `${firstName} ${lastName}`;
    }
    return `${firstName} ${surname}`;
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
    <div className="w-full">
      {/* Max-width container for large screens */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section - Profile Banner with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-white/20 shadow-lg">
                <AvatarImage
                  src={schedule.student.photoUrl || undefined}
                  alt={getFullName()}
                />
                <AvatarFallback className="bg-white/10 backdrop-blur-sm text-white text-3xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {getFullName()}
                  </h1>
                </div>
                <p className="text-blue-100 text-lg mb-4">
                  {schedule.student.studentNumber}
                </p>

                {/* Contact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-blue-100">
                    <Mail className="h-4 w-4" />
                    <span>{schedule.student.email}</span>
                  </div>
                  {schedule.student.phoneNumber && (
                    <div className="flex items-center gap-2 text-blue-100">
                      <Phone className="h-4 w-4" />
                      <span>{schedule.student.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-blue-100">
                    <School className="h-4 w-4" />
                    <span>{schedule.class.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-100">
                    <BookOpen className="h-4 w-4" />
                    <span>{schedule.course.name}</span>
                    <Badge
                      variant="secondary"
                      className="ml-1 bg-white/20 text-white border-0"
                    >
                      {schedule.course.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {showQR && dataUrl ? (
              <Card className="border-2 border-green-500 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="bg-green-50 p-4 rounded-xl mb-4">
                    <img
                      src={dataUrl}
                      alt="Attendance QR Code"
                      className="w-56 h-56"
                    />
                  </div>
                  <p className="text-center text-muted-foreground mb-4">
                    Show this code to your teacher to mark your attendance
                  </p>
                  <Button variant="outline" onClick={handleCloseQR} size="lg">
                    Close
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card
                className={
                  canGenerateQR
                    ? "border-2 border-blue-500 bg-blue-50/50 shadow-lg"
                    : "bg-gray-50"
                }
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  {canGenerateQR ? (
                    <>
                      <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <QrCode className="h-16 w-16 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-blue-900 mb-2">
                        {isSessionTime
                          ? "Class is in Session!"
                          : "Class Starts Soon!"}
                      </h3>
                      <p className="text-muted-foreground mb-6 text-center">
                        Generate your QR code to mark your attendance
                      </p>
                      <Button
                        size="lg"
                        onClick={handleGenerateQR}
                        disabled={isGenerating}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12"
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
                    </>
                  ) : (
                    <>
                      <div className="w-32 h-32 bg-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Clock className="h-16 w-16 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        QR Code Unavailable
                      </h3>
                      <p className="text-muted-foreground text-center max-w-sm">
                        Available 30 minutes before and during your class
                        sessions
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Stats Sidebar */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 opacity-80" />
                <span className="text-sm opacity-90">Attendance Rate</span>
              </div>
              <div className="text-4xl font-bold mb-1">
                {stats.attendanceRate.toFixed(0)}%
              </div>
              <div className="text-sm opacity-90">
                {stats.attendedSessions} of {stats.totalSessions} sessions
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
                <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {stats.attendedSessions}
                </div>
                <div className="text-xs text-muted-foreground">Attended</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow border border-gray-200">
                <XCircle className="h-5 w-5 text-red-600 mb-2" />
                <div className="text-2xl font-bold text-red-600">
                  {stats.missedSessions}
                </div>
                <div className="text-xs text-muted-foreground">Missed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Schedule - Less Card-Heavy */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Weekend Sessions
              </h2>
              <p className="text-muted-foreground">
                Your class schedule for this week
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowReassignmentModal(true)}
              className="gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Request Change
              <Badge variant="secondary" className="ml-1">
                {remainingRequests}
              </Badge>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Saturday Session */}
            {schedule.saturdaySession ? (
              <div className="bg-white border-2 border-blue-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="h-5 w-5" />
                    <h3 className="text-xl font-bold">SATURDAY</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatTimeForDisplay(
                          schedule.saturdaySession.startTime,
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Until{" "}
                        {formatTimeForDisplay(schedule.saturdaySession.endTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Capacity
                    </span>
                    <span className="font-semibold">
                      {schedule.saturdaySession.capacity} students
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600 mb-1">SATURDAY</h3>
                <p className="text-sm text-muted-foreground">
                  No session scheduled
                </p>
              </div>
            )}

            {/* Sunday Session */}
            {schedule.sundaySession ? (
              <div className="bg-white border-2 border-indigo-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="h-5 w-5" />
                    <h3 className="text-xl font-bold">SUNDAY</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatTimeForDisplay(schedule.sundaySession.startTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Until{" "}
                        {formatTimeForDisplay(schedule.sundaySession.endTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Capacity
                    </span>
                    <span className="font-semibold">
                      {schedule.sundaySession.capacity} students
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-600 mb-1">SUNDAY</h3>
                <p className="text-sm text-muted-foreground">
                  No session scheduled
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reassignment Modal */}
      <ReassignmentRequestModal
        open={showReassignmentModal}
        onOpenChange={setShowReassignmentModal}
      />
    </div>
  );
}
