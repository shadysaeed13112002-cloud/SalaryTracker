import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types/auth'

const ROLE_ROUTES: Record<string, UserRole> = {
  '/admin': 'admin',
  '/dashboard': 'instructor',
}

const PUBLIC_ROUTES = ['/signin', '/signup', '/login', '/access-denied']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  const { pathname } = request.nextUrl

  // Legacy redirect
  if (pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Get User Profile if authenticated
  let userRole: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      
    userRole = profile?.role
  }

  // 2. Import auth-utils dynamically to avoid edge runtime issues if needed, or just use the logic
  // Actually, let's just do it cleanly. We can't import node-specific things in edge, but auth-utils has no node dependencies.
  const { checkAuthorization } = await import('@/lib/auth-utils')
  
  const redirectDestination = checkAuthorization(user?.id, userRole, pathname)

  if (redirectDestination) {
    const redirectResponse = NextResponse.redirect(new URL(redirectDestination, request.url))
    // Copy any cookies set during this request (like refreshed session tokens)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}