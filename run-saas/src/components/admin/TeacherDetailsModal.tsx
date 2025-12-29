"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeacherWithCourse } from "@/types";
import { TEACHER_ROLES } from "@/types";
import { formatTime } from "@/lib/utils";

interface TeacherDetailsModalProps {
  teacher: TeacherWithCourse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherDetailsModal({
  teacher,
  open,
  onOpenChange,
}: TeacherDetailsModalProps) {
  if (!teacher) return null;

  const isHeadTeacher = teacher.role === TEACHER_ROLES.HEAD;
  const course = isHeadTeacher ? teacher.headCourse : teacher.course;

  const getTeacherDisplayName = () => {
    return `${teacher.firstName} ${teacher.lastName}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTeacherDisplayName()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Teacher Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p className="mt-1">{getTeacherDisplayName()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="mt-1">{teacher.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Role
                </p>
                <div className="mt-1">
                  <Badge variant={isHeadTeacher ? "success" : "default"}>
                    {isHeadTeacher ? "Head Teacher" : "Additional Teacher"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Joined
                </p>
                <p className="mt-1">
                  {new Date(teacher.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Course Info */}
          {course && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Course Name
                  </p>
                  <p className="mt-1 font-medium">{course.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    <Badge
                      variant={
                        course.status === "ACTIVE"
                          ? "success"
                          : course.status === "INACTIVE"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {course.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Classes (only for head teachers) */}
          {isHeadTeacher && teacher.headCourse?.classes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Classes ({teacher.headCourse.classes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teacher.headCourse.classes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No classes created yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teacher.headCourse.classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{cls.name}</h4>
                          <Badge variant="outline">
                            {cls.students?.length || 0}/{cls.capacity} Students
                          </Badge>
                        </div>

                        {/* Sessions */}
                        {cls.sessions && cls.sessions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Sessions
                            </p>
                            <div className="space-y-2">
                              {cls.sessions.map((session) => (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded p-2"
                                >
                                  <span className="font-medium">
                                    {session.day}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {new Date(
                                      session.startTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    -{" "}
                                    {new Date(
                                      session.endTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {session.capacity} seats
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No course assignment */}
          {!course && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>This teacher is not currently assigned to any course.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
