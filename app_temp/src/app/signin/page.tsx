'use client';

/**
 * Sign In Page
 * Premium glassmorphism design with animated background.
 * Uses React's useActionState for progressive enhancement.
 */

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginAction, type LoginState } from '@/app/actions/auth';

const initialState: LoginState = {};

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="login-page" id="signin-main">
      {/* Animated background orbs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <div className="login-card" role="region" aria-label="Sign in form">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="brand-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#brandGrad)" />
              <path
                d="M8 22L14 10L20 18L24 14"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="brand-name">Gammal Tech</h1>
            <p className="brand-tagline">Salary Tracker</p>
          </div>
        </div>

        <h2 className="login-heading">Welcome back</h2>
        <p className="login-subheading">Sign in to your account to continue</p>

        {/* Error banner */}
        {state?.error && (
          <div className="error-banner" role="alert" aria-live="assertive">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            {state.error}
          </div>
        )}

        <form action={formAction} className="login-form" noValidate>
          {/* Hidden redirectTo so the Server Action knows where to send the user */}
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="field-group">
            <label htmlFor="email" className="field-label">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={pending}
              placeholder="you@example.com"
              className="field-input"
              aria-describedby={state?.error ? 'login-error' : undefined}
            />
          </div>

          <div className="field-group">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              placeholder="••••••••"
              className="field-input"
            />
          </div>

          <button
            id="signin-submit"
            type="submit"
            disabled={pending}
            className="login-btn"
            aria-busy={pending}
          >
            {pending ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="auth-switch-link">
            Create one
          </Link>
        </p>

        <p className="login-footer">
          Gammal Tech Salary Tracker
        </p>
      </div>
    </main>
  );
}
