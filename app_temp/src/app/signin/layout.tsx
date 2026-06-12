import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Gammal Tech Salary Tracker',
  description: 'Sign in to the Gammal Tech Salary Tracker.',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Suspense boundary required because the page uses useSearchParams()
  return <Suspense>{children}</Suspense>;
}
