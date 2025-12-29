"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserMinus } from "lucide-react";
import type { TeacherWithCourse } from "@/types";

interface DeactivateTeacherModalProps {
  teacher: TeacherWithCourse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isDeactivating: boolean;
}

export function DeactivateTeacherModal({
  teacher,
  open,
  onOpenChange,
  onConfirm,
  isDeactivating,
}: DeactivateTeacherModalProps) {
  if (!teacher) return null;

  const teacherName = `${teacher.firstName} ${teacher.lastName}`;
  const courseName = teacher.course?.name || teacher.headCourse?.name;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Deactivate Teacher
          </DialogTitle>
          <DialogDescription>
            This will remove the teacher from their assigned course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{teacherName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{teacher.email}</span>
              </div>
              {courseName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{courseName}</span>
                </div>
              )}
            </div>
          </div>

          <Alert>
            <AlertDescription>
              The teacher will lose access to the course and will no longer be
              able to view classes, students, or attendance records.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeactivating}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeactivating}
          >
            {isDeactivating && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
