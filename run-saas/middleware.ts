// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define the auth request type for better type safety
interface AuthenticatedRequest extends NextRequest {
  auth: Awaited<ReturnType<typeof auth>>
}

export default auth((req: AuthenticatedRequest) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes that don't require authentication
  const publicRoutes: readonly string[] = [
    '/',
    '/login',
    '/staff-login',
    '/unauthorized',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/session',
    '/api/auth/callback'
  ] as const

  // Check if current path is public
  const isPublicRoute = publicRoutes.some((route: string) =>
    pathname === route || pathname.startsWith('/api/auth/')
  )

  // Allow public routes without authentication
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Require authentication for all other routes
  if (!session?.user) {
    // Redirect to appropriate login page based on path
    const loginPath = pathname.startsWith('/admin') || pathname.startsWith('/teacher')
      ? '/staff-login'
      : '/login'

    return NextResponse.redirect(new URL(loginPath, req.url))
  }

  const { role } = session.user

  // Type guard for role checking
  if (typeof role !== 'string') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  // Role-based route protection with proper type checking
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  if (pathname.startsWith('/teacher') && !['teacher', 'admin'].includes(role)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  if (pathname.startsWith('/student') && role !== 'student') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  // Redirect authenticated users away from login pages
  if (session.user && (pathname === '/login' || pathname === '/staff-login')) {
    const dashboardPath: string = role === 'admin' ? '/admin' :
                                 role === 'teacher' ? '/teacher' :
                                 role === 'student' ? '/student' : '/'

    return NextResponse.redirect(new URL(dashboardPath, req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
} as const