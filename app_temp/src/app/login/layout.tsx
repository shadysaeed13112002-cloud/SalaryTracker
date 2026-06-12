import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redirecting — Gammal Tech Salary Tracker',
  description: 'Redirecting to sign in page.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
