"use client";

import { useState } from "react";
import {
  Users,
  Calendar,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
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
import { CreateSessionModal } from "./CreateSessionModal";
import { SessionCard } from "./SessionCard";
import type { Session } from "@/types";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);

  const studentCount = classItem._count?.students || classItem.students?.length || 0;
  const sessionCount = classItem._count?.sessions || classItem.sessions?.length || 0;
  const utilizationRate =
    classItem.capacity > 0
      ? Math.round((studentCount / classItem.capacity) * 100)
      : 0;

  const saturdaySessions = classItem.sessions?.filter(
    (s) => s.day === "SATURDAY"
  ) || [];
  const sundaySessions = classItem.sessions?.filter(
    (s) => s.day === "SUNDAY"
  ) || [];

  const getUtilizationColor = () => {
    if (utilizationRate >= 90) return "text-red-600";
    if (utilizationRate >= 70) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{classItem.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={getUtilizationColor()}>
                  {utilizationRate}% Full
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {studentCount} / {classItem.capacity} students
                </span>
              </div>
            </div>
            {isHeadTeacher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{studentCount} Students</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{sessionCount} Sessions</span>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-sm">
              {isExpanded ? "Hide Sessions" : "View Sessions"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {/* Expanded Sessions View */}
          {isExpanded && (
            <div className="space-y-4 pt-2 border-t">
              {/* Saturday Sessions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Saturday Sessions
                  </h4>
                  {isHeadTeacher && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateSessionModal(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
                {saturdaySessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">
                    No Saturday sessions
                  </p>
                ) : (
                  <div className="space-y-2">
                    {saturdaySessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isHeadTeacher={isHeadTeacher}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sunday Sessions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Sunday Sessions
                  </h4>
                </div>
                {sundaySessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">
                    No Sunday sessions
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sundaySessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isHeadTeacher={isHeadTeacher}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
      <CreateSessionModal
        open={showCreateSessionModal}
        onClose={() => setShowCreateSessionModal(false)}
        classId={classItem.id}
        existingSessions={classItem.sessions}
      />
    </>
  );
}
