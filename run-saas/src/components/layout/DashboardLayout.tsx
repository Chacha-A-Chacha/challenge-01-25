// components/layout/DashboardLayout.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useAuth } from '@/store'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { LogOut, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
    children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter()
    const { user, isAuthenticated, sessionStatus } = useAuth()

    // Redirect to login if not authenticated
    useEffect(() => {
        if (sessionStatus === 'unauthenticated') {
            router.push('/login')
        }
    }, [sessionStatus, router])

    // Show loading state while checking session
    if (sessionStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    // Don't render if not authenticated
    if (!isAuthenticated || !user) {
        return null
    }

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' })
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="md:pl-64">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-20 bg-white border-b">
                    <div className="flex items-center justify-between px-4 md:px-6 py-4">
                        {/* Page Title / Breadcrumb Area */}
                        <div className="flex-1">
                            {/* Mobile menu button space (button is in Sidebar component) */}
                            <div className="md:hidden w-10"></div>
                        </div>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-2">
                            {/* Notifications */}
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
                            </Button>

                            {/* Logout */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
