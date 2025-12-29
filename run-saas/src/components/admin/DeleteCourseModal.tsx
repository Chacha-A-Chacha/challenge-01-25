"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import type { CourseWithDetails } from "@/types";

interface DeleteCourseModalProps {
  course: CourseWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteCourseModal({
  course,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteCourseModalProps) {
  const [confirmText, setConfirmText] = useState("");

  if (!course) return null;

  const hasClasses = (course._count?.classes || 0) > 0;
  const hasTeachers = (course._count?.teachers || 0) > 0;
  const canDelete = !hasClasses && confirmText === course.name;

  const getHeadTeacherName = () => {
    return `${course.headTeacher.firstName} ${course.headTeacher.lastName}`;
  };

  const handleConfirm = async () => {
    if (canDelete) {
      await onConfirm();
      setConfirmText("");
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false);
      setConfirmText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Course
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            course and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasClasses && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cannot delete course with existing classes. Please remove all
                classes first.
              </AlertDescription>
            </Alert>
          )}

          {!hasClasses && hasTeachers && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This course has {course._count?.teachers} teacher(s). They will
                be unassigned.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course</span>
                <span className="font-medium">{course.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Head Teacher</span>
                <span className="font-medium">{getHeadTeacherName()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classes</span>
                <span className="font-medium">
                  {course._count?.classes || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teachers</span>
                <span className="font-medium">
                  {course._count?.teachers || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <code className="bg-muted px-1 rounded">{course.name}</code>{" "}
              to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={course.name}
              disabled={isDeleting || hasClasses}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
