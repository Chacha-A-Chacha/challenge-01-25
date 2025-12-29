"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeForDisplay } from "@/lib/validations";

interface StudentData {
  id: string;
  uuid: string;
  studentNumber: string;
  surname: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phoneNumber?: string | null;
  createdAt: string;
  class?: { id: string; name: string; courseId: string } | null;
  saturdaySession?: {
    id: string;
    startTime: string;
    endTime: string;
    capacity: number;
  } | null;
  sundaySession?: {
    id: string;
    startTime: string;
    endTime: string;
    capacity: number;
  } | null;
  attendances?: Array<{
    id: string;
    date: string;
    status: string;
    session?: { day: string } | null;
  }>;
}

export default function StudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await fetch(`/api/teacher/students/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch student details");
        }

        const result = await response.json();

        if (result.success && result.data) {
          setStudent(result.data);
        } else {
          throw new Error(result.error || "Failed to load student");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Student not found"}</p>
          <Button onClick={() => router.push("/teacher/students")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </div>
      </div>
    );
  }

  const fullName = [student.surname, student.firstName, student.lastName]
    .filter(Boolean)
    .join(" ");

  const hasAllSessions = student.saturdaySession && student.sundaySession;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/teacher/students")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
            <p className="text-muted-foreground">
              Student Number: {student.studentNumber}
            </p>
          </div>
        </div>
        <Badge variant={hasAllSessions ? "success" : "warning"}>
          {hasAllSessions ? "Fully Assigned" : "Missing Sessions"}
        </Badge>
      </div>

      {/* Student Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email
              </p>
              <p className="mt-1">{student.email}</p>
            </div>
            {student.phoneNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone Number
                </p>
                <p className="mt-1">{student.phoneNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Registered
              </p>
              <p className="mt-1">
                {new Date(student.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class & Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Class & Session Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Class
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <p className="font-medium">
                {student.class?.name || "Not assigned"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Saturday Session */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge>Saturday</Badge>
                {student.saturdaySession ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              {student.saturdaySession ? (
                <p className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTimeForDisplay(
                    student.saturdaySession.startTime,
                  )} - {formatTimeForDisplay(student.saturdaySession.endTime)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not assigned</p>
              )}
            </div>

            {/* Sunday Session */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge>Sunday</Badge>
                {student.sundaySession ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              {student.sundaySession ? (
                <p className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTimeForDisplay(student.sundaySession.startTime)} -{" "}
                  {formatTimeForDisplay(student.sundaySession.endTime)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not assigned</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Attendance (if available) */}
      {student.attendances && student.attendances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {student.attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {attendance.session?.day || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(attendance.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      attendance.status === "PRESENT"
                        ? "success"
                        : "destructive"
                    }
                  >
                    {attendance.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
