"use client";

import { useState } from "react";
import { Clock, Users, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useClassSessions } from "@/store/teacher/class-store";
import { formatTimeForDisplay } from "@/lib/validations";
import type { Session } from "@/types";

interface SessionCardProps {
  session: Session;
  isHeadTeacher: boolean;
}

export function SessionCard({ session, isHeadTeacher }: SessionCardProps) {
  const { deleteSession, isLoading } = useClassSessions();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const startTime = formatTimeForDisplay(session.startTime);
  const endTime = formatTimeForDisplay(session.endTime);

  // Get student count if available
  const studentCount =
    (
      session as Session & {
        _count?: { saturdayStudents?: number; sundayStudents?: number };
      }
    )._count?.saturdayStudents ||
    (
      session as Session & {
        _count?: { saturdayStudents?: number; sundayStudents?: number };
      }
    )._count?.sundayStudents ||
    0;

  const canDelete = studentCount === 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteSession(session.id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">
              {startTime} - {endTime}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Capacity: {session.capacity}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {session.day}
          </Badge>
          {isHeadTeacher && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading || !canDelete}
              title={
                canDelete
                  ? "Delete session"
                  : "Cannot delete session with assigned students"
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {session.day.toLowerCase()}{" "}
              session ({startTime} - {endTime})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
