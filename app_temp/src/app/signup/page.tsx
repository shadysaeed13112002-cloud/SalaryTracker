'use client';

/**
 * Sign Up Page
 * Premium glassmorphism design with animated background.
 * Uses React's useActionState for progressive enhancement.
 */

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpAction, type SignUpState } from '@/app/actions/auth';

const initialState: SignUpState = {};

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <main className="login-page" id="signup-main">
      {/* Animated background orbs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <div className="login-card" role="region" aria-label="Sign up form">
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

        <h2 className="login-heading">Create your account</h2>
        <p className="login-subheading">Join Gammal Tech Salary Tracker to get started</p>

        {/* Success banner */}
        {state?.success && (
          <div className="success-banner" role="status" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.06 5.06-3.5 3.5a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06L7 7.94l2.97-2.97a.75.75 0 0 1 1.06 1.06z" />
            </svg>
            {state.success}
          </div>
        )}

        {/* Error banner */}
        {state?.error && (
          <div className="error-banner" role="alert" aria-live="assertive">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            {state.error}
          </div>
        )}

        {/* Field errors */}
        {state?.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
          <div className="error-banner" role="alert" aria-live="assertive">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <div>
              {Object.values(state.fieldErrors).map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          </div>
        )}

        <form action={formAction} className="login-form" noValidate>
          <div className="field-group">
            <label htmlFor="full_name" className="field-label">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              disabled={pending}
              placeholder="John Doe"
              className={`field-input ${state?.fieldErrors?.full_name ? 'input-error' : ''}`}
            />
          </div>

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
              className={`field-input ${state?.fieldErrors?.email ? 'input-error' : ''}`}
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
              autoComplete="new-password"
              required
              disabled={pending}
              placeholder="••••••••"
              className={`field-input ${state?.fieldErrors?.password ? 'input-error' : ''}`}
            />
          </div>

          <div className="field-group">
            <label htmlFor="confirm_password" className="field-label">
              Confirm Password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              disabled={pending}
              placeholder="••••••••"
              className={`field-input ${state?.fieldErrors?.confirm_password ? 'input-error' : ''}`}
            />
          </div>

          <button
            id="signup-submit"
            type="submit"
            disabled={pending}
            className="login-btn"
            aria-busy={pending}
          >
            {pending ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link href="/signin" className="auth-switch-link">
            Sign in
          </Link>
        </p>

        <p className="login-footer">
          Gammal Tech Salary Tracker
        </p>
      </div>
    </main>
  );
}
