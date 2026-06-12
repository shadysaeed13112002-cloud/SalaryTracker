import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ReportTable, type Report } from './ReportTable';

export const metadata: Metadata = {
  title: 'All Reports — Gammal Tech Salary Tracker',
  description: 'Review, approve and reject instructor daily reports.',
};

// ── Status filter badge ────────────────────────────────────────

function FilterBadge({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      className={`filter-badge ${active ? 'filter-badge-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      <span className="filter-badge-count">{count}</span>
    </a>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;
  const supabase = await createClient();

  // Count by status for filter tabs
  const [
    { count: totalCount },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }),
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
  ]);

  // Fetch reports from report_totals view + join entries
  let query = supabase
    .from('report_totals')
    .select('report_id, instructor_id, instructor_name, report_date, status, grand_total, total_sessions')
    .order('report_date', { ascending: false });

  if (filterStatus && ['pending', 'approved', 'rejected'].includes(filterStatus)) {
    query = query.eq('status', filterStatus);
  }

  const { data: reportRows, error } = await query;

  // For each report, fetch its items (report_items)
  let reports: Report[] = [];

  if (reportRows && reportRows.length > 0) {
    const reportIds = reportRows.map((r) => r.report_id);

    const { data: allItems } = await supabase
      .from('report_items')
      .select('id, report_id, session_count, session_rate, total_amount')
      .in('report_id', reportIds);

    // Also fetch admin_note from daily_reports for rejected ones
    const { data: reportNotes } = await supabase
      .from('daily_reports')
      .select('id, admin_note')
      .in('id', reportIds);

    const noteMap = Object.fromEntries(
      (reportNotes ?? []).map((r) => [r.id, r.admin_note])
    );

    const itemsByReport = (allItems ?? []).reduce<Record<string, typeof allItems>>((acc, item) => {
      if (!acc[item.report_id]) acc[item.report_id] = [];
      acc[item.report_id]!.push(item);
      return acc;
    }, {});

    reports = reportRows.map((r) => ({
      report_id: r.report_id,
      instructor_name: r.instructor_name,
      report_date: r.report_date,
      status: r.status,
      grand_total: Number(r.grand_total),
      total_sessions: Number(r.total_sessions),
      admin_note: noteMap[r.report_id] ?? null,
      entries: (itemsByReport[r.report_id] ?? []).map((e) => ({
        id: e.id,
        session_count: e.session_count,
        session_rate: Number(e.session_rate),
        total_amount: Number(e.total_amount),
      })),
    }));
  }

  const filters = [
    { label: 'All', count: totalCount ?? 0,    status: undefined,    href: '/admin/reports'              },
    { label: 'Pending',  count: pendingCount ?? 0,  status: 'pending',  href: '/admin/reports?status=pending'  },
    { label: 'Approved', count: approvedCount ?? 0, status: 'approved', href: '/admin/reports?status=approved' },
    { label: 'Rejected', count: rejectedCount ?? 0, status: 'rejected', href: '/admin/reports?status=rejected' },
  ];

  return (
    <section aria-labelledby="admin-reports-heading">
      <div className="page-header">
        <div>
          <h1 id="admin-reports-heading" className="page-title">All Reports</h1>
          <p className="page-subtitle">
            Review, approve and reject instructor session reports.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <nav className="filter-tabs" aria-label="Filter reports by status">
        {filters.map((f) => (
          <FilterBadge
            key={f.label}
            label={f.label}
            count={f.count}
            active={filterStatus === f.status}
            href={f.href}
          />
        ))}
      </nav>

      {error && (
        <div className="form-error-banner" role="alert">
          Failed to load reports: {error.message}
        </div>
      )}

      <div className="section-card" style={{ marginTop: '20px' }}>
        {reports.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>
              {filterStatus
                ? `No ${filterStatus} reports found.`
                : 'No reports have been submitted yet.'}
            </p>
          </div>
        ) : (
          <ReportTable reports={reports} />
        )}
      </div>
    </section>
  );
}
