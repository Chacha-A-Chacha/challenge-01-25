"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TeacherWithCourse } from "@/types";
import { TEACHER_ROLES } from "@/types";
import { formatTimeForDisplay } from "@/lib/validations";

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
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTeacherDisplayName()}</DialogTitle>
          <DialogDescription>
            {isHeadTeacher ? "Head Teacher" : "Additional Teacher"} details and
            course assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Teacher Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Information</h4>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{getTeacherDisplayName()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{teacher.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Role</span>
                <Badge variant={isHeadTeacher ? "default" : "secondary"}>
                  {isHeadTeacher ? "Head Teacher" : "Additional Teacher"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">
                  {new Date(teacher.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Course Info */}
          {course ? (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Course Assignment</h4>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course Name</span>
                  <span className="font-medium">{course.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      course.status === "ACTIVE"
                        ? "default"
                        : course.status === "INACTIVE"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {course.status}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              This teacher is not currently assigned to any course.
            </div>
          )}

          {/* Classes (only for head teachers) */}
          {isHeadTeacher && teacher.headCourse?.classes && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Classes</h4>
                  <span className="text-sm text-muted-foreground">
                    {teacher.headCourse.classes.length} total
                  </span>
                </div>

                {teacher.headCourse.classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No classes created yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teacher.headCourse.classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {cls.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {cls.students?.length || 0}/{cls.capacity}
                          </Badge>
                        </div>

                        {cls.sessions && cls.sessions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {cls.sessions.map((session) => (
                              <div
                                key={session.id}
                                className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
                              >
                                <span className="font-medium">
                                  {session.day.slice(0, 3)}
                                </span>
                                <span>
                                  {formatTimeForDisplay(session.startTime)} -{" "}
                                  {formatTimeForDisplay(session.endTime)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
