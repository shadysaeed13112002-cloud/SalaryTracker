import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin Dashboard — Gammal Tech Salary Tracker',
  description: 'Manage instructors, reports and approvals.',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    pending:  { label: 'Pending',  cls: 'badge-amber', dot: 'dot-amber' },
    approved: { label: 'Approved', cls: 'badge-green', dot: 'dot-green' },
    rejected: { label: 'Rejected', cls: 'badge-red',   dot: 'dot-red'   },
  };
  const cfg = map[status] ?? { label: status, cls: 'badge-gray', dot: 'dot-gray' };
  return (
    <span className={`status-badge ${cfg.cls}`}>
      <span className={`status-dot ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { data: recentReports },
    { data: approvedTotals },
  ] = await Promise.all([
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }),
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    // 8 most recent across all instructors
    supabase
      .from('report_totals')
      .select('report_id, instructor_name, report_date, status, grand_total, total_sessions')
      .order('report_date', { ascending: false })
      .limit(8),
    // Sum of all approved grand totals
    supabase
      .from('report_totals')
      .select('grand_total')
      .eq('status', 'approved'),
  ]);

  const totalApproved = (approvedTotals ?? []).reduce(
    (sum, r) => sum + Number(r.grand_total ?? 0),
    0
  );

  const stats = [
    {
      id: 'stat-total',
      label: 'Total Reports',
      value: String(totalCount ?? 0),
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'stat-indigo',
    },
    {
      id: 'stat-pending',
      label: 'Pending',
      value: String(pendingCount ?? 0),
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'stat-amber',
    },
    {
      id: 'stat-approved',
      label: 'Approved',
      value: String(approvedCount ?? 0),
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'stat-green',
    },
    {
      id: 'stat-rejected',
      label: 'Rejected',
      value: String(rejectedCount ?? 0),
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'stat-red',
    },
  ];

  return (
    <section aria-labelledby="admin-dashboard-heading">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 id="admin-dashboard-heading" className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of all instructor reports and payroll.
          </p>
        </div>
        <Link href="/admin/reports?status=pending" className="btn-cta" id="review-pending-cta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Review Pending
          {(pendingCount ?? 0) > 0 && (
            <span className="cta-badge">{pendingCount}</span>
          )}
        </Link>
      </div>

      {/* 4 Stats */}
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

      {/* Approved payroll callout */}
      <div className="payroll-callout" id="payroll-callout">
        <div className="payroll-callout-inner">
          <div className="payroll-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="payroll-label">Total Approved Payroll</p>
            <p className="payroll-value">{formatCurrency(totalApproved)}</p>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="section-card" style={{ marginTop: '24px' }}>
        <div className="section-header">
          <h2 className="section-title">Recent Reports</h2>
          <Link href="/admin/reports" className="section-link" id="view-all-admin-link">
            View all →
          </Link>
        </div>

        {!recentReports || recentReports.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No reports submitted yet.</p>
          </div>
        ) : (
          <div className="report-table-wrap">
            <table className="report-table" aria-label="Recent reports">
              <thead>
                <tr>
                  <th scope="col">Instructor</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="th-center">Sessions</th>
                  <th scope="col" className="th-right">Total</th>
                  <th scope="col" className="th-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r, idx) => (
                  <tr key={r.report_id} id={`dash-report-row-${idx}`}>
                    <td>
                      <div className="instructor-cell">
                        <div className="instructor-avatar" aria-hidden="true">
                          {r.instructor_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        {r.instructor_name}
                      </div>
                    </td>
                    <td className="td-date">{formatDate(r.report_date)}</td>
                    <td className="td-sessions td-center">{r.total_sessions}</td>
                    <td className="td-amount td-right">
                      {formatCurrency(Number(r.grand_total))}
                    </td>
                    <td className="td-center">
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
