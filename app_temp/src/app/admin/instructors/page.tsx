import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Instructors — Gammal Tech Salary Tracker',
  description: 'View and manage all instructors.',
};

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Types ────────────────────────────────────────────────────────

interface Instructor {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  total_reports: number;
}

// ── Page ─────────────────────────────────────────────────────────

export default async function AdminInstructorsPage() {
  const supabase = await createClient();

  // 1. Fetch all instructors from the users table
  //    Schema: id, full_name, email, role, created_at (no status column)
  const { data: instructorRows, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, created_at')
    .eq('role', 'instructor')
    .order('created_at', { ascending: false });

  // 2. Get report counts per instructor
  let instructors: Instructor[] = [];

  if (instructorRows && instructorRows.length > 0) {
    const instructorIds = instructorRows.map((i) => i.id);

    const { data: reportCounts } = await supabase
      .from('daily_reports')
      .select('instructor_id')
      .in('instructor_id', instructorIds);

    // Build a count map
    const countMap: Record<string, number> = {};
    (reportCounts ?? []).forEach((r) => {
      countMap[r.instructor_id] = (countMap[r.instructor_id] ?? 0) + 1;
    });

    instructors = instructorRows.map((i) => ({
      id: i.id,
      full_name: i.full_name ?? 'Unknown',
      email: i.email ?? '—',
      role: i.role,
      created_at: i.created_at,
      total_reports: countMap[i.id] ?? 0,
    }));
  }

  // 3. Summary stats
  const totalInstructors = instructors.length;
  const totalReports = instructors.reduce((sum, i) => sum + i.total_reports, 0);

  const stats = [
    {
      id: 'stat-instructors',
      label: 'Total Instructors',
      value: String(totalInstructors),
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      color: 'stat-indigo',
    },
    {
      id: 'stat-total-reports',
      label: 'Total Reports',
      value: String(totalReports),
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'stat-amber',
    },
  ];

  return (
    <section aria-labelledby="instructors-heading">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 id="instructors-heading" className="page-title">Instructors</h1>
          <p className="page-subtitle">
            All registered instructors and their activity.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid stats-grid-4">
        {stats.map((s) => (
          <div key={s.id} id={s.id} className={`stat-card ${s.color}`}>
            <div className="stat-card-inner">
              <div>
                <p className="stat-label">{s.label}</p>
                <p className="stat-value">{s.value}</p>
              </div>
              <div className="stat-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="form-error-banner" role="alert">
          Failed to load instructors: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">All Instructors</h2>
          <span className="section-meta">{totalInstructors} instructor{totalInstructors !== 1 ? 's' : ''}</span>
        </div>

        {instructors.length === 0 && !error ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p>No instructors registered yet.</p>
          </div>
        ) : instructors.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="report-table-wrap">
              <table className="report-table instructor-table" aria-label="Instructors list" id="instructors-table">
                <thead>
                  <tr>
                    <th scope="col">Instructor</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Joined</th>
                    <th scope="col" className="th-center">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map((inst, idx) => (
                    <tr key={inst.id} id={`instructor-row-${idx}`} className="instructor-row-link">
                      <td>
                        <Link href={`/admin/instructors/${inst.id}`} className="instructor-cell">
                          <div className="instructor-avatar" aria-hidden="true">
                            {inst.full_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <span className="instructor-name-text">{inst.full_name}</span>
                        </Link>
                      </td>
                      <td className="td-email">{inst.email}</td>
                      <td>
                        <span className="role-badge role-instructor">{inst.role}</span>
                      </td>
                      <td className="td-date">{formatDate(inst.created_at)}</td>
                      <td className="td-center">
                        <span className="instructor-report-count">{inst.total_reports}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="instructor-cards">
              {instructors.map((inst, idx) => (
                <Link key={inst.id} href={`/admin/instructors/${inst.id}`} className="instructor-card" id={`instructor-card-${idx}`}>
                  <div className="instructor-card-header">
                    <div className="instructor-cell">
                      <div className="instructor-avatar" aria-hidden="true">
                        {inst.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="instructor-card-info">
                        <span className="instructor-name-text">{inst.full_name}</span>
                        <span className="instructor-card-email">{inst.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="instructor-card-body">
                    <div className="report-card-stat">
                      <span className="report-card-stat-label">Role</span>
                      <span className="report-card-stat-value">{inst.role}</span>
                    </div>
                    <div className="report-card-stat">
                      <span className="report-card-stat-label">Joined</span>
                      <span className="report-card-stat-value">{formatDate(inst.created_at)}</span>
                    </div>
                    <div className="report-card-stat">
                      <span className="report-card-stat-label">Reports</span>
                      <span className="report-card-stat-value">{inst.total_reports}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
