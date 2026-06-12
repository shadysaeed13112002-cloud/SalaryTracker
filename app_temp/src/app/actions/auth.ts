'use server';

/**
 * Server Actions for Authentication
 * All credential handling happens server-side — never exposed to the client bundle.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ── Login ──────────────────────────────────────────────────────

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirectTo') as string) || '/';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Fetch user role to redirect to the correct dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    // If there's an explicit redirectTo, honour it; otherwise route by role
    if (redirectTo !== '/') {
      redirect(redirectTo);
    }

    if (role === 'admin') redirect('/admin');
    if (role === 'instructor') redirect('/dashboard');
  }

  redirect('/');
}

// ── Sign Up ────────────────────────────────────────────────────

export interface SignUpState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

export async function signUpAction(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const fullName = (formData.get('full_name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm_password') as string;

  // ── Validation ───────────────────────────────────────────────
  const fieldErrors: Record<string, string> = {};

  if (!fullName) {
    fieldErrors.full_name = 'Full name is required.';
  }

  if (!email) {
    fieldErrors.email = 'Email is required.';
  } else {
    // Basic email regex
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      fieldErrors.email = 'Please enter a valid email address.';
    }
  }

  if (!password) {
    fieldErrors.password = 'Password is required.';
  } else if (password.length < 6) {
    fieldErrors.password = 'Password must be at least 6 characters.';
  }

  if (!confirmPassword) {
    fieldErrors.confirm_password = 'Please confirm your password.';
  } else if (password && confirmPassword !== password) {
    fieldErrors.confirm_password = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // ── Create user in Supabase Auth ─────────────────────────────
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Something went wrong. Please try again.' };
  }

  // Sign out so the user is redirected to sign in
  await supabase.auth.signOut();

  redirect('/signin');
}
