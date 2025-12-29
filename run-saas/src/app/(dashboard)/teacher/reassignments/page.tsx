"use client";

import { useEffect } from "react";
import { Check, X, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useState } from "react";

type StatusFilter = "all" | "PENDING" | "APPROVED" | "DENIED";

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "All Requests", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Denied", value: "DENIED" },
];

export default function ReassignmentsPage() {
  const { filteredRequests, isLoading, loadRequests } =
    useReassignmentRequests();
  const { approveRequest, denyRequest, isApproving, isDenying, error } =
    useReassignmentActions();
  const { statusFilter, searchQuery, setStatusFilter, setSearchQuery } =
    useReassignmentFilters();
  const stats = useReassignmentStats();

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
              ? "success"
              : value === "DENIED"
                ? "destructive"
                : "warning"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Session Reassignments
          </h1>
          <p className="text-muted-foreground">
            Review and manage student session reassignment requests
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats.denied}
            </div>
            <p className="text-xs text-muted-foreground">Denied</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by student name, number, or class..."
          />
        </div>
        <FilterSelect
          value={statusFilter}
          options={statusOptions}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          placeholder="Filter by status"
        />
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

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading requests...</p>
          </div>
        </div>
      ) : (
        <DataTable
          data={filteredRequests}
          columns={columns}
          emptyMessage={
            statusFilter === "all"
              ? "No reassignment requests found"
              : `No ${statusFilter.toLowerCase()} requests found`
          }
        />
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
