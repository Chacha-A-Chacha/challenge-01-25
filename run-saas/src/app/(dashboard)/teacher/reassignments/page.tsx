"use client";

import { useEffect, useState } from "react";
import { Check, X, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import {
  useReassignmentRequests,
  useReassignmentActions,
  useReassignmentFilters,
  useReassignmentStats,
} from "@/store/teacher/reassignment-store";
import type { ReassignmentRequestDetail } from "@/lib/db";
import { toast } from "sonner";
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

type StatusFilter = "all" | "PENDING" | "APPROVED" | "DENIED";

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "All Requests", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Denied", value: "DENIED" },
];

// Mobile Card Component
function ReassignmentCard({
  request,
  onApprove,
  onDeny,
  isProcessing,
}: {
  request: ReassignmentRequestDetail;
  onApprove: () => void;
  onDeny: () => void;
  isProcessing: boolean;
}) {
  const getStatusBadge = (status: string) => {
    if (status === "APPROVED") {
      return <Badge className="bg-green-600">APPROVED</Badge>;
    }
    if (status === "DENIED") {
      return <Badge variant="destructive">DENIED</Badge>;
    }
    return <Badge className="bg-orange-500">PENDING</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header - Student Info */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-semibold text-base">{request.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {request.studentNumber}
                </p>
              </div>
            </div>
            {getStatusBadge(request.status)}
          </div>

          {/* Class */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Class:</span>
            <Badge variant="outline" className="font-normal">
              {request.className}
            </Badge>
          </div>

          {/* Sessions - From/To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 border-y">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                FROM SESSION
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-sm font-medium">
                    {request.fromSessionDay}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {request.fromSessionTime}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                TO SESSION
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-sm font-medium">
                    {request.toSessionDay}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {request.toSessionTime}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                REASON
              </p>
              <p className="text-sm">{request.reason}</p>
            </div>
          )}

          {/* Requested Date */}
          <div className="text-xs text-muted-foreground">
            Requested: {new Date(request.requestedAt).toLocaleDateString()}
          </div>

          {/* Actions - Only for Pending */}
          {request.status === "PENDING" && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-green-600 text-green-700 hover:bg-green-50"
                onClick={onApprove}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-600 text-red-700 hover:bg-red-50"
                onClick={onDeny}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-1" />
                Deny
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReassignmentsPage() {
  const { filteredRequests, isLoading, loadRequests } =
    useReassignmentRequests();
  const { approveRequest, denyRequest, isApproving, isDenying, error } =
    useReassignmentActions();
  const { statusFilter, searchQuery, setStatusFilter, setSearchQuery } =
    useReassignmentFilters();
  const stats = useReassignmentStats();

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "approve" | "deny" | null;
    request: ReassignmentRequestDetail | null;
  }>({
    open: false,
    action: null,
    request: null,
  });

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleApprove = async () => {
    if (!confirmDialog.request) return;

    const success = await approveRequest(confirmDialog.request.id);
    if (success) {
      toast.success("Reassignment request approved successfully");
      setConfirmDialog({ open: false, action: null, request: null });
    } else if (error) {
      toast.error(error);
    }
  };

  const handleDeny = async () => {
    if (!confirmDialog.request) return;

    const success = await denyRequest(confirmDialog.request.id);
    if (success) {
      toast.success("Reassignment request denied");
      setConfirmDialog({ open: false, action: null, request: null });
    } else if (error) {
      toast.error(error);
    }
  };

  const openConfirmDialog = (
    action: "approve" | "deny",
    request: ReassignmentRequestDetail,
  ) => {
    setConfirmDialog({ open: true, action, request });
  };

  const columns: Column<ReassignmentRequestDetail>[] = [
    {
      header: "Student",
      accessor: (request) => request.studentName,
      cell: (value, request) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-muted-foreground">
            {request.studentNumber}
          </p>
        </div>
      ),
    },
    {
      header: "Class",
      accessor: "className",
      cell: (value) => (
        <Badge variant="outline" className="font-normal">
          {value}
        </Badge>
      ),
    },
    {
      header: "From Session",
      accessor: (request) => request.fromSessionTime,
      cell: (value, request) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{request.fromSessionDay}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{value}</span>
          </div>
        </div>
      ),
    },
    {
      header: "To Session",
      accessor: (request) => request.toSessionTime,
      cell: (value, request) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{request.toSessionDay}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{value}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Reason",
      accessor: "reason",
      cell: (value) => (
        <p className="text-sm text-muted-foreground max-w-[200px] truncate">
          {value || "No reason provided"}
        </p>
      ),
    },
    {
      header: "Requested",
      accessor: "requestedAt",
      cell: (value) => (
        <p className="text-sm text-muted-foreground">
          {new Date(value).toLocaleDateString()}
        </p>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      cell: (value) => (
        <Badge
          variant={
            value === "APPROVED"
              ? "default"
              : value === "DENIED"
                ? "destructive"
                : "secondary"
          }
          className={
            value === "APPROVED"
              ? "bg-green-600"
              : value === "PENDING"
                ? "bg-orange-500"
                : ""
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: () => null,
      cell: (_value, request) => {
        if (request.status !== "PENDING") {
          return (
            <span className="text-xs text-muted-foreground">Processed</span>
          );
        }

        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
              onClick={(e) => {
                e.stopPropagation();
                openConfirmDialog("approve", request);
              }}
              disabled={isApproving || isDenying}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              onClick={(e) => {
                e.stopPropagation();
                openConfirmDialog("deny", request);
              }}
              disabled={isApproving || isDenying}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Session Reassignments
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Review and manage student session reassignment requests
        </p>
      </div>

      {/* Stats - 2 columns mobile, 4 desktop */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Requests
                </p>
              </div>
              <User className="h-5 w-5 text-emerald-600/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.pending}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending Review
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.approved}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.denied}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Denied</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Same line with different widths */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 sm:min-w-[300px]">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by student name, number, or class..."
          />
        </div>
        <div className="w-full sm:w-48">
          <FilterSelect
            value={statusFilter}
            options={statusOptions}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            placeholder="Filter by status"
          />
        </div>
      </div>

      {/* Info Alert for Pending Requests */}
      {stats.pending > 0 && statusFilter === "PENDING" && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
            You have {stats.pending} pending reassignment request
            {stats.pending !== 1 ? "s" : ""} waiting for review
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Table View - Desktop */
        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            <DataTable
              data={filteredRequests}
              columns={columns}
              emptyMessage={
                statusFilter === "all"
                  ? "No reassignment requests found"
                  : `No ${statusFilter.toLowerCase()} requests found`
              }
            />
          </div>
        </ScrollArea>
      ) : (
        /* Card View - Mobile */
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                {statusFilter === "all"
                  ? "No reassignment requests found"
                  : `No ${statusFilter.toLowerCase()} requests found`}
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <ReassignmentCard
                key={request.id}
                request={request}
                onApprove={() => openConfirmDialog("approve", request)}
                onDeny={() => openConfirmDialog("deny", request)}
                isProcessing={isApproving || isDenying}
              />
            ))
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmDialog({ open: false, action: null, request: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "approve"
                ? "Approve Reassignment Request"
                : "Deny Reassignment Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "approve" ? (
                <>
                  Are you sure you want to approve this reassignment request for{" "}
                  <strong>{confirmDialog.request?.studentName}</strong>?
                  <br />
                  <br />
                  The student will be moved from{" "}
                  <strong>
                    {confirmDialog.request?.fromSessionDay}{" "}
                    {confirmDialog.request?.fromSessionTime}
                  </strong>{" "}
                  to{" "}
                  <strong>
                    {confirmDialog.request?.toSessionDay}{" "}
                    {confirmDialog.request?.toSessionTime}
                  </strong>
                  .
                </>
              ) : (
                <>
                  Are you sure you want to deny this reassignment request for{" "}
                  <strong>{confirmDialog.request?.studentName}</strong>?
                  <br />
                  <br />
                  The student will remain in their current session:{" "}
                  <strong>
                    {confirmDialog.request?.fromSessionDay}{" "}
                    {confirmDialog.request?.fromSessionTime}
                  </strong>
                  .
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving || isDenying}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={
                confirmDialog.action === "approve" ? handleApprove : handleDeny
              }
              disabled={isApproving || isDenying}
              className={
                confirmDialog.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isApproving || isDenying
                ? "Processing..."
                : confirmDialog.action === "approve"
                  ? "Approve"
                  : "Deny"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
