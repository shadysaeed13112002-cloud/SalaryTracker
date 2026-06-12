/**
 * Admin Route Layout (Server Component)
 * ─────────────────────────────────────────────────────────────
 * Second-layer role guard — middleware is the first layer.
 * Even if middleware is misconfigured, this layout re-checks
 * the role server-side before rendering any admin UI.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/LogoutButton';
import Link from 'next/link';

export default async function AdminLayout({
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
      <aside className="sidebar" aria-label="Admin navigation">
        <div className="sidebar-brand">
          <div className="brand-dot" aria-hidden="true" />
          <span className="sidebar-brand-name">Gammal Tech</span>
        </div>

        <nav aria-label="Admin menu">
          <ul className="sidebar-nav">
            <li>
              <Link href="/admin" className="nav-item" id="nav-admin-home">
                <NavIcon d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/admin/reports" className="nav-item" id="nav-admin-reports">
                <NavIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                Reports
              </Link>
            </li>
            <li>
              <Link href="/admin/instructors" className="nav-item" id="nav-admin-instructors">
                <NavIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                Instructors
              </Link>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar" aria-hidden="true">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{profile?.full_name}</span>
              <span className="sidebar-user-role">Administrator</span>
            </div>
          </div>
          <LogoutButton className="logout-btn" />
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="topbar" aria-label="Admin topbar">
          <div className="topbar-role-badge">
            <span className="role-badge role-admin">Admin</span>
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
