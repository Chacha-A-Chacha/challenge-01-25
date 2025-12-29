"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock } from "lucide-react";
import { formatTimeForDisplay } from "@/lib/validations";
import type { CourseWithDetails } from "@/types";

interface ClassesSectionProps {
  course: CourseWithDetails;
}

export function ClassesSection({ course }: ClassesSectionProps) {
  const classes = course.classes || [];
  const totalSessions = classes.reduce(
    (sum, cls) => sum + (cls.sessions?.length || 0),
    0,
  );

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Classes & Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <School className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No classes have been created for this course yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Classes & Sessions</CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {classes.length} Class{classes.length !== 1 ? "es" : ""}
            </span>
            <span>
              {totalSessions} Session{totalSessions !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg">{classItem.name}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Capacity: {classItem.capacity}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {classItem.sessions?.length || 0} Session
                        {classItem.sessions?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {classItem.sessions && classItem.sessions.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Sessions:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {classItem.sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center gap-2 rounded-lg border p-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  session.day === "SATURDAY"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {session.day}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Capacity: {session.capacity}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatTimeForDisplay(session.startTime)} -{" "}
                              {formatTimeForDisplay(session.endTime)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function School({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
