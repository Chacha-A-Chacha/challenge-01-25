// components/registration/RegistrationSuccess.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistrationStore } from '@/store/registration/registration-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
    CheckCircle2, 
    Mail, 
    Calendar, 
    Clock, 
    GraduationCap,
    Home,
    FileCheck,
    UserCheck,
    LogIn
} from 'lucide-react'

export function RegistrationSuccess() {
    const router = useRouter()
    const submissionResult = useRegistrationStore(state => state.submissionResult)
    const reset = useRegistrationStore(state => state.reset)

    // Redirect if no submission result (direct navigation)
    useEffect(() => {
        if (!submissionResult) {
            router.push('/register')
        }
    }, [submissionResult, router])

    if (!submissionResult) {
        return null
    }

    const handleGoHome = () => {
        reset()
        router.push('/')
    }

    const handleGoToLogin = () => {
        reset()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6 relative">
                        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                        <CheckCircle2 className="w-10 h-10 text-green-600 relative z-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Registration Submitted!
                    </h1>
                    <p className="text-gray-600 max-w-md mx-auto">
                        Your application is being reviewed. You&#39;ll receive an email notification once your account is activated.
                    </p>
                </div>

                {/* Reference ID Card */}
                <Card className="mb-6 border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-blue-700 font-medium mb-1">Reference ID</p>
                            <p className="text-2xl font-bold text-blue-900 tracking-wider">
                                {submissionResult.registrationId.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                                Save this ID for future reference
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Registration Details */}
                <Card className="mb-6 border-gray-200 shadow-lg">
                    <CardHeader className="border-b bg-gray-50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileCheck className="w-5 h-5 text-blue-600" />
                            Registration Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {/* Course */}
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">
                                        Course
                                    </p>
                                    <p className="text-base font-semibold text-gray-900">
                                        {submissionResult.courseName}
                                    </p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-5 h-5 text-gray-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">
                                        Email Address
                                    </p>
                                    <p className="text-base font-semibold text-gray-900 break-all">
                                        {submissionResult.email}
                                    </p>
                                </div>
                            </div>

                            {/* Sessions */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Saturday */}
                                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                            Saturday
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-medium">
                                            {submissionResult.saturdaySession}
                                        </span>
                                    </div>
                                </div>

                                {/* Sunday */}
                                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                            Sunday
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-medium">
                                            {submissionResult.sundaySession}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Submission Time */}
                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        Submitted on {new Date(submissionResult.submittedAt).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })} at {new Date(submissionResult.submittedAt).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Steps */}
                <Card className="mb-8 border-gray-200 shadow-lg">
                    <CardHeader className="border-b bg-gray-50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                            What Happens Next?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-5">
                            {/* Step 1 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-blue-700 font-bold text-sm">1</span>
                                    </div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h3 className="font-semibold text-gray-900 mb-1">
                                        Payment Verification
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Our team will verify your payment receipt within 24-48 hours
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="ml-4 border-l-2 border-gray-200 h-4"></div>

                            {/* Step 2 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <span className="text-emerald-700 font-bold text-sm">2</span>
                                    </div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h3 className="font-semibold text-gray-900 mb-1">
                                        Account Activation
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        You&#39;ll receive an email confirmation once your registration is approved
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="ml-4 border-l-2 border-gray-200 h-4"></div>

                            {/* Step 3 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                        <span className="text-purple-700 font-bold text-sm">3</span>
                                    </div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h3 className="font-semibold text-gray-900 mb-1">
                                        Start Learning
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Sign in to your student portal and access your class schedule
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <Button
                        onClick={handleGoToLogin}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                    >
                        <LogIn className="w-5 h-5 mr-2" />
                        Go to Login
                    </Button>
                    
                    <Button
                        variant="outline"
                        onClick={handleGoHome}
                        className="w-full h-12 border-gray-300 hover:bg-gray-50"
                    >
                        <Home className="w-5 h-5 mr-2" />
                        Back to Home
                    </Button>
                </div>

                {/* Support Notice */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-center text-sm text-blue-900">
                        <span className="font-medium">Need help?</span> Contact us at{' '}
                        <a 
                            href="mailto:support@weekendacademy.com" 
                            className="text-blue-600 hover:text-blue-700 font-semibold underline"
                        >
                            support@weekendacademy.com
                        </a>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 mt-8">
                    © {new Date().getFullYear()} Weekend Academy. All rights reserved.
                </p>
            </div>
        </div>
    )
}
