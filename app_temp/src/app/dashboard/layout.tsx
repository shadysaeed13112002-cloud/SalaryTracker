/**
 * Instructor Dashboard Layout (Server Component)
 * Second-layer role guard for all /dashboard/* routes.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/LogoutButton';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar" aria-label="Instructor navigation">
        <div className="sidebar-brand">
          <div className="brand-dot brand-dot-green" aria-hidden="true" />
          <span className="sidebar-brand-name">Gammal Tech</span>
        </div>

        <nav aria-label="Instructor menu">
          <ul className="sidebar-nav">
            <li>
              <Link href="/dashboard" className="nav-item" id="nav-dashboard-home">
                <NavIcon d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" />
                My Dashboard
              </Link>
            </li>
            <li>
              <Link href="/dashboard/reports" className="nav-item" id="nav-dashboard-reports">
                <NavIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                My Reports
              </Link>
            </li>
            <li>
              <Link href="/dashboard/new-report" className="nav-item" id="nav-dashboard-new">
                <NavIcon d="M12 4v16m8-8H4" />
                New Report
              </Link>
            </li>
            <li>
              <Link href="/dashboard/salary" className="nav-item" id="nav-dashboard-salary">
                <NavIcon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                My Salary
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-green" aria-hidden="true">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'I'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{profile?.full_name}</span>
              <span className="sidebar-user-role">Instructor</span>
            </div>
          </div>
          <LogoutButton className="logout-btn" />
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="topbar" aria-label="Instructor topbar">
          <div className="topbar-role-badge">
            <span className="role-badge role-instructor">Instructor</span>
          </div>
        </header>
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
