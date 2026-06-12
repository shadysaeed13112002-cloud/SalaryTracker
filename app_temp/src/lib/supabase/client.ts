/**
 * Browser-side Supabase client.
 * Use this inside Client Components ('use client').
 * Creates a singleton so only one instance is used per tab.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
