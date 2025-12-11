// components/auth/StudentLoginForm.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react'

export function StudentLoginForm() {
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const result = await signIn('student', {
                redirect: false,
                email: email.toLowerCase().trim(),
                password
            })

            if (result?.error) {
                setError('Invalid email or password. Please try again.')
            } else if (result?.ok) {
                router.push('/student')
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Weekend Academy</h1>
                    <p className="text-gray-500">Student Portal</p>
                </div>

                <Card className="border-0 shadow-xl overflow-hidden">
                    <CardHeader className="bg-blue-600 text-white text-center">
                        <CardTitle className="text-xl">Student Login</CardTitle>
                        <CardDescription className="text-blue-100">
                            Enter your credentials to access your portal
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="student@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    autoComplete="email"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    autoComplete="current-password"
                                    className="mt-1"
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full bg-blue-600 hover:bg-blue-700" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">or</span>
                            </div>
                        </div>

                        {/* Registration Link */}
                        <div className="text-center space-y-3">
                            <p className="text-gray-600">
                                New student?{' '}
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-emerald-600 hover:text-emerald-700 font-semibold"
                                    onClick={() => router.push('/register')}
                                >
                                    Register here
                                </Button>
                            </p>
                        </div>

                        {/* Staff Link */}
                        <div className="text-center pt-4 border-t mt-6">
                            <p className="text-sm text-gray-500">
                                Staff member?{' '}
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-blue-600 hover:text-blue-700"
                                    onClick={() => router.push('/staff-login')}
                                >
                                    Login here
                                </Button>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
