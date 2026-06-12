'use server';

/**
 * Server Actions — Admin
 * Approve or reject a daily report.
 * Both actions verify the caller is an admin before writing.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ── Shared result type ─────────────────────────────────────────

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────

async function assertAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase: null, error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { supabase: null, error: 'Forbidden: admin only.' };
  }

  return { supabase, error: null };
}

// ── Approve ────────────────────────────────────────────────────

export async function approveReportAction(
  reportId: string
): Promise<AdminActionResult> {
  const { supabase, error: authError } = await assertAdmin();
  if (!supabase) return { success: false, error: authError! };

  const { error } = await supabase
    .from('daily_reports')
    .update({ status: 'approved', admin_note: null })
    .eq('id', reportId)
    .eq('status', 'pending'); // Only pending reports can be approved

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  return { success: true };
}

// ── Reject ─────────────────────────────────────────────────────

export async function rejectReportAction(
  reportId: string,
  adminNote: string
): Promise<AdminActionResult> {
  const { supabase, error: authError } = await assertAdmin();
  if (!supabase) return { success: false, error: authError! };

  const note = adminNote.trim();
  if (!note) {
    return { success: false, error: 'A rejection reason is required.' };
  }
  if (note.length > 500) {
    return { success: false, error: 'Note must be 500 characters or fewer.' };
  }

  const { error } = await supabase
    .from('daily_reports')
    .update({ status: 'rejected', admin_note: note })
    .eq('id', reportId)
    .eq('status', 'pending'); // Only pending reports can be rejected

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  return { success: true };
}
