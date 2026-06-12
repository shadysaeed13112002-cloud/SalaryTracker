'use client';

/**
 * ReportTable — Client Component
 *
 * Displays all reports with:
 *  - Expandable row to show session entries
 *  - Approve button (instant, no modal)
 *  - Reject button → opens inline rejection modal requiring an admin note
 *  - Optimistic status updates while Server Actions run
 */

import { useState, useTransition, useRef, useEffect } from 'react';
import {
  approveReportAction,
  rejectReportAction,
} from '@/app/actions/admin';

// ── Types ──────────────────────────────────────────────────────

export interface ReportEntry {
  id: string;
  session_count: number;
  session_rate: number;
  total_amount: number;
}

export interface Report {
  report_id: string;
  instructor_name: string;
  report_date: string;
  status: string;
  grand_total: number;
  total_sessions: number;
  admin_note?: string | null;
  entries: ReportEntry[];
}

// ── Helpers ────────────────────────────────────────────────────

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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Status badge ───────────────────────────────────────────────

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

// ── Rejection Modal ────────────────────────────────────────────

interface RejectModalProps {
  reportId: string;
  instructorName: string;
  onClose: () => void;
  onSuccess: (reportId: string) => void;
  onError: (msg: string) => void;
}

function RejectModal({
  reportId,
  instructorName,
  onClose,
  onSuccess,
  onError,
}: RejectModalProps) {
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    startTransition(async () => {
      const result = await rejectReportAction(reportId, note.trim());
      if (result.success) {
        onSuccess(reportId);
        onClose();
      } else {
        onError(result.error ?? 'Failed to reject report.');
      }
    });
  };

  const remaining = 500 - note.length;

  return (
    /* Backdrop */
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-wrap" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 id="reject-modal-title" className="modal-title">Reject Report</h2>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            id="reject-modal-close"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p className="modal-subtitle">
            You are rejecting the report submitted by{' '}
            <strong className="modal-name">{instructorName}</strong>.
            <br />
            Please provide a reason so the instructor can correct and resubmit.
          </p>

          <form id="reject-form" onSubmit={handleSubmit}>
            <div className="modal-field">
              <label htmlFor="admin-note" className="modal-label">
                Rejection Reason
                <span className="required-star" aria-hidden="true"> *</span>
              </label>
              <textarea
                id="admin-note"
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="e.g. Session counts don't match the schedule records for this date…"
                required
                disabled={isPending}
                rows={4}
                maxLength={500}
                className="modal-textarea"
                aria-describedby="char-count"
              />
              <div id="char-count" className={`char-count ${remaining < 50 ? 'char-count-warn' : ''}`}>
                {remaining} characters remaining
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="btn-cancel"
            id="reject-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="reject-form"
            disabled={isPending || !note.trim()}
            className="btn-reject-confirm"
            id="reject-confirm-btn"
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Rejecting…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirm Rejection
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Row ─────────────────────────────────────────────────

interface ReportRowProps {
  report: Report;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  optimisticStatus?: string;
  isPending: boolean;
}

function ReportRow({ report, onApprove, onReject, optimisticStatus, isPending }: ReportRowProps) {
  const [expanded, setExpanded] = useState(false);
  const status = optimisticStatus ?? report.status;
  const isActioned = status !== 'pending';

  return (
    <>
      {/* Main row */}
      <tr
        className={`report-row ${isPending ? 'row-pending-action' : ''}`}
        id={`report-row-${report.report_id}`}
      >
        {/* Expand toggle */}
        <td className="td-expand">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="expand-btn"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} report for ${report.instructor_name}`}
            id={`expand-${report.report_id}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease' }}
              aria-hidden="true"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </td>

        {/* Instructor */}
        <td className="td-instructor">
          <div className="instructor-cell">
            <div className="instructor-avatar" aria-hidden="true">
              {report.instructor_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span>{report.instructor_name}</span>
          </div>
        </td>

        {/* Date */}
        <td className="td-date">{formatDate(report.report_date)}</td>

        {/* Entries count */}
        <td className="td-entries td-center">
          <span className="entries-badge">
            {report.entries.length} {report.entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </td>

        {/* Total */}
        <td className="td-amount td-right">
          {formatCurrency(Number(report.grand_total))}
        </td>

        {/* Status */}
        <td className="td-center">
          <StatusBadge status={status} />
        </td>

        {/* Actions */}
        <td className="td-actions">
          {!isActioned ? (
            <div className="action-btns">
              <button
                type="button"
                onClick={() => onApprove(report.report_id)}
                disabled={isPending}
                className="btn-approve"
                id={`approve-${report.report_id}`}
                aria-label={`Approve report by ${report.instructor_name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </button>
              <button
                type="button"
                onClick={() => onReject(report.report_id)}
                disabled={isPending}
                className="btn-reject"
                id={`reject-${report.report_id}`}
                aria-label={`Reject report by ${report.instructor_name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          ) : (
            <span className="actioned-label">—</span>
          )}
        </td>
      </tr>

      {/* Expanded entries sub-row */}
      {expanded && (
        <tr className="entries-row" id={`entries-${report.report_id}`}>
          <td colSpan={7} className="entries-cell">
            <div className="entries-panel">
              {/* Admin note (if rejected) */}
              {status === 'rejected' && report.admin_note && (
                <div className="admin-note-banner" role="note">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span><strong>Admin note:</strong> {report.admin_note}</span>
                </div>
              )}

              {/* Entries table */}
              <table className="entries-table" aria-label={`Session entries for ${report.instructor_name}`}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Session Count</th>
                    <th>Rate / Session</th>
                    <th className="th-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.map((entry, i) => (
                    <tr key={entry.id}>
                      <td className="entry-num">{i + 1}</td>
                      <td>{entry.session_count} sessions</td>
                      <td>{formatCurrency(Number(entry.session_rate))}</td>
                      <td className="td-right entry-line-total">
                        {formatCurrency(Number(entry.total_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="entries-foot-label">Report Total</td>
                    <td className="td-right entries-foot-total">
                      {formatCurrency(Number(report.grand_total))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────

interface ReportTableProps {
  reports: Report[];
}

export function ReportTable({ reports: initialReports }: ReportTableProps) {
  // Optimistic statuses — maps report_id → status string
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string>>({});
  // Which report ID is in-flight
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Global error toast
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);

  const [, startTransition] = useTransition();

  const handleApprove = (reportId: string) => {
    const report = initialReports.find((r) => r.report_id === reportId);
    if (!report || (optimisticStatuses[reportId] ?? report.status) !== 'pending') return;

    setErrorMsg(null);
    setPendingId(reportId);
    setOptimisticStatuses((prev) => ({ ...prev, [reportId]: 'approved' }));

    startTransition(async () => {
      const result = await approveReportAction(reportId);
      if (!result.success) {
        // Revert on failure
        setOptimisticStatuses((prev) => {
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
        setErrorMsg(result.error ?? 'Failed to approve report.');
      }
      setPendingId(null);
    });
  };

  const handleReject = (reportId: string) => {
    const report = initialReports.find((r) => r.report_id === reportId);
    if (!report) return;
    setErrorMsg(null);
    setRejectTarget({ id: reportId, name: report.instructor_name });
  };

  const handleRejectSuccess = (reportId: string) => {
    setOptimisticStatuses((prev) => ({ ...prev, [reportId]: 'rejected' }));
    setPendingId(null);
  };

  const handleRejectError = (msg: string) => {
    setErrorMsg(msg);
    setPendingId(null);
  };

  return (
    <>
      {/* Error toast */}
      {errorMsg && (
        <div className="form-error-banner" role="alert" aria-live="assertive">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          {errorMsg}
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="toast-dismiss"
            aria-label="Dismiss error"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Reports table */}
      <div className="report-table-wrap">
        <table className="report-table admin-report-table" aria-label="All submitted reports">
          <thead>
            <tr>
              <th className="th-expand" aria-label="Expand" />
              <th scope="col">Instructor</th>
              <th scope="col">Date</th>
              <th scope="col" className="th-center">Entries</th>
              <th scope="col" className="th-right">Total</th>
              <th scope="col" className="th-center">Status</th>
              <th scope="col" className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialReports.map((report) => (
              <ReportRow
                key={report.report_id}
                report={report}
                onApprove={handleApprove}
                onReject={handleReject}
                optimisticStatus={optimisticStatuses[report.report_id]}
                isPending={pendingId === report.report_id}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Rejection Modal */}
      {rejectTarget && (
        <RejectModal
          reportId={rejectTarget.id}
          instructorName={rejectTarget.name}
          onClose={() => setRejectTarget(null)}
          onSuccess={handleRejectSuccess}
          onError={handleRejectError}
        />
      )}
    </>
  );
}
