import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'My Dashboard — Gammal Tech Salary Tracker',
  description: 'View your session report stats and recent activity.',
};

// ── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
  return { start, end };
}

// ── Status badge helper ────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'Pending',  cls: 'badge-amber'  },
    approved: { label: 'Approved', cls: 'badge-green'  },
    rejected: { label: 'Rejected', cls: 'badge-red'    },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'badge-gray' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

// ── Page ───────────────────────────────────────────────────────

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { start, end } = getMonthRange();

  // Parallel data fetching
  const [
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { data: monthlySalaryData },
    { data: recentReports },
  ] = await Promise.all([
    supabase
      .from('daily_reports')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', user!.id)
      .eq('status', 'pending'),

    supabase
      .from('daily_reports')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', user!.id)
      .eq('status', 'approved'),

    supabase
      .from('daily_reports')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', user!.id)
      .eq('status', 'rejected'),

    // Current month salary = sum of grand_total for approved reports this month
    supabase
      .from('report_totals')
      .select('grand_total')
      .eq('instructor_id', user!.id)
      .eq('status', 'approved')
      .gte('report_date', start)
      .lte('report_date', end),

    // Recent 6 reports
    supabase
      .from('report_totals')
      .select('report_id, report_date, status, grand_total, total_sessions')
      .eq('instructor_id', user!.id)
      .order('report_date', { ascending: false })
      .limit(6),
  ]);

  const monthlySalary = (monthlySalaryData ?? []).reduce(
    (sum, r) => sum + Number(r.grand_total ?? 0),
    0
  );

  const stats = [
    {
      id: 'stat-pending',
      label: 'Pending',
      value: pendingCount ?? 0,
      displayValue: String(pendingCount ?? 0),
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'stat-amber',
    },
    {
      id: 'stat-approved',
      label: 'Approved',
      value: approvedCount ?? 0,
      displayValue: String(approvedCount ?? 0),
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'stat-green',
    },
    {
      id: 'stat-rejected',
      label: 'Rejected',
      value: rejectedCount ?? 0,
      displayValue: String(rejectedCount ?? 0),
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'stat-red',
    },
    {
      id: 'stat-salary',
      label: 'This Month Salary',
      value: monthlySalary,
      displayValue: formatCurrency(monthlySalary),
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'stat-indigo',
    },
  ];

  return (
    <section aria-labelledby="instructor-dashboard-heading">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 id="instructor-dashboard-heading" className="page-title">
            My Dashboard
          </h1>
          <p className="page-subtitle">
            Track your sessions and report submissions.
          </p>
        </div>
        <Link href="/dashboard/new-report" className="btn-cta" id="new-report-cta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v16m8-8H4" />
          </svg>
          New Report
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid stats-grid-4">
        {stats.map((s) => {
          const isSalary = s.id === 'stat-salary';
          const CardEl = isSalary ? 'a' : 'div';
          return (
            <CardEl
              key={s.id}
              id={s.id}
              className={`stat-card ${s.color}${isSalary ? ' stat-card-link' : ''}`}
              {...(isSalary ? { href: '/dashboard/salary', 'aria-label': 'View salary details' } : {})}
            >
              <div className="stat-card-inner">
                <div>
                  <p className="stat-label">{s.label}</p>
                  <p className="stat-value">{s.displayValue}</p>
                </div>
                <div className="stat-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.icon} />
                  </svg>
                </div>
              </div>
              {isSalary && (
                <p className="stat-card-hint">View breakdown →</p>
              )}
            </CardEl>
          );
        })}
      </div>

      {/* Recent Reports */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Recent Reports</h2>
          <Link href="/dashboard/reports" className="section-link" id="view-all-reports-link">
            View all →
          </Link>
        </div>

        {!recentReports || recentReports.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No reports yet.</p>
            <Link href="/dashboard/new-report" className="empty-cta" id="empty-new-report-link">
              Create your first report
            </Link>
          </div>
        ) : (
          <div className="report-table-wrap">
            <table className="report-table" aria-label="Recent reports">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sessions</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r) => (
                  <tr key={r.report_id}>
                    <td className="td-date">
                      {new Date(r.report_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="td-sessions">{r.total_sessions}</td>
                    <td className="td-amount">{formatCurrency(Number(r.grand_total))}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
