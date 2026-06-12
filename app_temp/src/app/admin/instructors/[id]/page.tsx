import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Instructor Details — Gammal Tech Salary Tracker',
  description: 'View instructor daily reports and current month salary.',
};

// ── Helpers ──────────────────────────────────────────────────────

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

// ── Types ────────────────────────────────────────────────────────

interface DailyReport {
  report_date: string;
  status: string;
  total_sessions: number;
  /** Average rate across all items for this report */
  session_rate: number;
  daily_salary: number;
}

// ── Page ─────────────────────────────────────────────────────────

export default async function InstructorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Verify instructor exists
  const { data: instructor } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', id)
    .eq('role', 'instructor')
    .single();

  if (!instructor) notFound();

  // 2. Determine current month date range
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  // Last day of current month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // 3. Fetch all reports for this instructor in the current month
  //    Using report_totals view which pre-aggregates total_sessions & grand_total
  const { data: reportRows, error } = await supabase
    .from('report_totals')
    .select('report_id, report_date, status, total_sessions, grand_total')
    .eq('instructor_id', id)
    .gte('report_date', monthStart)
    .lte('report_date', monthEnd)
    .order('report_date', { ascending: false });

  // 4. For each report, fetch report_items to get the session_rate
  let reports: DailyReport[] = [];

  if (reportRows && reportRows.length > 0) {
    const reportIds = reportRows.map((r) => r.report_id);

    const { data: allItems } = await supabase
      .from('report_items')
      .select('report_id, session_count, session_rate, total_amount')
      .in('report_id', reportIds);

    // Build a rate map: for reports with multiple items, compute weighted average rate
    const rateMap: Record<string, number> = {};
    const itemsByReport: Record<string, typeof allItems> = {};

    (allItems ?? []).forEach((item) => {
      if (!itemsByReport[item.report_id]) itemsByReport[item.report_id] = [];
      itemsByReport[item.report_id]!.push(item);
    });

    for (const [reportId, items] of Object.entries(itemsByReport)) {
      const totalSessions = items!.reduce((sum, i) => sum + i.session_count, 0);
      if (totalSessions > 0) {
        const totalAmount = items!.reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0);
        rateMap[reportId] = totalAmount / totalSessions;
      } else {
        rateMap[reportId] = 0;
      }
    }

    reports = reportRows.map((r) => ({
      report_date: r.report_date,
      status: r.status,
      total_sessions: Number(r.total_sessions),
      session_rate: rateMap[r.report_id] ?? 0,
      daily_salary: Number(r.grand_total),
    }));
  }

  // 5. Current month salary = sum of approved daily salaries only
  const currentMonthSalary = reports
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.daily_salary, 0);

  return (
    <section aria-labelledby="instructor-detail-heading">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/admin/instructors" className="breadcrumb-link">Instructors</Link>
        <span className="breadcrumb-sep" aria-hidden="true">›</span>
        <span className="breadcrumb-current">{instructor.full_name}</span>
      </nav>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 id="instructor-detail-heading" className="page-title">
            {instructor.full_name}
          </h1>
          <p className="page-subtitle">
            Daily reports for {monthLabel}
          </p>
        </div>
      </div>

      {/* Current Month Salary card */}
      <div className="detail-salary-card" id="current-month-salary">
        <div className="detail-salary-inner">
          <div className="detail-salary-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="detail-salary-label">Current Month Salary</p>
            <p className="detail-salary-value">{formatCurrency(currentMonthSalary)}</p>
            <p className="detail-salary-hint">
              Based on {reports.filter((r) => r.status === 'approved').length} approved report{reports.filter((r) => r.status === 'approved').length !== 1 ? 's' : ''} in {monthLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="form-error-banner" role="alert">
          Failed to load reports: {error.message}
        </div>
      )}

      {/* Reports table */}
      <div className="section-card" style={{ marginTop: '24px' }}>
        <div className="section-header">
          <h2 className="section-title">Daily Reports — {monthLabel}</h2>
          <span className="section-meta">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
        </div>

        {reports.length === 0 && !error ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No reports found for this instructor.</p>
          </div>
        ) : reports.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="report-table-wrap">
              <table className="report-table" aria-label="Daily reports" id="detail-reports-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col" className="th-center">Sessions</th>
                    <th scope="col" className="th-right">Session Rate</th>
                    <th scope="col" className="th-right">Daily Salary</th>
                    <th scope="col" className="th-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => (
                    <tr key={r.report_date} id={`detail-row-${idx}`}>
                      <td className="td-date">{formatDate(r.report_date)}</td>
                      <td className="td-sessions td-center">{r.total_sessions}</td>
                      <td className="td-amount td-right">{formatCurrency(r.session_rate)}</td>
                      <td className="td-amount td-right">{formatCurrency(r.daily_salary)}</td>
                      <td className="td-center">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="detail-foot-label">
                      Approved Total
                    </td>
                    <td className="td-right detail-foot-total">
                      {formatCurrency(currentMonthSalary)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="detail-report-cards">
              {reports.map((r, idx) => (
                <div key={r.report_date} className="detail-report-card" id={`detail-card-${idx}`}>
                  <div className="detail-report-card-header">
                    <span className="detail-report-card-date">{formatDate(r.report_date)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="detail-report-card-body">
                    <div className="report-card-stat">
                      <span className="report-card-stat-label">Sessions</span>
                      <span className="report-card-stat-value">{r.total_sessions}</span>
                    </div>
                    <div className="report-card-stat">
                      <span className="report-card-stat-label">Rate</span>
                      <span className="report-card-stat-value">{formatCurrency(r.session_rate)}</span>
                    </div>
                    <div className="report-card-stat">
                      <span className="report-card-stat-label">Daily Salary</span>
                      <span className="report-card-stat-value report-card-amount">{formatCurrency(r.daily_salary)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="detail-cards-total">
                <span>Approved Total</span>
                <span className="detail-cards-total-value">{formatCurrency(currentMonthSalary)}</span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
