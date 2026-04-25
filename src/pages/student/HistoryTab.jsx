import { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { EmptyState, StatCard, Button } from '../../components/ui.jsx';
import { formatDateShort, formatDate } from '../../services/data.js';
import {
  getStudentTotalPoints,
  getStudentPeriodPoints,
  getStudentActiveDays,
} from '../../services/calculations.js';

function pad2(n) { return String(n).padStart(2, '0'); }

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

// Props:
//   challenge — optional challenge object (enriched, with .periods array)
export default function HistoryTab({ challenge }) {
  const { student } = useAuth();
  const {
    activitiesForGroup, activePeriod, periodsForGroup,
    allowPastSubmissions, submitPastDay,
  } = useApp();

  const isChallenge = !!challenge;

  const period     = isChallenge
    ? ((challenge.periods || []).find(p => p.isActive) || null)
    : activePeriod(student.groupId);
  const allPeriods = isChallenge
    ? (challenge.periods || [])
    : periodsForGroup(student.groupId);

  const periodOptions = useMemo(() => {
    const opts = [];
    if (period) {
      opts.push({ value: `period_${period.id}`, label: `${period.name} (Active)`, periodObj: period });
    }
    allPeriods
      .filter(p => !p.isActive)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      .forEach(p => opts.push({ value: `period_${p.id}`, label: p.name, periodObj: p }));
    if (isChallenge && !allPeriods.length && challenge.startDate && challenge.endDate) {
      opts.push({
        value: 'challenge_range',
        label: 'Challenge Period',
        periodObj: { startDate: challenge.startDate, endDate: challenge.endDate, activities: [] },
      });
    }
    opts.push({ value: 'last14', label: 'Last 14 Days', periodObj: null });
    return opts;
  }, [period, allPeriods, isChallenge, challenge]);

  const [selValue, setSelValue] = useState(() => periodOptions[0]?.value || 'last14');

  const selOption = periodOptions.find(o => o.value === selValue) || periodOptions[0];

  const allActivities = isChallenge
    ? (selOption?.periodObj?.activities || [])
    : activitiesForGroup(student.groupId);
  const activities = isChallenge
    ? allActivities.filter(a => a.isActive ?? true)
    : allActivities.filter(a => a.isActive ?? a.active ?? true);

  const today = new Date().toISOString().split('T')[0];

  const dates = useMemo(() => {
    const max = allowPastSubmissions ? 365 : 14;
    if (!selOption || !selOption.periodObj) return lastNDays(allowPastSubmissions ? 30 : 14);
    const pd = dateRange(selOption.periodObj.startDate, selOption.periodObj.endDate, max);
    return pd.length > 0 ? pd : lastNDays(allowPastSubmissions ? 30 : 14);
  }, [selOption, allowPastSubmissions]);

  // Build lookup: date → Set of completedActivityIds
  const subMap = useMemo(() => {
    const m = {};
    const selectedPeriodId = isChallenge ? (selOption?.periodObj?.id || null) : null;
    (student.submissions || []).forEach(s => {
      if (isChallenge) {
        if (!selectedPeriodId || s.periodId !== selectedPeriodId) return;
      }
      m[s.date] = new Set(s.completedActivities || []);
    });
    return m;
  }, [student, isChallenge, selOption]);

  // Summary stats
  const totalPts = isChallenge
    ? (() => {
        const periodIds = new Set((challenge.periods || []).map(p => p.id));
        return (student.submissions || [])
          .filter(sub => sub.periodId && periodIds.has(sub.periodId))
          .reduce((sum, sub) => sum + (typeof sub.points === 'number' ? sub.points : 0), 0);
      })()
    : getStudentTotalPoints(student, allActivities);
  const periodPts = period
    ? (isChallenge
        ? (student.submissions || [])
            .filter(sub => sub.periodId === period.id)
            .reduce((sum, sub) => sum + (typeof sub.points === 'number' ? sub.points : 0), 0)
        : getStudentPeriodPoints(student, allActivities, period.startDate, period.endDate))
    : null;
  const totalDays = isChallenge ? Object.keys(subMap).length : getStudentActiveDays(student);

  const hasAnySubmission = Object.keys(subMap).length > 0;

  // ── Editable mode state ───────────────────────────────────────
  const [expandedDate, setExpandedDate] = useState(null);
  const [editChecks,   setEditChecks]   = useState({});
  const [savingDate,   setSavingDate]   = useState(null);

  function getActivitiesForDate(dateStr) {
    if (isChallenge) {
      const p = (challenge.periods || []).find(p => dateStr >= p.startDate && dateStr <= p.endDate);
      return (p?.activities || []).filter(a => a.isActive ?? true);
    }
    const groupPds = periodsForGroup(student.groupId);
    const p = groupPds.find(pd => dateStr >= pd.startDate && dateStr <= pd.endDate);
    if (p) return (p.activities || []).filter(a => a.isActive ?? a.active ?? true);
    return activities;
  }

  function openDate(dateStr) {
    setExpandedDate(dateStr);
    const existing = subMap[dateStr];
    setEditChecks(prev => ({
      ...prev,
      [dateStr]: existing ? [...existing] : [],
    }));
  }

  function closeDate() {
    setExpandedDate(null);
  }

  function toggleCheck(dateStr, actId) {
    setEditChecks(prev => {
      const checks = prev[dateStr] || [];
      const idx = checks.indexOf(actId);
      return {
        ...prev,
        [dateStr]: idx >= 0 ? checks.filter(id => id !== actId) : [...checks, actId],
      };
    });
  }

  const handleSave = useCallback(async (dateStr) => {
    setSavingDate(dateStr);
    const checks = editChecks[dateStr] || [];
    await submitPastDay(student.id, dateStr, checks, isChallenge ? challenge.id : null);
    setSavingDate(null);
    setExpandedDate(null);
  }, [editChecks, submitPastDay, student.id, isChallenge, challenge]);

  // Dates shown in editable mode: all dates in range, past only, newest first
  const editDates = useMemo(
    () => [...dates].reverse().filter(d => d <= today),
    [dates, today],
  );

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
            onChange={e => { setSelValue(e.target.value); setExpandedDate(null); }}
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

      {/* ── EDITABLE mode ─────────────────────────────────────── */}
      {allowPastSubmissions ? (
        editDates.length === 0 ? (
          <EmptyState icon="📅" title="No dates available" text="No past dates found for this period." />
        ) : (
          <div className="space-y-2">
            {editDates.map(d => {
              const dateActivities = getActivitiesForDate(d);
              const isExpanded = expandedDate === d;
              const checks     = editChecks[d] || [];
              const isSaving   = savingDate === d;
              const hasSubmission = !!subMap[d];
              const submittedPts = hasSubmission
                ? dateActivities.reduce((sum, a) => sum + (subMap[d].has(a.id) ? a.points : 0), 0)
                : 0;
              const editPts = dateActivities.reduce((sum, a) => sum + (checks.includes(a.id) ? a.points : 0), 0);

              return (
                <div key={d} className="border border-border rounded-xl overflow-hidden bg-bg-card2">
                  {/* Row header */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--gold-subtle)] transition-colors"
                    onClick={() => isExpanded ? closeDate() : openDate(d)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">{formatDate(d)}</span>
                      {hasSubmission
                        ? <span className="text-xs font-semibold text-gold bg-[var(--gold-subtle)] border border-gold-d rounded-md px-2 py-0.5">+{submittedPts} pts</span>
                        : <span className="text-xs text-muted">Not submitted</span>
                      }
                    </div>
                    <svg
                      className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 space-y-3 bg-bg">
                      {dateActivities.length === 0 ? (
                        <p className="text-xs text-muted">No activities found for this date's period.</p>
                      ) : (
                        <>
                          <div className="space-y-2.5">
                            {dateActivities.map(a => {
                              const checked = checks.includes(a.id);
                              return (
                                <label key={a.id} className="flex items-center gap-3 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleCheck(d, a.id)}
                                    className="w-4 h-4 rounded accent-gold cursor-pointer"
                                  />
                                  <span className="flex-1 text-sm text-primary group-hover:text-gold transition-colors">{a.name}</span>
                                  <span className="text-xs text-muted">+{a.points}</span>
                                </label>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border">
                            <span className="text-sm font-semibold text-gold">
                              Total: {editPts} pts
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleSave(d)}
                              disabled={isSaving}
                            >
                              {isSaving ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── READ-ONLY mode (unchanged) ──────────────────────── */
        !hasAnySubmission ? (
          <EmptyState icon="📅" title="No submissions yet" text="Complete your daily activities to see them here." />
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                <thead>
                  <tr>
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
                    const actPts = dates.reduce((sum, d) => {
                      return sum + (subMap[d]?.has(a.id) ? a.points : 0);
                    }, 0);

                    return (
                      <tr key={a.id} className={rowIdx % 2 === 0 ? 'bg-bg' : 'bg-bg-card2'}>
                        <td className={`text-xs text-primary font-medium pr-3 py-2 sticky left-0 z-10 whitespace-nowrap
                          ${rowIdx % 2 === 0 ? 'bg-bg' : 'bg-bg-card2'}`}>
                          {a.name}
                        </td>
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

            {/* Legend */}
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
          </>
        )
      )}
    </div>
  );
}
