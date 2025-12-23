"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Pagination } from "@/components/shared/Pagination";
import { RegistrationApprovalModal } from "@/components/teacher/RegistrationApprovalModal";
import {
  useRegistrations,
  useRegistrationActions,
  useBulkSelection,
  useRegistrationFilters,
} from "@/store/teacher/registration-approval-store";
import { toast } from "sonner";

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "all" },
];

export default function RegistrationsPage() {
  const {
    registrations,
    selectedRegistration,
    total,
    hasMore,
    isLoading,
    loadRegistrations,
    selectRegistration,
  } = useRegistrations();

  const {
    approveRegistration,
    rejectRegistration,
    bulkApprove,
    isApproving,
    isRejecting,
  } = useRegistrationActions();

  const {
    selectedForBulk,
    toggleBulkSelection,
    selectAllOnPage,
    clearBulkSelection,
  } = useBulkSelection();

  const { filters, setFilters, setPage } = useRegistrationFilters();

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const handleViewDetails = (registration: any) => {
    selectRegistration(registration);
    setIsApprovalModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRegistration) return;

    const success = await approveRegistration(selectedRegistration.id);
    if (success) {
      toast.success("Registration approved successfully");
    }
  };

  const handleReject = async (reason: string) => {
    if (!selectedRegistration) return;

    const success = await rejectRegistration(selectedRegistration.id, reason);
    if (success) {
      toast.success("Registration rejected");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedForBulk.size === 0) {
      toast.error("No registrations selected");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to approve ${selectedForBulk.size} registration(s)?`,
    );

    if (!confirmed) return;

    const ids = Array.from(selectedForBulk);
    const success = await bulkApprove(ids);

    if (success) {
      toast.success(`Approved ${ids.length} registration(s)`);
    }
  };

  const pendingCount = registrations.filter(
    (r) => r.status === "PENDING",
  ).length;
  const allPendingSelected =
    pendingCount > 0 &&
    registrations
      .filter((r) => r.status === "PENDING")
      .every((r) => selectedForBulk.has(r.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Student Registrations
          </h1>
          <p className="text-muted-foreground">
            Review and approve pending student registrations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Total Registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {registrations.filter((r) => r.status === "APPROVED").length}
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {registrations.filter((r) => r.status === "REJECTED").length}
            </div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <SearchInput
              value={filters.search}
              onChange={(value) => setFilters({ search: value })}
              placeholder="Search by name or email..."
            />
          </div>
          <FilterSelect
            value={filters.status}
            options={statusOptions}
            onChange={(value) => setFilters({ status: value as any })}
            placeholder="Filter by status"
          />
        </div>

        {/* Bulk Actions Bar */}
        {selectedForBulk.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedForBulk.size} registration(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearBulkSelection}
                >
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={isApproving}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isApproving
                    ? "Approving..."
                    : `Approve ${selectedForBulk.size}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Registrations Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading registrations...</p>
          </div>
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No registrations found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {filters.status === "PENDING" && (
                      <th className="px-4 py-3 text-left">
                        <Checkbox
                          checked={allPendingSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllOnPage();
                            } else {
                              clearBulkSelection();
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Sessions
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Receipt
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registrations.map((registration) => {
                    const fullName = [
                      registration.surname,
                      registration.firstName,
                      registration.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <tr
                        key={registration.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        {filters.status === "PENDING" &&
                          registration.status === "PENDING" && (
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={selectedForBulk.has(registration.id)}
                                onCheckedChange={() =>
                                  toggleBulkSelection(registration.id)
                                }
                              />
                            </td>
                          )}
                        {filters.status === "PENDING" &&
                          registration.status !== "PENDING" && <td></td>}
                        {filters.status !== "PENDING" && <td></td>}
                        <td className="px-4 py-3">
                          <p className="font-medium">{fullName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{registration.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs space-y-1">
                            <p>
                              <Badge variant="outline" className="text-xs">
                                Sat
                              </Badge>{" "}
                              {registration.saturdaySession.className}
                            </p>
                            <p>
                              <Badge variant="outline" className="text-xs">
                                Sun
                              </Badge>{" "}
                              {registration.sundaySession.className}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {registration.paymentReceiptNo}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              registration.status === "APPROVED"
                                ? "success"
                                : registration.status === "REJECTED"
                                  ? "destructive"
                                  : "warning"
                            }
                          >
                            {registration.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(registration.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(registration)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={filters.page}
            totalPages={Math.ceil(total / filters.limit)}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Approval Modal */}
      <RegistrationApprovalModal
        registration={selectedRegistration}
        open={isApprovalModalOpen}
        onOpenChange={setIsApprovalModalOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={isApproving}
        isRejecting={isRejecting}
      />
    </div>
  );
}
