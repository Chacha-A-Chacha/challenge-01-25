// components/registration/RegistrationForm.tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    useRegistrationForm, 
    useRegistrationData, 
    useRegistrationSubmission 
} from '@/store/registration/registration-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
    GraduationCap, 
    User, 
    Lock, 
    CreditCard, 
    Loader2, 
    CheckCircle2,
    AlertCircle,
    Upload,
    Calendar,
    Clock
} from 'lucide-react'

export function RegistrationForm() {
    const router = useRouter()
    const [uploadingReceipt, setUploadingReceipt] = useState(false)
    
    const { 
        formData, 
        fieldErrors, 
        updateFormData, 
        isFormValid 
    } = useRegistrationForm()
    
    const { 
        courses, 
        sessions, 
        isLoadingCourses, 
        isLoadingSessions, 
        loadCourses 
    } = useRegistrationData()
    
    const { 
        isSubmitting, 
        error, 
        submitRegistration,
        setReceiptUrl
    } = useRegistrationSubmission()

    // Load courses on mount
    useEffect(() => {
        loadCourses()
    }, [loadCourses])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const success = await submitRegistration()
        if (success) {
            router.push('/register/success')
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a JPEG, PNG, or WebP image')
            return
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB')
            return
        }

        setUploadingReceipt(true)
        
        try {
            // For now, create a local object URL
            // In production, this would upload to a file storage service
            const objectUrl = URL.createObjectURL(file)
            setReceiptUrl(objectUrl)
            
            // TODO: Replace with actual upload to Vercel Blob or similar
            // const formData = new FormData()
            // formData.append('file', file)
            // const response = await fetch('/api/register/upload', { method: 'POST', body: formData })
            // const { url } = await response.json()
            // setReceiptUrl(url)
        } catch (err) {
            console.error('Upload failed:', err)
            alert('Failed to upload receipt. Please try again.')
        } finally {
            setUploadingReceipt(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 mb-4">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Registration</h1>
                    <p className="text-gray-600 mt-2">Join Weekend Academy and start your learning journey</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Course Selection */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="w-5 h-5" />
                                Select Your Course
                            </CardTitle>
                            <CardDescription className="text-blue-100">
                                Choose the course you want to enroll in
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoadingCourses ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                    <span className="ml-2 text-gray-600">Loading courses...</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {courses.map(course => (
                                        <label
                                            key={course.id}
                                            className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                formData.courseId === course.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="courseId"
                                                value={course.id}
                                                checked={formData.courseId === course.id}
                                                onChange={(e) => updateFormData('courseId', e.target.value)}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                                                formData.courseId === course.id
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300'
                                            }`}>
                                                {formData.courseId === course.id && (
                                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                                )}
                                            </div>
                                            <span className="font-medium text-gray-900">{course.name}</span>
                                        </label>
                                    ))}
                                    {courses.length === 0 && (
                                        <p className="text-center text-gray-500 py-4">
                                            No courses available for registration at this time.
                                        </p>
                                    )}
                                </div>
                            )}
                            {fieldErrors.courseId && (
                                <p className="text-red-500 text-sm mt-2">{fieldErrors.courseId}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Session Selection */}
                    {formData.courseId && (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-t-xl">
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Select Your Sessions
                                </CardTitle>
                                <CardDescription className="text-emerald-100">
                                    Pick one session for Saturday and one for Sunday
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {isLoadingSessions ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                        <span className="ml-2 text-gray-600">Loading sessions...</span>
                                    </div>
                                ) : sessions ? (
                                    <div className="space-y-6">
                                        {/* Saturday Sessions */}
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                                Saturday Sessions
                                            </h4>
                                            <div className="grid gap-3">
                                                {sessions.saturday.map(session => (
                                                    <SessionOption
                                                        key={session.id}
                                                        session={session}
                                                        selected={formData.saturdaySessionId === session.id}
                                                        onSelect={() => updateFormData('saturdaySessionId', session.id)}
                                                        accentColor="blue"
                                                    />
                                                ))}
                                                {sessions.saturday.length === 0 && (
                                                    <p className="text-gray-500 text-sm">No Saturday sessions available</p>
                                                )}
                                            </div>
                                            {fieldErrors.saturdaySessionId && (
                                                <p className="text-red-500 text-sm mt-2">{fieldErrors.saturdaySessionId}</p>
                                            )}
                                        </div>

                                        {/* Sunday Sessions */}
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                                Sunday Sessions
                                            </h4>
                                            <div className="grid gap-3">
                                                {sessions.sunday.map(session => (
                                                    <SessionOption
                                                        key={session.id}
                                                        session={session}
                                                        selected={formData.sundaySessionId === session.id}
                                                        onSelect={() => updateFormData('sundaySessionId', session.id)}
                                                        accentColor="emerald"
                                                    />
                                                ))}
                                                {sessions.sunday.length === 0 && (
                                                    <p className="text-gray-500 text-sm">No Sunday sessions available</p>
                                                )}
                                            </div>
                                            {fieldErrors.sundaySessionId && (
                                                <p className="text-red-500 text-sm mt-2">{fieldErrors.sundaySessionId}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    )}

                    {/* Personal Information */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Personal Information
                            </CardTitle>
                            <CardDescription className="text-blue-100">
                                Enter your details as they appear on official documents
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="surname">Surname *</Label>
                                    <Input
                                        id="surname"
                                        value={formData.surname}
                                        onChange={(e) => updateFormData('surname', e.target.value)}
                                        placeholder="Doe"
                                        className="mt-1"
                                    />
                                    {fieldErrors.surname && (
                                        <p className="text-red-500 text-sm mt-1">{fieldErrors.surname}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => updateFormData('firstName', e.target.value)}
                                        placeholder="John"
                                        className="mt-1"
                                    />
                                    {fieldErrors.firstName && (
                                        <p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="lastName">Last Name (Optional)</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => updateFormData('lastName', e.target.value)}
                                    placeholder="Smith"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => updateFormData('email', e.target.value)}
                                    placeholder="john.doe@email.com"
                                    className="mt-1"
                                />
                                {fieldErrors.email && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                                <Input
                                    id="phoneNumber"
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                                    placeholder="0712345678"
                                    className="mt-1"
                                />
                                {fieldErrors.phoneNumber && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.phoneNumber}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Password */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Create Password
                            </CardTitle>
                            <CardDescription className="text-emerald-100">
                                Set a secure password for your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <Label htmlFor="password">Password *</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => updateFormData('password', e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    className="mt-1"
                                />
                                {fieldErrors.password && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                                    placeholder="Re-enter your password"
                                    className="mt-1"
                                />
                                {fieldErrors.confirmPassword && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Details */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Payment Details
                            </CardTitle>
                            <CardDescription className="text-blue-100">
                                Upload your payment receipt for verification
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <Label htmlFor="paymentReceiptNo">Receipt Number *</Label>
                                <Input
                                    id="paymentReceiptNo"
                                    value={formData.paymentReceiptNo}
                                    onChange={(e) => updateFormData('paymentReceiptNo', e.target.value.replace(/\D/g, ''))}
                                    placeholder="Enter receipt number (numbers only)"
                                    className="mt-1"
                                />
                                {fieldErrors.paymentReceiptNo && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.paymentReceiptNo}</p>
                                )}
                            </div>
                            <div>
                                <Label>Payment Receipt Image *</Label>
                                <div className="mt-1">
                                    {formData.paymentReceiptUrl ? (
                                        <div className="relative">
                                            <div className="border-2 border-emerald-500 rounded-lg p-4 bg-emerald-50">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                    <div>
                                                        <p className="font-medium text-emerald-700">Receipt uploaded</p>
                                                        <p className="text-sm text-emerald-600">Click below to change</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <label className="block mt-2">
                                                <span className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline">
                                                    Change receipt image
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={handleFileUpload}
                                                    className="sr-only"
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                            {uploadingReceipt ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                                    <span className="text-gray-600">Uploading...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        JPEG, PNG or WebP (max 5MB)
                                                    </p>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleFileUpload}
                                                className="sr-only"
                                                disabled={uploadingReceipt}
                                            />
                                        </label>
                                    )}
                                </div>
                                {fieldErrors.paymentReceiptUrl && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.paymentReceiptUrl}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        size="lg"
                        disabled={!isFormValid() || isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold py-6 text-lg rounded-xl shadow-lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Submitting Registration...
                            </>
                        ) : (
                            'Submit Registration'
                        )}
                    </Button>

                    {/* Login Link */}
                    <p className="text-center text-gray-600">
                        Already have an account?{' '}
                        <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                            Login here
                        </a>
                    </p>
                </form>
            </div>
        </div>
    )
}

// ============================================================================
// SESSION OPTION COMPONENT
// ============================================================================

interface SessionOptionProps {
    session: {
        id: string
        className: string
        startTime: string
        endTime: string
        available: number
        capacity: number
        isFull: boolean
    }
    selected: boolean
    onSelect: () => void
    accentColor: 'blue' | 'emerald'
}

function SessionOption({ session, selected, onSelect, accentColor }: SessionOptionProps) {
    const colorClasses = {
        blue: {
            selected: 'border-blue-500 bg-blue-50',
            hover: 'hover:border-blue-300',
            radio: 'border-blue-500 bg-blue-500',
            badge: 'bg-blue-100 text-blue-700'
        },
        emerald: {
            selected: 'border-emerald-500 bg-emerald-50',
            hover: 'hover:border-emerald-300',
            radio: 'border-emerald-500 bg-emerald-500',
            badge: 'bg-emerald-100 text-emerald-700'
        }
    }

    const colors = colorClasses[accentColor]

    if (session.isFull) {
        return (
            <div className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-500">
                                {session.startTime} - {session.endTime}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">{session.className}</p>
                    </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    FULL
                </span>
            </div>
        )
    }

    return (
        <label
            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selected
                    ? colors.selected
                    : `border-gray-200 ${colors.hover} hover:bg-gray-50`
            }`}
        >
            <div className="flex items-center gap-3">
                <input
                    type="radio"
                    checked={selected}
                    onChange={onSelect}
                    className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected ? colors.radio : 'border-gray-300'
                }`}>
                    {selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                            {session.startTime} - {session.endTime}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">{session.className}</p>
                </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                {session.available}/{session.capacity} spots
            </span>
        </label>
    )
}
