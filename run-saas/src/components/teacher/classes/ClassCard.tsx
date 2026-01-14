"use client";

import { useState } from "react";
import {
  Users,
  Calendar,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditClassModal } from "./EditClassModal";
import { DeleteClassDialog } from "./DeleteClassDialog";
import { SessionsSheet } from "./SessionsSheet";
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

interface ClassCardProps {
  classItem: ClassWithDetails;
  isHeadTeacher: boolean;
}

export function ClassCard({ classItem, isHeadTeacher }: ClassCardProps) {
  const [showSessionsSheet, setShowSessionsSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">
                {classItem.name}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={getUtilizationColor()}>
                  {utilizationRate}% Full
                </Badge>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {studentCount} / {classItem.capacity} students
                </span>
              </div>
            </div>
            {isHeadTeacher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Class
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
                    disabled={studentCount > 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Class
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="truncate">{studentCount} Students</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">{sessionCount} Sessions</span>
            </div>
          </div>

          {/* Session Breakdown */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Sat:{" "}
                {classItem.sessions?.filter((s) => s.day === "SATURDAY")
                  .length || 0}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Sun:{" "}
                {classItem.sessions?.filter((s) => s.day === "SUNDAY").length ||
                  0}
              </span>
            </div>
          </div>

          {/* View Sessions Button */}
          <Button
            variant="outline"
            className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setShowSessionsSheet(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Sessions
          </Button>
        </CardContent>
      </Card>

      {/* Sessions Sheet */}
      <SessionsSheet
        open={showSessionsSheet}
        onOpenChange={setShowSessionsSheet}
        classItem={classItem}
        isHeadTeacher={isHeadTeacher}
      />

      {/* Modals */}
      <EditClassModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        classItem={classItem}
      />
      <DeleteClassDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        classItem={classItem}
      />
    </>
  );
}
