import type { SupabaseClient } from '@supabase/supabase-js'

export async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user profile:', error)
  }

  return profile
}

export function checkAuthorization(
  userId: string | undefined,
  userRole: string | undefined,
  pathname: string
) {
  console.log('\n=== Authorization Check ===')
  console.log('Authenticated User ID:', userId || 'None')
  console.log('User Role:', userRole || 'None')
  console.log('Current Route:', pathname)

  let redirectDestination: string | null = null

  // 1. Unauthenticated users cannot access protected routes
  const PUBLIC_ROUTES = ['/signin', '/signup', '/auth/callback', '/access-denied']
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  
  if (!userId && !isPublicRoute) {
    redirectDestination = `/signin?redirectTo=${encodeURIComponent(pathname)}`
  }
  
  // 2. Authenticated users shouldn't see auth pages
  else if (userId && (pathname.startsWith('/signin') || pathname.startsWith('/signup'))) {
    redirectDestination = '/'
  }
  
  // 3. Admin routes are STRICTLY protected
  // Only exact 'admin' role can enter
  else if (pathname.startsWith('/admin') && userRole !== 'admin') {
    redirectDestination = '/access-denied'
  }
  
  // 4. Root route '/' handles role-based default destinations
  else if (pathname === '/') {
    if (userRole === 'admin') {
      redirectDestination = '/admin'
    } else {
      // If role = 'instructor' (or anything else, e.g. null due to missing profile)
      // we gracefully fall back to the dashboard.
      redirectDestination = '/dashboard'
    }
  }

  console.log('Redirect Destination:', redirectDestination || 'Proceed (No redirect)')
  console.log('===========================\n')

  return redirectDestination
}
