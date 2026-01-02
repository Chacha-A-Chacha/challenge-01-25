"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useReassignmentOptions,
  useReassignmentActions,
} from "@/store/student/reassignment-store";
import { useStudentSchedule } from "@/store/student/schedule-store";
import { formatTimeForDisplay } from "@/lib/validations";
import type { WeekDay } from "@/types";
import { toast } from "sonner";

interface ReassignmentRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReassignmentRequestModal({
  open,
  onOpenChange,
}: ReassignmentRequestModalProps) {
  const { schedule } = useStudentSchedule();
  const { options, isLoadingOptions, getOptionsForDay, loadOptions } =
    useReassignmentOptions();
  const {
    canSubmit,
    remainingRequests,
    isSubmitting,
    submitRequest,
    error,
    clearErrors,
  } = useReassignmentActions();

  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [reason, setReason] = useState("");

  // Load options when modal opens
  useEffect(() => {
    if (open) {
      loadOptions();
      clearErrors();
    }
  }, [open, loadOptions, clearErrors]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedDay(null);
      setSelectedSessionId(null);
      setReason("");
    }
  }, [open]);

  const handleDayChange = (day: string) => {
    setSelectedDay(day as WeekDay);
    setSelectedSessionId(null); // Reset session selection when day changes
  };

  const handleSubmit = async () => {
    if (!selectedDay || !selectedSessionId || !schedule) {
      toast.error("Please select a day and session");
      return;
    }

    const fromSessionId =
      selectedDay === "SATURDAY"
        ? schedule.saturdaySession?.id
        : schedule.sundaySession?.id;

    if (!fromSessionId) {
      toast.error("Current session not found");
      return;
    }

    const success = await submitRequest(fromSessionId, selectedSessionId);

    if (success) {
      toast.success("Reassignment request submitted successfully");
      onOpenChange(false);
    } else if (error) {
      toast.error(error);
    }
  };

  if (!schedule) {
    return null;
  }

  const dayOptions = getOptionsForDay(selectedDay || "SATURDAY");
  const hasAvailableOptions =
    options.saturday.length > 0 || options.sunday.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Request Session Reassignment
          </DialogTitle>
          <DialogDescription>
            Select a different session time for the same day. You have{" "}
            {remainingRequests} request{remainingRequests !== 1 ? "s" : ""}{" "}
            remaining.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Sessions Display */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Current Sessions:
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saturday</p>
                {schedule.saturdaySession ? (
                  <p className="font-medium">
                    {formatTimeForDisplay(schedule.saturdaySession.startTime)} -{" "}
                    {formatTimeForDisplay(schedule.saturdaySession.endTime)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not scheduled</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sunday</p>
                {schedule.sundaySession ? (
                  <p className="font-medium">
                    {formatTimeForDisplay(schedule.sundaySession.startTime)} -{" "}
                    {formatTimeForDisplay(schedule.sundaySession.endTime)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not scheduled</p>
                )}
              </div>
            </div>
          </div>

          {/* Cannot submit warning */}
          {!canSubmit && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                {remainingRequests === 0
                  ? "You have reached the maximum of 3 reassignment requests."
                  : "You have a pending reassignment request. Please wait for approval or cancel it before submitting a new one."}
              </div>
            </div>
          )}

          {/* Day Selection */}
          {canSubmit && (
            <>
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Select Day to Reassign:
                </Label>
                <RadioGroup
                  value={selectedDay || ""}
                  onValueChange={handleDayChange}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {schedule.saturdaySession && (
                      <Label
                        htmlFor="saturday"
                        className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedDay === "SATURDAY"
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-200"
                        }`}
                      >
                        <RadioGroupItem value="SATURDAY" id="saturday" />
                        <span className="font-medium">Saturday</span>
                      </Label>
                    )}
                    {schedule.sundaySession && (
                      <Label
                        htmlFor="sunday"
                        className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedDay === "SUNDAY"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-purple-200"
                        }`}
                      >
                        <RadioGroupItem value="SUNDAY" id="sunday" />
                        <span className="font-medium">Sunday</span>
                      </Label>
                    )}
                  </div>
                </RadioGroup>
              </div>

              {/* Available Sessions */}
              {selectedDay && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Available Sessions (Same Class):
                  </Label>
                  {isLoadingOptions ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading available sessions...
                    </div>
                  ) : dayOptions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>
                        No other sessions available for{" "}
                        {selectedDay.toLowerCase()}
                      </p>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedSessionId || ""}
                      onValueChange={setSelectedSessionId}
                    >
                      <div className="space-y-2">
                        {dayOptions.map((option) => {
                          if (!option) return null;

                          const isFull = option.availableSpots <= 0;
                          const isCurrentSession =
                            (selectedDay === "SATURDAY" &&
                              option.id === schedule.saturdaySession?.id) ||
                            (selectedDay === "SUNDAY" &&
                              option.id === schedule.sundaySession?.id);

                          if (isCurrentSession) return null;

                          return (
                            <Label
                              key={option.id}
                              htmlFor={option.id}
                              className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedSessionId === option.id
                                  ? selectedDay === "SATURDAY"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-purple-500 bg-purple-50"
                                  : "border-gray-200 hover:border-gray-300"
                              } ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <RadioGroupItem
                                  value={option.id}
                                  id={option.id}
                                  disabled={isFull}
                                />
                                <div>
                                  <p className="font-medium">
                                    {formatTimeForDisplay(option.startTime)} -{" "}
                                    {formatTimeForDisplay(option.endTime)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {option.availableSpots} / {option.capacity}{" "}
                                    spots available
                                  </p>
                                </div>
                              </div>
                              {isFull && (
                                <Badge variant="destructive" className="ml-2">
                                  FULL
                                </Badge>
                              )}
                            </Label>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  )}
                </div>
              )}

              {/* Optional Reason */}
              {selectedDay && selectedSessionId && (
                <div>
                  <Label
                    htmlFor="reason"
                    className="text-sm font-medium mb-2 block"
                  >
                    Reason (Optional):
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a reason for this reassignment request..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          {/* Info Message */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-800">
              You have <strong>{remainingRequests}</strong> reassignment request
              {remainingRequests !== 1 ? "s" : ""} remaining. Your request will
              be reviewed by your teacher.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !canSubmit || !selectedDay || !selectedSessionId || isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
