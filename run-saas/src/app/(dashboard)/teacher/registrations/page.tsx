"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Eye, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type RegistrationStatusFilter = "PENDING" | "APPROVED" | "REJECTED" | "all";

const statusOptions: { label: string; value: RegistrationStatusFilter }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "all" },
];

// Mobile Card Component
function RegistrationCard({
  registration,
  isSelected,
  onToggleSelect,
  onViewDetails,
  showCheckbox,
}: {
  registration: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  showCheckbox: boolean;
}) {
  const fullName = [
    registration.surname,
    registration.firstName,
    registration.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const getStatusBadge = (status: string) => {
    if (status === "APPROVED") {
      return <Badge className="bg-green-600">APPROVED</Badge>;
    }
    if (status === "REJECTED") {
      return <Badge variant="destructive">REJECTED</Badge>;
    }
    return <Badge className="bg-orange-500">PENDING</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header - Student Info */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              {showCheckbox && registration.status === "PENDING" && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onToggleSelect}
                />
              )}
              <div className="flex items-center gap-2 flex-1">
                <User className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate">{fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {registration.email}
                  </p>
                </div>
              </div>
            </div>
            {getStatusBadge(registration.status)}
          </div>

          {/* Sessions */}
          <div className="space-y-2 py-3 border-y">
            <p className="text-xs font-medium text-muted-foreground">
              ASSIGNED SESSIONS
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Sat
                </Badge>
                <span className="text-sm">
                  {registration.saturdaySession.className}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Sun
                </Badge>
                <span className="text-sm">
                  {registration.sundaySession.className}
                </span>
              </div>
            </div>
          </div>

          {/* Receipt */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              PAYMENT RECEIPT
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded block">
              {registration.paymentReceiptNo}
            </code>
          </div>

          {/* Date */}
          <div className="text-xs text-muted-foreground">
            Registered: {new Date(registration.createdAt).toLocaleDateString()}
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegistrationsPage() {
  const {
    registrations,
    selectedRegistration,
    total,
    hasMore,
    isLoading,
    error,
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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  // Auto-switch to cards on mobile
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? "cards" : "table");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleViewDetails = (registration: (typeof registrations)[number]) => {
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
    <div className="space-y-6 pb-8">
      {/* Header - Mobile Optimized */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Student Registrations
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Review and approve pending student registrations
        </p>
      </div>

      {/* Stats - 2 columns mobile, 4 desktop */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Registrations
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
                  {pendingCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending Approval
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
                  {registrations.filter((r) => r.status === "APPROVED").length}
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
                  {registrations.filter((r) => r.status === "REJECTED").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Same line with different widths */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 sm:min-w-[300px]">
          <SearchInput
            value={filters.search}
            onChange={(value) => setFilters({ search: value })}
            placeholder="Search by name or email..."
          />
        </div>
        <div className="w-full sm:w-48">
          <FilterSelect
            value={filters.status}
            options={statusOptions}
            onChange={(value) =>
              setFilters({ status: value as RegistrationStatusFilter })
            }
            placeholder="Filter by status"
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedForBulk.size > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {selectedForBulk.size} registration(s) selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearBulkSelection}
                className="flex-1 sm:flex-none"
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={isApproving}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700"
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

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading registrations...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button
              onClick={loadRegistrations}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Retry
            </Button>
          </div>
        </div>
      ) : registrations.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
            No registrations found
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* Table View - Desktop */
        <ScrollArea className="w-full">
          <div className="min-w-[1000px] border rounded-lg overflow-hidden">
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
                          <div>
                            <Badge variant="outline" className="text-xs">
                              Sat
                            </Badge>{" "}
                            {registration.saturdaySession.className}
                          </div>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              Sun
                            </Badge>{" "}
                            {registration.sundaySession.className}
                          </div>
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
                              ? "default"
                              : registration.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            registration.status === "APPROVED"
                              ? "bg-green-600"
                              : registration.status === "PENDING"
                                ? "bg-orange-500"
                                : ""
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
                          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
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
        </ScrollArea>
      ) : (
        /* Card View - Mobile */
        <div className="space-y-3">
          {registrations.map((registration) => (
            <RegistrationCard
              key={registration.id}
              registration={registration}
              isSelected={selectedForBulk.has(registration.id)}
              onToggleSelect={() => toggleBulkSelection(registration.id)}
              onViewDetails={() => handleViewDetails(registration)}
              showCheckbox={filters.status === "PENDING"}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {registrations.length > 0 && (
        <Pagination
          currentPage={filters.page}
          totalPages={Math.ceil(total / filters.limit)}
          onPageChange={setPage}
        />
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
