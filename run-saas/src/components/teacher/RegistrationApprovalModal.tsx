"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
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

  const fullName = [
    registration.surname,
    registration.firstName,
    registration.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const isProcessing = isApproving || isRejecting;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Registration</DialogTitle>
            <DialogDescription>
              Review the student registration details and payment receipt before
              approving or rejecting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Student Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Student Information</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{registration.email}</span>
                </div>
                {registration.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">
                      {registration.phoneNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered</span>
                  <span className="font-medium">
                    {new Date(registration.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Course & Sessions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Course & Sessions</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{registration.courseName}</span>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <Badge variant="outline" className="mb-2">
                    Saturday
                  </Badge>
                  <p className="text-sm font-medium">
                    {registration.saturdaySession.className}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {registration.saturdaySession.time}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <Badge variant="outline" className="mb-2">
                    Sunday
                  </Badge>
                  <p className="text-sm font-medium">
                    {registration.sundaySession.className}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {registration.sundaySession.time}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Receipt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Payment Verification</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReceiptFullscreen(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Full Size
                </Button>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt Number</span>
                  <code className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                    {registration.paymentReceiptNo}
                  </code>
                </div>
              </div>
              <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                <Image
                  src={registration.paymentReceiptUrl}
                  alt="Payment Receipt"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Rejection Form */}
            {showRejectForm && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label htmlFor="rejectionReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejection (required)..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {!showRejectForm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={isProcessing}>
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
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
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                >
                  {isRejecting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Confirm Rejection
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Receipt Viewer */}
      <Dialog
        open={showReceiptFullscreen}
        onOpenChange={setShowReceiptFullscreen}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              Receipt #{registration.paymentReceiptNo}
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[70vh] bg-muted rounded-lg overflow-hidden">
            <Image
              src={registration.paymentReceiptUrl}
              alt="Payment Receipt Full Size"
              fill
              className="object-contain"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiptFullscreen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
