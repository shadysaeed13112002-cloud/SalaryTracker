'use client';

/**
 * Create Daily Report — Client Component
 *
 * Features:
 * - Date picker (today by default, no future dates)
 * - Dynamic session entries (Add / Remove)
 * - Live calculation: session_count × session_rate per entry
 * - Live grand total across all entries
 * - Submits via Server Action with full error handling
 */

import { useActionState, useState, useCallback, useId } from 'react';
import { createReportAction, type CreateReportState } from '@/app/actions/reports';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────

interface Entry {
  id: string;
  session_count: string;
  session_rate: string;
}

// ── Helpers ────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(n: number) {
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

function lineTotal(e: Entry): number {
  const count = parseFloat(e.session_count);
  const rate  = parseFloat(e.session_rate);
  if (!count || !rate || count <= 0 || rate <= 0) return 0;
  return count * rate;
}

function grandTotal(entries: Entry[]) {
  return entries.reduce((sum, e) => sum + lineTotal(e), 0);
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function makeEntry(): Entry {
  return { id: uid(), session_count: '', session_rate: '' };
}

const initialState: CreateReportState = {};

// ── Component ──────────────────────────────────────────────────

export default function NewReportPage() {
  const [state, formAction, pending] = useActionState(createReportAction, initialState);
  const [entries, setEntries] = useState<Entry[]>([makeEntry()]);
  const baseId = useId();

  // Entry mutations
  const addEntry = useCallback(() => setEntries((prev) => [...prev, makeEntry()]), []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  }, []);

  const updateEntry = useCallback(
    (id: string, field: keyof Omit<Entry, 'id'>, value: string) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
    },
    []
  );

  const total = grandTotal(entries);

  return (
    <section aria-labelledby="new-report-heading" className="new-report-page">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
        <span aria-hidden="true" className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">New Report</span>
      </nav>

      <div className="page-header">
        <div>
          <h1 id="new-report-heading" className="page-title">Create Daily Report</h1>
          <p className="page-subtitle">Log your sessions for a specific date.</p>
        </div>
      </div>

      {/* Global error */}
      {state?.error && (
        <div className="form-error-banner" role="alert" aria-live="assertive">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          {state.error}
        </div>
      )}

      <form action={formAction} className="report-form">
        {/* ── Report Date ── */}
        <div className="form-card">
          <h2 className="form-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Report Date
          </h2>
          <div className="date-field">
            <label htmlFor={`${baseId}-date`} className="sr-only">Report date</label>
            <input
              id={`${baseId}-date`}
              name="report_date"
              type="date"
              defaultValue={today()}
              max={today()}
              required
              disabled={pending}
              className={`date-input ${state?.fieldErrors?.report_date ? 'input-error' : ''}`}
              aria-describedby={state?.fieldErrors?.report_date ? `${baseId}-date-err` : undefined}
            />
            {state?.fieldErrors?.report_date && (
              <p id={`${baseId}-date-err`} className="field-error-msg" role="alert">
                {state.fieldErrors.report_date}
              </p>
            )}
          </div>
        </div>

        {/* ── Session Entries ── */}
        <div className="form-card">
          <h2 className="form-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Session Entries
          </h2>

          <div className="entries-list" aria-label="Session entries">
            {/* Column headers */}
            <div className="entry-header-row" aria-hidden="true">
              <span className="entry-col-label">#</span>
              <span className="entry-col-label">Session Count</span>
              <span className="entry-col-label">Rate per Session</span>
              <span className="entry-col-label entry-col-total">Line Total</span>
              <span className="entry-col-label entry-col-action" />
            </div>

            {entries.map((entry, idx) => {
              const lt = lineTotal(entry);
              const countErr = state?.fieldErrors?.[`entries[${idx}][session_count]`];
              const rateErr  = state?.fieldErrors?.[`entries[${idx}][session_rate]`];

              return (
                <div key={entry.id} className="entry-row" aria-label={`Session entry ${idx + 1}`}>
                  {/* Index */}
                  <span className="entry-index" aria-hidden="true">{idx + 1}</span>

                  {/* Session Count */}
                  <div className="entry-field">
                    <label htmlFor={`${baseId}-count-${entry.id}`} className="sr-only">
                      Session count for entry {idx + 1}
                    </label>
                    <input
                      id={`${baseId}-count-${entry.id}`}
                      name={`entries[${idx}][session_count]`}
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 5"
                      value={entry.session_count}
                      onChange={(e) => updateEntry(entry.id, 'session_count', e.target.value)}
                      disabled={pending}
                      required
                      className={`entry-input ${countErr ? 'input-error' : ''}`}
                      aria-describedby={countErr ? `${baseId}-count-err-${entry.id}` : undefined}
                    />
                    {countErr && (
                      <p id={`${baseId}-count-err-${entry.id}`} className="field-error-msg" role="alert">
                        {countErr}
                      </p>
                    )}
                  </div>

                  {/* Session Rate */}
                  <div className="entry-field">
                    <label htmlFor={`${baseId}-rate-${entry.id}`} className="sr-only">
                      Session rate for entry {idx + 1}
                    </label>
                    <div className="input-prefix-wrap">
                      <span className="input-prefix" aria-hidden="true">$</span>
                      <input
                        id={`${baseId}-rate-${entry.id}`}
                        name={`entries[${idx}][session_rate]`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={entry.session_rate}
                        onChange={(e) => updateEntry(entry.id, 'session_rate', e.target.value)}
                        disabled={pending}
                        required
                        className={`entry-input entry-input-prefixed ${rateErr ? 'input-error' : ''}`}
                        aria-describedby={rateErr ? `${baseId}-rate-err-${entry.id}` : undefined}
                      />
                    </div>
                    {rateErr && (
                      <p id={`${baseId}-rate-err-${entry.id}`} className="field-error-msg" role="alert">
                        {rateErr}
                      </p>
                    )}
                  </div>

                  {/* Line Total */}
                  <div className="entry-total" aria-label={`Line total: ${formatCurrency(lt)}`}>
                    <span className={lt > 0 ? 'entry-total-value' : 'entry-total-placeholder'}>
                      {lt > 0 ? formatCurrency(lt) : '—'}
                    </span>
                  </div>

                  {/* Remove button */}
                  <div className="entry-action">
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={entries.length === 1 || pending}
                      className="remove-entry-btn"
                      aria-label={`Remove entry ${idx + 1}`}
                      id={`remove-entry-${idx}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Entry */}
          <button
            type="button"
            onClick={addEntry}
            disabled={pending}
            className="add-entry-btn"
            id="add-entry-button"
            aria-label="Add another session entry"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Add Another Entry
          </button>
        </div>

        {/* ── Total Summary ── */}
        <div className="total-summary" aria-live="polite" aria-label="Report total">
          <div className="total-summary-inner">
            <div className="total-rows">
              {entries.map((e, idx) => {
                const lt = lineTotal(e);
                if (lt <= 0) return null;
                return (
                  <div key={e.id} className="total-row">
                    <span className="total-row-label">
                      Entry {idx + 1} &nbsp;
                      <span className="total-row-detail">
                        ({e.session_count || 0} sessions × {formatCurrency(parseFloat(e.session_rate) || 0)})
                      </span>
                    </span>
                    <span className="total-row-value">{formatCurrency(lt)}</span>
                  </div>
                );
              })}
            </div>
            <div className="total-grand">
              <span className="total-grand-label">Total Report Amount</span>
              <span className="total-grand-value">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="form-actions">
          <Link href="/dashboard" className="btn-cancel" id="cancel-report-link">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending || total <= 0}
            className="btn-submit"
            id="submit-report-button"
            aria-busy={pending}
          >
            {pending ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Submit Report
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
