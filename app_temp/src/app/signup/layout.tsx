import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up — Gammal Tech Salary Tracker',
  description: 'Create your account for the Gammal Tech Salary Tracker.',
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Suspense boundary required because the page uses useSearchParams()
  return <Suspense>{children}</Suspense>;
}
