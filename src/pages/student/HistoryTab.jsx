import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { EmptyState, StatCard } from '../../components/ui.jsx';
import { formatDateShort, formatDate } from '../../services/data.js';
import {
  getStudentTotalPoints,
  getStudentPeriodPoints,
  getStudentActiveDays,
} from '../../services/calculations.js';

function pad2(n) { return String(n).padStart(2, '0'); }

// Generate list of date strings between start and end (inclusive, max 14)
function dateRange(startStr, endStr, max = 14) {
  const dates = [];
  const cur = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr   + 'T00:00:00');
  while (cur <= end && dates.length < max) {
    dates.push(`${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// Last N days ending today
function lastNDays(n) {
  const dates = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d);
    t.setDate(d.getDate() - i);
    dates.push(`${t.getFullYear()}-${pad2(t.getMonth()+1)}-${pad2(t.getDate())}`);
  }
  return dates;
}

export default function HistoryTab() {
  const { student } = useAuth();
  const { activitiesForGroup, activePeriod, periodsForGroup } = useApp();

  const allActivities = activitiesForGroup(student.groupId);
  const activities    = allActivities.filter(a => a.isActive ?? a.active ?? true);
  const period        = activePeriod(student.groupId);
  const allPeriods    = periodsForGroup(student.groupId);

  // Period selector options
  const periodOptions = useMemo(() => {
    const opts = [];
    if (period) {
      opts.push({ value: `period_${period.id}`, label: `${period.name} (Active)`, periodObj: period });
    }
    allPeriods
      .filter(p => !p.isActive)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      .forEach(p => opts.push({ value: `period_${p.id}`, label: p.name, periodObj: p }));
    opts.push({ value: 'last14', label: 'Last 14 Days', periodObj: null });
    return opts;
  }, [period, allPeriods]);

  const [selValue, setSelValue] = useState(() => periodOptions[0]?.value || 'last14');

  const selOption = periodOptions.find(o => o.value === selValue) || periodOptions[0];

  // Choose date columns based on selection
  const dates = useMemo(() => {
    if (!selOption || !selOption.periodObj) return lastNDays(14);
    const pd = dateRange(selOption.periodObj.startDate, selOption.periodObj.endDate, 14);
    return pd.length > 0 ? pd : lastNDays(14);
  }, [selOption]);

  // Build lookup: date → completedActivities set
  const subMap = useMemo(() => {
    const m = {};
    (student.submissions || []).forEach(s => {
      m[s.date] = new Set(s.completedActivities || []);
    });
    return m;
  }, [student]);

  // Summary stats
  const totalPts  = getStudentTotalPoints(student, allActivities);
  const periodPts = period
    ? getStudentPeriodPoints(student, allActivities, period.startDate, period.endDate)
    : null;
  const totalDays = getStudentActiveDays(student);

  const hasAnySubmission = Object.keys(subMap).length > 0;

  return (
    <div className="mt-6 space-y-5">
      <h2 className="font-serif text-xl text-primary">My History</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {period && <StatCard label="Period Points" value={periodPts} />}
        <StatCard label="Total Points" value={totalPts} />
        <StatCard label="Days Submitted" value={totalDays} />
      </div>

      {/* Period selector */}
      {periodOptions.length > 1 && (
        <div>
          <select
            value={selValue}
            onChange={e => setSelValue(e.target.value)}
            className="w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          >
            {periodOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {selOption?.periodObj && (
            <p className="text-xs text-muted mt-1.5">
              {formatDate(selOption.periodObj.startDate)} – {formatDate(selOption.periodObj.endDate)}
            </p>
          )}
        </div>
      )}

      {!hasAnySubmission ? (
        <EmptyState icon="📅" title="No submissions yet" text="Complete your daily activities to see them here." />
      ) : (
        /* Grid: rows = activities, cols = dates */
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
            <thead>
              <tr>
                {/* Activity label column header */}
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wide pb-2 pr-3 whitespace-nowrap sticky left-0 bg-bg z-10 min-w-[120px]">
                  Activity
                </th>
                {dates.map(d => (
                  <th key={d} className="text-center text-xs text-muted pb-2 px-1 whitespace-nowrap min-w-[36px]">
                    {formatDateShort(d).replace(/\s/g, '\n')}
                  </th>
                ))}
                <th className="text-right text-xs font-semibold text-muted uppercase tracking-wide pb-2 pl-3 whitespace-nowrap">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activities.map((a, rowIdx) => {
                // Total points earned for this activity across all submitted dates in range
                const actPts = dates.reduce((sum, d) => {
                  return sum + (subMap[d]?.has(a.id) ? a.points : 0);
                }, 0);

                return (
                  <tr key={a.id} className={rowIdx % 2 === 0 ? 'bg-bg' : 'bg-bg-card2'}>
                    {/* Activity name — sticky left */}
                    <td className={`text-xs text-primary font-medium pr-3 py-2 sticky left-0 z-10 whitespace-nowrap
                      ${rowIdx % 2 === 0 ? 'bg-bg' : 'bg-bg-card2'}`}>
                      {a.name}
                    </td>
                    {/* One cell per date */}
                    {dates.map(d => {
                      const done = subMap[d]?.has(a.id);
                      const hasAnySub = !!subMap[d];
                      return (
                        <td key={d} className="text-center px-1 py-2">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold transition-colors
                              ${done
                                ? 'bg-[var(--gold-subtle)] text-gold border border-gold-d'
                                : hasAnySub
                                  ? 'bg-bg-card2 text-muted border border-border opacity-40'
                                  : 'opacity-0 pointer-events-none'
                              }
                            `}
                          >
                            {done ? '✓' : hasAnySub ? '—' : ''}
                          </span>
                        </td>
                      );
                    })}
                    {/* Row total */}
                    <td className="text-right text-xs font-semibold pl-3 py-2 whitespace-nowrap">
                      {actPts > 0
                        ? <span className="text-gold">+{actPts}</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Column totals row */}
            <tfoot>
              <tr>
                <td className="text-xs font-semibold text-muted pt-3 pr-3 sticky left-0 bg-bg z-10 uppercase tracking-wide border-t border-border">
                  Day total
                </td>
                {dates.map(d => {
                  const dayPts = activities.reduce((sum, a) => {
                    return sum + (subMap[d]?.has(a.id) ? a.points : 0);
                  }, 0);
                  return (
                    <td key={d} className="text-center text-xs pt-3 px-1 border-t border-border">
                      {dayPts > 0
                        ? <span className="font-bold text-gold">{dayPts}</span>
                        : <span className="text-border">—</span>
                      }
                    </td>
                  );
                })}
                <td className="border-t border-border" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legend */}
      {hasAnySubmission && (
        <div className="flex items-center gap-4 text-xs text-muted pt-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--gold-subtle)] border border-gold-d text-gold font-bold text-xs">✓</span>
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-bg-card2 border border-border text-muted text-xs">—</span>
            Missed
          </span>
        </div>
      )}
    </div>
  );
}
