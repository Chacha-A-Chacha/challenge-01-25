"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useClassActions } from "@/store/teacher/class-store";

interface ClassItem {
  id: string;
  name: string;
  students?: { id: string }[];
  _count?: {
    students: number;
  };
}

interface DeleteClassDialogProps {
  open: boolean;
  onClose: () => void;
  classItem: ClassItem;
}

export function DeleteClassDialog({
  open,
  onClose,
  classItem,
}: DeleteClassDialogProps) {
  const { deleteClass, error, clearErrors } = useClassActions();
  const [isDeleting, setIsDeleting] = useState(false);

  const studentCount =
    classItem._count?.students || classItem.students?.length || 0;
  const canDelete = studentCount === 0;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    clearErrors();

    const result = await deleteClass(classItem.id);
    setIsDeleting(false);

    if (result) {
      onClose();
    }
  };

  const handleClose = () => {
    clearErrors();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Class
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{classItem.name}&quot;? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!canDelete && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cannot delete this class because it has {studentCount} student
                {studentCount !== 1 ? "s" : ""} enrolled. Please reassign all
                students to another class first.
              </AlertDescription>
            </Alert>
          )}

          {canDelete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will also delete all sessions associated with this class.
              </AlertDescription>
            </Alert>
          )}
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
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
