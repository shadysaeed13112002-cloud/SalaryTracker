import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Report — Gammal Tech Salary Tracker',
  description: 'Create a new daily session report.',
};

export default function NewReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
