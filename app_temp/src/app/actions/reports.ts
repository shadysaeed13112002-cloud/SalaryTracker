'use server';

/**
 * Server Actions — Reports
 * Handles creating a daily report and its items atomically.
 */

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ── Types ──────────────────────────────────────────────────────

export interface ReportEntry {
  session_count: number;
  session_rate: number;
}

export interface CreateReportState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

// ── Create Report Action ────────────────────────────────────────

export async function createReportAction(
  _prevState: CreateReportState,
  formData: FormData
): Promise<CreateReportState> {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  // Parse fields
  const reportDate = formData.get('report_date') as string;

  if (!reportDate) {
    return { fieldErrors: { report_date: 'Please select a report date.' } };
  }

  // Parse entries — they come in as entries[0][session_count], entries[0][session_rate] …
  const entries: ReportEntry[] = [];
  let i = 0;
  while (formData.has(`entries[${i}][session_count]`)) {
    const count = Number(formData.get(`entries[${i}][session_count]`));
    const rate = Number(formData.get(`entries[${i}][session_rate]`));

    if (!count || count <= 0) {
      return { fieldErrors: { [`entries[${i}][session_count]`]: `Entry ${i + 1}: session count must be > 0.` } };
    }
    if (!rate || rate <= 0) {
      return { fieldErrors: { [`entries[${i}][session_rate]`]: `Entry ${i + 1}: session rate must be > 0.` } };
    }

    entries.push({ session_count: count, session_rate: rate });
    i++;
  }

  if (entries.length === 0) {
    return { error: 'Add at least one session entry.' };
  }

  // ── Insert report header ──
  const { data: report, error: reportError } = await supabase
    .from('daily_reports')
    .insert({
      instructor_id: user.id,
      report_date: reportDate,
      status: 'pending',
    })
    .select('id')
    .single();

  if (reportError) {
    // Unique constraint violation = duplicate date
    if (reportError.code === '23505') {
      return { fieldErrors: { report_date: 'A report already exists for this date.' } };
    }
    return { error: reportError.message };
  }

  // ── Insert all report items ──
  const items = entries.map((e) => ({
    report_id: report.id,
    session_count: e.session_count,
    session_rate: e.session_rate,
    // total_amount is GENERATED ALWAYS — do NOT send it
  }));

  const { error: itemsError } = await supabase.from('report_items').insert(items);

  if (itemsError) {
    // Roll back the report header if items fail
    await supabase.from('daily_reports').delete().eq('id', report.id);
    return { error: itemsError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/reports');
  redirect('/dashboard/reports');
}
