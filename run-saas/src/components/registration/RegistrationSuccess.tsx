// components/registration/RegistrationSuccess.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistrationStore } from '@/store/registration/registration-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
    CheckCircle2, 
    Mail, 
    Calendar, 
    Clock, 
    GraduationCap,
    Home,
    ArrowRight
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* Success Animation */}
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-25"></div>
                        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mt-6">
                        Registration Submitted!
                    </h1>
                    <p className="text-gray-600 mt-2 max-w-md mx-auto">
                        Your registration is pending approval. You&apos;ll receive an email once your account is activated.
                    </p>
                </div>

                {/* Summary Card */}
                <Card className="border-0 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white">
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5" />
                            Registration Summary
                        </CardTitle>
                        <CardDescription className="text-blue-100">
                            Reference ID: {submissionResult.registrationId.slice(0, 8).toUpperCase()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {/* Course */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
                            <div className="p-2 rounded-full bg-blue-100">
                                <GraduationCap className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Course</p>
                                <p className="font-semibold text-gray-900">{submissionResult.courseName}</p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                            <div className="p-2 rounded-full bg-gray-100">
                                <Mail className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-semibold text-gray-900">{submissionResult.email}</p>
                            </div>
                        </div>

                        {/* Sessions */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-blue-50">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-700">Saturday</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-700">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">{submissionResult.saturdaySession}</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-emerald-50">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-medium text-emerald-700">Sunday</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-700">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">{submissionResult.sundaySession}</span>
                                </div>
                            </div>
                        </div>

                        {/* Submission Date */}
                        <div className="pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-500 text-center">
                                Submitted on {new Date(submissionResult.submittedAt).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* What's Next */}
                <Card className="mt-6 border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-lg">What happens next?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="space-y-4">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center">
                                    1
                                </span>
                                <div>
                                    <p className="font-medium text-gray-900">Payment Verification</p>
                                    <p className="text-sm text-gray-500">Our team will verify your payment receipt</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold flex items-center justify-center">
                                    2
                                </span>
                                <div>
                                    <p className="font-medium text-gray-900">Account Activation</p>
                                    <p className="text-sm text-gray-500">You&apos;ll receive an email once approved</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center">
                                    3
                                </span>
                                <div>
                                    <p className="font-medium text-gray-900">Start Learning</p>
                                    <p className="text-sm text-gray-500">Login and access your student portal</p>
                                </div>
                            </li>
                        </ol>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="mt-8 space-y-3">
                    <Button
                        onClick={handleGoToLogin}
                        className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold py-6 rounded-xl shadow-lg"
                    >
                        Go to Login
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleGoHome}
                        className="w-full py-6 rounded-xl"
                    >
                        <Home className="w-5 h-5 mr-2" />
                        Back to Home
                    </Button>
                </div>

                {/* Support Note */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    Questions? Contact us at{' '}
                    <a href="mailto:support@weekendacademy.com" className="text-blue-600 hover:underline">
                        support@weekendacademy.com
                    </a>
                </p>
            </div>
        </div>
    )
}
