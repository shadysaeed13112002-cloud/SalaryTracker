'use client';

/**
 * SalaryChart — Client Component
 * Animated horizontal bar chart showing salary by month.
 * Pure CSS bars — no external chart library needed.
 */

import { useEffect, useRef, useState } from 'react';
import type { MonthlySalarySummary } from '@/lib/salary';

interface SalaryChartProps {
  months: MonthlySalarySummary[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function SalaryChart({ months }: SalaryChartProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Trigger bar animation after mount via IntersectionObserver
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimated(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (months.length === 0) return null;

  const maxSalary = Math.max(...months.map((m) => m.totalSalary), 1);

  return (
    <div ref={ref} className="salary-chart" aria-label="Salary by month chart" role="img">
      {months.map((month, idx) => {
        const pct = (month.totalSalary / maxSalary) * 100;
        const delay = idx * 60; // staggered animation

        return (
          <div key={month.monthKey} className="chart-row" id={`chart-row-${month.monthKey}`}>
            {/* Month label */}
            <div className="chart-label">
              <span className="chart-month-name">
                {month.monthLabel.split(' ')[0]}
              </span>
              <span className="chart-month-year">
                {month.monthLabel.split(' ')[1]}
              </span>
              {month.isCurrentMonth && (
                <span className="chart-current-dot" aria-label="Current month" />
              )}
            </div>

            {/* Bar */}
            <div className="chart-bar-track" aria-hidden="true">
              <div
                className={`chart-bar ${month.isCurrentMonth ? 'chart-bar-current' : ''}`}
                style={{
                  width: animated ? `${pct}%` : '0%',
                  transitionDelay: `${delay}ms`,
                }}
              />
            </div>

            {/* Value */}
            <div className="chart-value">
              <span className={month.isCurrentMonth ? 'chart-value-current' : ''}>
                {formatCurrency(month.totalSalary)}
              </span>
              <span className="chart-report-count">
                {month.approvedReportCount} report{month.approvedReportCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
