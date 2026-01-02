"use client";

import { Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTimeForDisplay } from "@/lib/validations";
import type { Session } from "@/types";

interface UpcomingSessionsProps {
  saturdaySession?: Session;
  sundaySession?: Session;
}

function getNextSessionDate(
  day: "SATURDAY" | "SUNDAY",
  session?: Session,
): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const targetDay = day === "SATURDAY" ? 6 : 0;

  let daysUntilSession = targetDay - currentDay;

  if (daysUntilSession < 0) {
    daysUntilSession += 7;
  } else if (daysUntilSession === 0 && session) {
    // If it's today, check if session time has passed
    const now = new Date();
    const [hours, minutes] = session.startTime.split(":").map(Number);
    const sessionStart = new Date(today);
    sessionStart.setHours(hours, minutes, 0, 0);

    // If session hasn't started yet, it's today (0 days)
    // If session has passed, next one is in 7 days
    if (now >= sessionStart) {
      daysUntilSession = 7;
    }
  }

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntilSession);
  return nextDate;
}

function formatSessionDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateStr = date.toDateString();
  const todayStr = today.toDateString();
  const tomorrowStr = tomorrow.toDateString();

  if (dateStr === todayStr) {
    return "Today";
  } else if (dateStr === tomorrowStr) {
    return "Tomorrow";
  } else {
    const daysUntil = Math.floor(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil < 7) {
      return `This ${date.toLocaleDateString("en-US", { weekday: "long" })}`;
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  }
}

export function UpcomingSessions({
  saturdaySession,
  sundaySession,
}: UpcomingSessionsProps) {
  const hasSessions = saturdaySession || sundaySession;

  if (!hasSessions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No sessions scheduled
          </p>
        </CardContent>
      </Card>
    );
  }

  const sessions = [
    saturdaySession
      ? { session: saturdaySession, day: "SATURDAY" as const }
      : null,
    sundaySession ? { session: sundaySession, day: "SUNDAY" as const } : null,
  ].filter(
    (s): s is { session: Session; day: "SATURDAY" | "SUNDAY" } => s !== null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Upcoming Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map(({ session, day }) => {
          const nextDate = getNextSessionDate(day, session);
          const dateLabel = formatSessionDate(nextDate);
          const isToday = dateLabel === "Today";
          const isTomorrow = dateLabel === "Tomorrow";

          return (
            <div
              key={session.id}
              className={`p-4 rounded-lg border-2 transition-colors ${
                isToday
                  ? "border-blue-500 bg-blue-50"
                  : isTomorrow
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar
                    className={`h-4 w-4 ${
                      isToday
                        ? "text-blue-600"
                        : isTomorrow
                          ? "text-purple-600"
                          : "text-gray-600"
                    }`}
                  />
                  <span className="font-semibold text-sm">{dateLabel}</span>
                </div>
                <Badge
                  variant={day === "SATURDAY" ? "default" : "secondary"}
                  className={
                    day === "SATURDAY" ? "bg-blue-600" : "bg-purple-600"
                  }
                >
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {formatTimeForDisplay(session.startTime)} -{" "}
                  {formatTimeForDisplay(session.endTime)}
                </span>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Capacity: {session.capacity} students
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
