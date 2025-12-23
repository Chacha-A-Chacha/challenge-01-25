"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, User, Mail, Phone, Calendar, CreditCard } from "lucide-react";
import type { RegistrationDetail } from "@/store/teacher/registration-approval-store";
import Image from "next/image";

interface RegistrationApprovalModalProps {
  registration: RegistrationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isApproving: boolean;
  isRejecting: boolean;
}

export function RegistrationApprovalModal({
  registration,
  open,
  onOpenChange,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: RegistrationApprovalModalProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReceiptFullscreen, setShowReceiptFullscreen] = useState(false);

  if (!registration) return null;

  const handleApprove = async () => {
    await onApprove();
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }
    await onReject(rejectionReason);
    setRejectionReason("");
    setShowRejectForm(false);
    onOpenChange(false);
  };

  const fullName = [registration.surname, registration.firstName, registration.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Student Registration</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Student Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="font-medium">{fullName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </p>
                  <p className="font-medium">{registration.email}</p>
                </div>
                {registration.phoneNumber && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </p>
                    <p className="font-medium">{registration.phoneNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Registered
                  </p>
                  <p className="font-medium">
                    {new Date(registration.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Course & Sessions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Course & Sessions</h3>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Course</p>
                  <p className="font-medium">{registration.courseName}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="border rounded-lg p-3">
                    <Badge className="mb-2">Saturday</Badge>
                    <p className="text-sm font-medium">{registration.saturdaySession.className}</p>
                    <p className="text-sm text-muted-foreground">{registration.saturdaySession.time}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <Badge className="mb-2">Sunday</Badge>
                    <p className="text-sm font-medium">{registration.sundaySession.className}</p>
                    <p className="text-sm text-muted-foreground">{registration.sundaySession.time}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Receipt */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Verification
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Receipt Number</p>
                  <p className="font-medium font-mono">{registration.paymentReceiptNo}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Receipt Image</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptFullscreen(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Size
                    </Button>
                  </div>
                  <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <Image
                      src={registration.paymentReceiptUrl}
                      alt="Payment Receipt"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rejection Form (if shown) */}
            {showRejectForm && (
              <div className="border-t pt-4">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {!showRejectForm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isApproving || isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isApproving || isRejecting}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? (
                    "Approving..."
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason("");
                  }}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                >
                  {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Receipt Viewer */}
      <Dialog open={showReceiptFullscreen} onOpenChange={setShowReceiptFullscreen}>
        <DialogContent className="max-w-4xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>Payment Receipt - {registration.paymentReceiptNo}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[75vh] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <Image
              src={registration.paymentReceiptUrl}
              alt="Payment Receipt Full Size"
              fill
              className="object-contain"
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowReceiptFullscreen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
