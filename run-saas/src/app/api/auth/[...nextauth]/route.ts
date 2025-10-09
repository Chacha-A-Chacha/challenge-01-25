// app/api/auth/[...nextauth]/route.ts - NextAuth API route
// Ensure Node.js runtime for Prisma/bcrypt
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { handlers } from "@/lib/auth"
console.log('NextAuth handlers:', handlers) // Should log { GET: [Function], POST: [Function] }

export const { GET, POST } = handlers