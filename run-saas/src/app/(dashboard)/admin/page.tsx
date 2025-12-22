// app/(dashboard)/admin/page.tsx - Admin Dashboard Page
import { Metadata } from "next";
import { RoleGuard } from "@/components/auth/RoleGuard";
// import { AdminDashboard } from '@/components/admin/AdminDashboard'

export const metadata: Metadata = {
  title: "Admin Dashboard | Weekend Academy",
  description: "System administration and course management",
};

export default function AdminPage() {
  return <RoleGuard allowedRoles="admin">{/*<AdminDashboard />*/}</RoleGuard>;
}
