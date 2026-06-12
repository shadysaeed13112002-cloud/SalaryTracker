/**
 * Next.js Root Proxy (Middleware)
 * ─────────────────────────────────────────────────────────────
 * Runs on every matched request BEFORE the page renders.
 * All logic is delegated to the updateSession helper.
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
