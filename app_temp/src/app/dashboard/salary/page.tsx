import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getInstructorSalary } from '@/lib/salary';
import { SalaryChart } from './SalaryChart';

export const metadata: Metadata = {
  title: 'My Salary — Gammal Tech Salary Tracker',
  description: 'View your monthly salary breakdown based on approved session reports.',
};

// ── Formatters ─────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

// ── Current month hero card ────────────────────────────────────

function CurrentMonthHero({
  label,
  salary,
  reportCount,
}: {
  label: string;
  salary: number;
  reportCount: number;
}) {
  return (
    <div className="salary-hero" id="current-month-hero" aria-label="Current month salary">
      {/* Background glow */}
      <div className="salary-hero-glow" aria-hidden="true" />

      <div className="salary-hero-inner">
        <div className="salary-hero-left">
          <div className="salary-hero-badge">
            <span className="salary-hero-dot" aria-hidden="true" />
            Current Month
          </div>
          <h2 className="salary-hero-month">{label}</h2>
          <p className="salary-hero-meta">
            {reportCount} approved report{reportCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="salary-hero-right">
          <p className="salary-hero-label">Total Salary</p>
          <p className="salary-hero-amount">{formatCurrency(salary)}</p>
        </div>
      </div>
    </div>
  );
}

// ── History table row ──────────────────────────────────────────

function HistoryRow({
  monthLabel,
  monthKey,
  reportCount,
  salary,
  isCurrentMonth,
  rank,
  maxSalary,
}: {
  monthLabel: string;
  monthKey: string;
  reportCount: number;
  salary: number;
  isCurrentMonth: boolean;
  rank: number;
  maxSalary: number;
}) {
  const pct = maxSalary > 0 ? (salary / maxSalary) * 100 : 0;

  return (
    <tr
      className={`history-row ${isCurrentMonth ? 'history-row-current' : ''}`}
      id={`history-row-${monthKey}`}
    >
      {/* Month */}
      <td className="history-td history-td-month">
        <div className="history-month-cell">
          {isCurrentMonth && (
            <span className="history-current-badge" aria-label="Current month">Now</span>
          )}
          <span className="history-month-name">{monthLabel}</span>
        </div>
      </td>

      {/* Reports */}
      <td className="history-td history-td-center">
        <span className="history-report-count">
          {reportCount}
        </span>
      </td>

      {/* Visual bar + salary */}
      <td className="history-td history-td-bar">
        <div className="history-bar-wrap">
          <div className="history-bar-track">
            <div
              className={`history-bar-fill ${isCurrentMonth ? 'history-bar-fill-current' : ''}`}
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          </div>
          <span className={`history-salary ${isCurrentMonth ? 'history-salary-current' : ''}`}>
            {formatCurrency(salary)}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function SalaryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let salaryData;
  let fetchError: string | null = null;

  try {
    salaryData = await getInstructorSalary(supabase, user!.id);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load salary data.';
  }

  return (
    <section aria-labelledby="salary-page-heading">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
        <span aria-hidden="true" className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">My Salary</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 id="salary-page-heading" className="page-title">My Salary</h1>
          <p className="page-subtitle">
            Monthly earnings based on your approved session reports.
          </p>
        </div>
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="form-error-banner" role="alert">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          {fetchError}
        </div>
      )}

      {salaryData && (
        <>
          {/* All-time summary strip */}
          <div className="salary-summary-strip" id="salary-summary-strip">
            <div className="salary-strip-stat" id="strip-alltime-salary">
              <span className="salary-strip-label">All-Time Salary</span>
              <span className="salary-strip-value">
                {formatCurrency(salaryData.allTimeSalary)}
              </span>
            </div>
            <div className="salary-strip-divider" aria-hidden="true" />
            <div className="salary-strip-stat" id="strip-alltime-reports">
              <span className="salary-strip-label">Approved Reports</span>
              <span className="salary-strip-value">
                {salaryData.allTimeApprovedCount}
              </span>
            </div>
            <div className="salary-strip-divider" aria-hidden="true" />
            <div className="salary-strip-stat" id="strip-months-active">
              <span className="salary-strip-label">Active Months</span>
              <span className="salary-strip-value">
                {salaryData.history.length}
              </span>
            </div>
          </div>

          {/* Current month hero */}
          <CurrentMonthHero
            label={salaryData.currentMonth.monthLabel}
            salary={salaryData.currentMonth.totalSalary}
            reportCount={salaryData.currentMonth.approvedReportCount}
          />

          {/* History section */}
          {salaryData.history.length > 0 ? (
            <div className="section-card" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <h2 className="section-title">Monthly Breakdown</h2>
                <span className="section-meta">
                  {salaryData.history.length} month{salaryData.history.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Animated bar chart */}
              <div className="salary-chart-wrap">
                <SalaryChart months={salaryData.history} />
              </div>

              {/* History table */}
              <div className="report-table-wrap">
                <table
                  className="report-table history-table"
                  aria-label="Monthly salary history"
                >
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col" className="th-center">Approved Reports</th>
                      <th scope="col">Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryData.history.map((month, idx) => (
                      <HistoryRow
                        key={month.monthKey}
                        monthLabel={month.monthLabel}
                        monthKey={month.monthKey}
                        reportCount={month.approvedReportCount}
                        salary={month.totalSalary}
                        isCurrentMonth={month.isCurrentMonth}
                        rank={idx + 1}
                        maxSalary={salaryData.allTimeSalary > 0
                          ? Math.max(...salaryData.history.map((h: { totalSalary: number }) => h.totalSalary))
                          : 1}
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr id="history-table-footer">
                      <td className="history-td history-foot-label">All Time</td>
                      <td className="history-td history-td-center history-foot-count">
                        {salaryData.allTimeApprovedCount}
                      </td>
                      <td className="history-td history-foot-total">
                        {formatCurrency(salaryData.allTimeSalary)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* No approved reports yet */
            <div className="section-card" style={{ marginTop: '24px' }}>
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No approved reports yet.</p>
                <p className="empty-hint">
                  Submit daily reports and ask your admin to approve them to start earning.
                </p>
                <Link href="/dashboard/new-report" className="empty-cta" id="salary-new-report-link">
                  Create a report
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
