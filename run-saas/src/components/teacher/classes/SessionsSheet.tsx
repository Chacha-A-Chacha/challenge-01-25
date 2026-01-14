"use client";

import { useState } from "react";
import { Clock, Users, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { CreateSessionModal } from "./CreateSessionModal";
import { useClassSessions } from "@/store/teacher/class-store";
import { formatTimeForDisplay } from "@/lib/validations";
import type { Session } from "@/types";
import { cn } from "@/lib/utils";

interface ClassWithDetails {
  id: string;
  name: string;
  capacity: number;
  courseId: string;
  createdAt: Date | string;
  sessions: Session[];
  students: { id: string }[];
  _count?: {
    sessions: number;
    students: number;
  };
}

interface SessionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: ClassWithDetails;
  isHeadTeacher: boolean;
}

export function SessionsSheet({
  open,
  onOpenChange,
  classItem,
  isHeadTeacher,
}: SessionsSheetProps) {
  const { deleteSession, isLoading } = useClassSessions();
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const saturdaySessions =
    classItem.sessions?.filter((s) => s.day === "SATURDAY") || [];
  const sundaySessions =
    classItem.sessions?.filter((s) => s.day === "SUNDAY") || [];

  const handleDelete = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    await deleteSession(sessionToDelete.id);
    setIsDeleting(false);
    setSessionToDelete(null);
  };

  const SessionItem = ({ session }: { session: Session }) => {
    const startTime = formatTimeForDisplay(session.startTime);
    const endTime = formatTimeForDisplay(session.endTime);

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

    return (
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-lg border transition-colors",
          "hover:bg-muted/50",
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium text-sm">
              {startTime} - {endTime}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>Capacity: {session.capacity}</span>
            </div>
            {studentCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {studentCount} assigned
              </Badge>
            )}
          </div>
        </div>
        {isHeadTeacher && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 flex-shrink-0",
              canDelete
                ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                : "text-muted-foreground cursor-not-allowed",
            )}
            onClick={() => canDelete && setSessionToDelete(session)}
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
    );
  };

  const studentCount =
    classItem._count?.students || classItem.students?.length || 0;
  const sessionCount =
    classItem._count?.sessions || classItem.sessions?.length || 0;
  const utilizationRate =
    classItem.capacity > 0
      ? Math.round((studentCount / classItem.capacity) * 100)
      : 0;

  const getUtilizationColor = () => {
    if (utilizationRate >= 90) return "text-red-600";
    if (utilizationRate >= 70) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0"
        >
          <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 py-6 flex flex-col h-full">
            <SheetHeader className="flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl pr-8">
                    {classItem.name}
                  </SheetTitle>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Badge variant="outline" className={getUtilizationColor()}>
                      {utilizationRate}% Full
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {studentCount} / {classItem.capacity} students
                    </span>
                    <span className="text-sm text-muted-foreground">
                      • {sessionCount} sessions
                    </span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto mt-6 -mx-2 px-2">
              <div className="space-y-6">
                {/* Saturday Sessions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Saturday
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({saturdaySessions.length})
                      </span>
                    </h3>
                    {isHeadTeacher && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateSessionModal(true)}
                        className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Session
                      </Button>
                    )}
                  </div>
                  {saturdaySessions.length === 0 ? (
                    <div className="p-8 text-center border rounded-lg bg-muted/30">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No Saturday sessions yet
                      </p>
                      {isHeadTeacher && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreateSessionModal(true)}
                          className="mt-2 text-emerald-700 hover:text-emerald-800"
                        >
                          Create one now
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {saturdaySessions.map((session) => (
                        <SessionItem key={session.id} session={session} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Sunday Sessions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Sunday
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({sundaySessions.length})
                      </span>
                    </h3>
                  </div>
                  {sundaySessions.length === 0 ? (
                    <div className="p-8 text-center border rounded-lg bg-muted/30">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No Sunday sessions yet
                      </p>
                      {isHeadTeacher && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreateSessionModal(true)}
                          className="mt-2 text-emerald-700 hover:text-emerald-800"
                        >
                          Create one now
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sundaySessions.map((session) => (
                        <SessionItem key={session.id} session={session} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Session Modal */}
      <CreateSessionModal
        open={showCreateSessionModal}
        onClose={() => setShowCreateSessionModal(false)}
        classId={classItem.id}
        existingSessions={classItem.sessions}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {sessionToDelete?.day.toLowerCase()} session (
              {sessionToDelete &&
                `${formatTimeForDisplay(sessionToDelete.startTime)} - ${formatTimeForDisplay(sessionToDelete.endTime)}`}
              )? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
