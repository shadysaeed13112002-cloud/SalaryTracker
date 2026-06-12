import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session securely using PKCE flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Successfully exchanged the code for a session.
      // Redirect to the destination page.
      return NextResponse.redirect(new URL(next, request.url));
    }
    
    // If there is an error, we could log it here
    console.error('Error exchanging code for session:', error.message);
  }

  // If there's no code or an error occurred during exchange,
  // redirect the user to an error page or back to sign in.
  return NextResponse.redirect(new URL('/signin?error=Verification_failed', request.url));
}
