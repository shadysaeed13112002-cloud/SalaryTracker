import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'My Reports — Gammal Tech Salary Tracker',
  description: 'View all your submitted daily session reports.',
};

// ── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Status badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    pending:  { label: 'Pending',  cls: 'badge-amber', dot: 'dot-amber'  },
    approved: { label: 'Approved', cls: 'badge-green', dot: 'dot-green'  },
    rejected: { label: 'Rejected', cls: 'badge-red',   dot: 'dot-red'    },
  };
  const cfg = map[status] ?? { label: status, cls: 'badge-gray', dot: 'dot-gray' };
  return (
    <span className={`status-badge ${cfg.cls}`}>
      <span className={`status-dot ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all reports for this instructor via the report_totals view
  const { data: reports, error } = await supabase
    .from('report_totals')
    .select('report_id, report_date, status, grand_total, total_sessions')
    .eq('instructor_id', user!.id)
    .order('report_date', { ascending: false });

  return (
    <section aria-labelledby="reports-page-heading">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 id="reports-page-heading" className="page-title">My Reports</h1>
          <p className="page-subtitle">
            All your submitted daily session reports.
          </p>
        </div>
        <Link href="/dashboard/new-report" className="btn-cta" id="new-report-from-list">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v16m8-8H4" />
          </svg>
          New Report
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="form-error-banner" role="alert">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          Failed to load reports: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!error && (!reports || reports.length === 0) && (
        <div className="section-card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>You haven&apos;t submitted any reports yet.</p>
            <Link href="/dashboard/new-report" className="empty-cta" id="empty-state-new-report">
              Create your first report
            </Link>
          </div>
        </div>
      )}

      {/* Reports list */}
      {reports && reports.length > 0 && (
        <div className="section-card">
          {/* Summary strip */}
          <div className="list-summary">
            <span className="list-summary-count">
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </span>
            <span className="list-summary-total">
              Approved total:{' '}
              <strong>
                {formatCurrency(
                  reports
                    .filter((r) => r.status === 'approved')
                    .reduce((s, r) => s + Number(r.grand_total ?? 0), 0)
                )}
              </strong>
            </span>
          </div>

          {/* Table — desktop */}
          <div className="report-table-wrap">
            <table className="report-table" aria-label="All reports">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col" className="th-center">Sessions</th>
                  <th scope="col" className="th-right">Amount</th>
                  <th scope="col" className="th-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r.report_id} id={`report-row-${idx}`}>
                    <td className="td-date">{formatDate(r.report_date)}</td>
                    <td className="td-sessions td-center">{r.total_sessions}</td>
                    <td className="td-amount td-right">
                      {formatCurrency(Number(r.grand_total ?? 0))}
                    </td>
                    <td className="td-center">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="report-cards">
            {reports.map((r, idx) => (
              <div key={r.report_id} className="report-card" id={`report-card-${idx}`}>
                <div className="report-card-header">
                  <span className="report-card-date">{formatDate(r.report_date)}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="report-card-body">
                  <div className="report-card-stat">
                    <span className="report-card-stat-label">Sessions</span>
                    <span className="report-card-stat-value">{r.total_sessions}</span>
                  </div>
                  <div className="report-card-stat">
                    <span className="report-card-stat-label">Total</span>
                    <span className="report-card-stat-value report-card-amount">
                      {formatCurrency(Number(r.grand_total ?? 0))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
