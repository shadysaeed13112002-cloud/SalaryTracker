/**
 * Root Page (/)
 * Server Component — reads the session and routes the user to
 * their role-appropriate dashboard. Middleware handles unauthenticated
 * users before this ever runs.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('\n--- Root Page Auth Check ---');
  console.log('Current authenticated user:', user ? 'Yes' : 'No');
  console.log('User ID:', user?.id);

  if (!user) redirect('/signin');

  const { data: profile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('Query result:', profile);
  console.log('Query error:', error);
  console.log('----------------------------\n');

  // If there's a profile, redirect based on role, defaulting to dashboard for safety
  if (profile) {
    if (profile.role === 'admin') redirect('/admin');
    redirect('/dashboard'); // Default fallback to dashboard if role is missing/instructor
  }

  // If no profile is found, it might be due to replication lag or RLS.
  // Instead of showing a dead-end screen, redirect to dashboard. The dashboard layout
  // will perform its own check and if it still fails, it can handle it or deny access.
  redirect('/dashboard');

}
