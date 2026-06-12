import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Access Denied — Gammal Tech Salary Tracker',
  description: 'You do not have permission to view this page.',
};

export default function AccessDeniedPage() {
  return (
    <main className="denied-page" id="access-denied-main">
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />

      <div className="denied-card">
        <div className="denied-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#f87171" strokeWidth="2" />
            <path
              d="M16 16L32 32M32 16L16 32"
              stroke="#f87171"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className="denied-title">Access Denied</h1>
        <p className="denied-message">
          You don&rsquo;t have permission to view this page.
          <br />
          Please contact your administrator if you believe this is a mistake.
        </p>

        <div className="denied-actions">
          <Link href="/" className="btn-primary" id="denied-home-link">
            Go to Home
          </Link>
          <Link href="/signin" className="btn-ghost" id="denied-login-link">
            Sign in with another account
          </Link>
        </div>
      </div>
    </main>
  );
}
