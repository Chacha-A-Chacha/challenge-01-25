"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TeacherWithCourse } from "@/types";

interface RemoveTeacherModalProps {
  teacher: TeacherWithCourse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isRemoving: boolean;
}

export function RemoveTeacherModal({
  teacher,
  open,
  onOpenChange,
  onConfirm,
  isRemoving,
}: RemoveTeacherModalProps) {
  if (!teacher) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Teacher</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this teacher from your course?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Teacher Email
            </p>
            <p className="font-medium">{teacher.email}</p>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This teacher will lose access to the course immediately. They will
              no longer be able to view classes, students, or attendance
              records.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? "Removing..." : "Remove Teacher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
