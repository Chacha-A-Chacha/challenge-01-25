// middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Public routes are handled by matcher config, so if we're here, we need auth
    // But check for public registration routes that shouldn't require auth
    const publicApiRoutes = ['/api/register']
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // No token means not authenticated - redirect handled by withAuth
    if (!token) {
      return NextResponse.next() // withAuth will handle redirect
    }

    const role = token.role as string | undefined

    // Role-based route protection
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/teacher') && !['teacher', 'admin'].includes(role ?? '')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/student') && role !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // Redirect authenticated users away from login pages
    if (pathname === '/login' || pathname === '/staff-login') {
      const dashboardPath = role === 'admin' ? '/admin' :
                           role === 'teacher' ? '/teacher' :
                           role === 'student' ? '/student' : '/'
      return NextResponse.redirect(new URL(dashboardPath, req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public routes without token
        const publicRoutes = [
          '/',
          '/login',
          '/staff-login',
          '/register',
          '/unauthorized',
        ]

        // Check if path is public
        if (publicRoutes.includes(pathname)) {
          return true
        }

        // Allow registration API routes
        if (pathname.startsWith('/api/register')) {
          return true
        }

        // Allow NextAuth routes
        if (pathname.startsWith('/api/auth')) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
    pages: {
      signIn: '/login',
      error: '/login',
    },
  }
)

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
}