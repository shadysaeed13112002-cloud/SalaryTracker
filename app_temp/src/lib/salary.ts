/**
 * Salary Service
 * ─────────────────────────────────────────────────────────────
 * Reusable, pure calculation layer for instructor salary data.
 * Accepts a Supabase server client and an instructor ID.
 * Has no UI dependencies — can be used in Server Components,
 * Server Actions, API routes, or cron jobs alike.
 *
 * Salary rule:
 *   SUM(report_items.total_amount)
 *   WHERE daily_reports.status = 'approved'
 *   AND   daily_reports.instructor_id = <id>
 *   GROUP BY YEAR-MONTH of daily_reports.report_date
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Output types ───────────────────────────────────────────────

export interface MonthlySalarySummary {
  /** e.g. "2025-06" */
  monthKey: string;
  /** e.g. "June 2025" */
  monthLabel: string;
  /** Indicates if this is the current calendar month */
  isCurrentMonth: boolean;
  /** Number of approved reports in this month */
  approvedReportCount: number;
  /** Total salary earned (sum of all approved report_items.total_amount) */
  totalSalary: number;
}

export interface SalaryData {
  /** Current month summary */
  currentMonth: MonthlySalarySummary;
  /** All months with approved reports, sorted newest → oldest */
  history: MonthlySalarySummary[];
  /** Grand total across all time */
  allTimeSalary: number;
  /** Total approved report count across all time */
  allTimeApprovedCount: number;
}

// ── Helpers ────────────────────────────────────────────────────

function toMonthKey(dateStr: string): string {
  // dateStr is a DATE string like "2025-06-14" → "2025-06"
  return dateStr.slice(0, 7);
}

function toMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ── Core service function ──────────────────────────────────────

export async function getInstructorSalary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  instructorId: string
): Promise<SalaryData> {
  // Fetch all approved reports for this instructor via report_totals view.
  // report_totals already has grand_total (pre-aggregated per report).
  const { data: rows, error } = await supabase
    .from('report_totals')
    .select('report_id, report_date, status, grand_total')
    .eq('instructor_id', instructorId)
    .eq('status', 'approved')
    .order('report_date', { ascending: false });

  if (error) throw new Error(`Salary fetch failed: ${error.message}`);

  const approvedRows = rows ?? [];

  // ── Group by month ─────────────────────────────────────────

  const monthMap = new Map<
    string,
    { salary: number; count: number }
  >();

  for (const row of approvedRows) {
    const key = toMonthKey(row.report_date as string);
    const existing = monthMap.get(key) ?? { salary: 0, count: 0 };
    monthMap.set(key, {
      salary: existing.salary + Number(row.grand_total ?? 0),
      count:  existing.count + 1,
    });
  }

  // ── Build sorted history ───────────────────────────────────

  const thisMonthKey = currentMonthKey();

  const history: MonthlySalarySummary[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([key, { salary, count }]) => ({
      monthKey: key,
      monthLabel: toMonthLabel(key),
      isCurrentMonth: key === thisMonthKey,
      approvedReportCount: count,
      totalSalary: salary,
    }));

  // ── Current month (always present, even if zero) ───────────

  const currentMonthData = monthMap.get(thisMonthKey);
  const currentMonth: MonthlySalarySummary = {
    monthKey: thisMonthKey,
    monthLabel: toMonthLabel(thisMonthKey),
    isCurrentMonth: true,
    approvedReportCount: currentMonthData?.count  ?? 0,
    totalSalary:         currentMonthData?.salary ?? 0,
  };

  // ── Aggregate totals ───────────────────────────────────────

  const allTimeSalary = approvedRows.reduce(
    (sum, r) => sum + Number(r.grand_total ?? 0),
    0
  );

  return {
    currentMonth,
    history,
    allTimeSalary,
    allTimeApprovedCount: approvedRows.length,
  };
}
