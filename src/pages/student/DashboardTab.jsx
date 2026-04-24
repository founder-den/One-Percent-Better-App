import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Card, Button, Textarea, PillToggle, StatCard,
  ChecklistItem, SectionHeading, EmptyState,
  WeeklyChart, CountdownTimer,
} from '../../components/ui.jsx';
import { todayString, yesterdayString, formatDate } from '../../services/data.js';
import {
  getStudentTotalPoints,
  getStudentPeriodPoints,
  getStudentStreak,
  buildLeaderboard,
  submissionPoints,
  pointsPerDay,
} from '../../services/calculations.js';

const DAY_OPTS = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
];

function pad2(n) { return String(n).padStart(2, '0'); }

function getWeekDays() {
  const today  = new Date();
  const dow    = today.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + offset);
  const todayStr = todayString();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return { dateStr, points: 0, isToday: dateStr === todayStr, isPast: dateStr < todayStr };
  });
}

// ─────────────────────────────────────────────────────────────────
// Props:
//   challenge      — optional challenge object (enriched, with .periods array)
//   memberStudents — optional array of student objects (challenge members)
// When both are provided the component operates in "challenge mode":
//   activities, period, and student pool all come from the challenge.
// ─────────────────────────────────────────────────────────────────
export default function DashboardTab({ challenge, memberStudents }) {
  const { student, refreshStudent } = useAuth();
  const { activePeriod, studentsForGroup, submitDay } = useApp();

  const [dayMode, setDayMode] = useState('today');
  const [checked, setChecked] = useState({});
  const [quote,   setQuote]   = useState('');
  const [err,     setErr]     = useState('');

  const isChallenge = !!challenge;
  const dateStr     = dayMode === 'today' ? todayString() : yesterdayString();

  // ── Period ──────────────────────────────────────────────────────
  const period = isChallenge
    ? ((challenge.periods || []).find(p => p.isActive) || null)
    : activePeriod(student.groupId);

  // ── Activities ──────────────────────────────────────────────────
  // Activities always come from the active period — challenge or regular.
  const allActivities = period?.activities || [];

  const activities = isChallenge
    ? allActivities.filter(a => a.isActive ?? true)
    : allActivities.filter(a => a.is_active !== false);

  // ── Student pool (for rank) ─────────────────────────────────────
  const groupStudents = isChallenge
    ? (memberStudents || [])
    : studentsForGroup(student.groupId);

  const existingSub = useMemo(
    () => (student.submissions || []).find(s => s.date === dateStr),
    [student, dateStr]
  );
  const alreadySubmitted = !!existingSub;

  // ── Stats ──────────────────────────────────────────────────────
  // In challenge mode: total = points within challenge date range using challenge activities
  const totalPts = isChallenge
    ? (challenge.startDate && challenge.endDate
        ? getStudentPeriodPoints(student, allActivities, challenge.startDate, challenge.endDate)
        : getStudentTotalPoints(student, allActivities))
    : getStudentTotalPoints(student, allActivities);

  const periodPts = period
    ? getStudentPeriodPoints(student, allActivities, period.startDate, period.endDate)
    : null;

  const streak = getStudentStreak(student);

  const lb = period
    ? buildLeaderboard(groupStudents, allActivities, 'period', { periodStart: period.startDate, periodEnd: period.endDate })
    : buildLeaderboard(groupStudents, allActivities, 'total');
  const myRank = lb.find(r => r.id === student.id)?.rank ?? '—';

  // ── Weekly chart ───────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const days  = getWeekDays();
    const dates = days.map(d => d.dateStr);
    const pts   = pointsPerDay(student, allActivities, dates);
    return days.map((d, i) => ({ ...d, points: pts[i] }));
  }, [student, allActivities]);

  const todayStr = todayString();
  const todaySub = (student.submissions || []).find(s => s.date === todayStr);

  function toggleCheck(id) {
    setChecked(c => ({ ...c, [id]: !c[id] }));
  }

  async function handleSubmit() {
    setErr('');
    const ids = activities.filter(a => checked[a.id]).map(a => a.id);
    if (!ids.length) { setErr('Check at least one activity.'); return; }
    const ok = await submitDay(student.id, dateStr, ids, quote.trim());
    if (!ok) { setErr('Failed to submit. Please try again.'); return; }
    setChecked({});
    setQuote('');
  }

  const checkedCount = activities.filter(a => checked[a.id]).length;

  // Label for first stat card
  const totalLabel = isChallenge ? 'Challenge Pts' : 'Total Points';

  return (
    <div className="mt-6 space-y-5">
      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={totalLabel} value={totalPts} />
        {period
          ? <StatCard label="Period Points" value={periodPts} />
          : <StatCard label="Active Days" value={(student.submissions || []).length} />
        }
        <StatCard label="Rank" value={`#${myRank}`} />
        <StatCard label="Streak 🔥" value={streak} />
      </div>

      {/* ── Period info + countdown ───────────────────────────────── */}
      {period && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            Period: <span className="text-primary font-medium">{period.name}</span>
            {' '}· {formatDate(period.startDate)} – {formatDate(period.endDate)}
          </span>
          <CountdownTimer period={period} />
        </div>
      )}

      {/* ── Weekly chart ─────────────────────────────────────────── */}
      <Card className="!pb-4">
        <SectionHeading>This Week</SectionHeading>
        <WeeklyChart days={weekDays} />
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">
            Streak: <span className="text-gold">{streak} 🔥</span>
          </p>
          {activities.length > 0 && (
            <div className="space-y-1.5">
              {activities.map(a => {
                const done = todaySub && (todaySub.completedActivities || []).some(ca => (typeof ca === 'string' ? ca : ca?.id) === a.id);
                return (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span className={`text-base leading-none ${done ? 'text-ok' : 'text-border'}`}>
                      {done ? '✓' : '○'}
                    </span>
                    <span className={done ? 'text-primary' : 'text-muted'}>{a.name}</span>
                    {done && <span className="text-xs text-gold ml-auto">+{a.points}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ── Submission form ──────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionHeading className="!mb-0 flex-1">{formatDate(dateStr)}</SectionHeading>
          <PillToggle
            options={DAY_OPTS}
            value={dayMode}
            onChange={v => { setDayMode(v); setChecked({}); setErr(''); }}
          />
        </div>

        {alreadySubmitted ? (
          <div>
            <p className="text-sm text-ok mb-3">✓ Submitted — great work!</p>
            {activities.map(a => {
              const done = (existingSub.completedActivities || []).some(ca => (typeof ca === 'string' ? ca : ca?.id) === a.id);
              return (
                <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border mb-1.5
                  ${done ? 'border-gold-d bg-[var(--gold-subtle)]' : 'border-border bg-bg-card2 opacity-40'}`}
                >
                  <span className={`text-lg ${done ? 'text-ok' : 'text-muted'}`}>{done ? '✓' : '○'}</span>
                  <span className="text-sm text-primary flex-1">{a.name}</span>
                  {done && <span className="text-xs text-gold font-semibold">+{a.points} pts</span>}
                </div>
              );
            })}
            {existingSub.quote && (
              <blockquote className="mt-4 border-l-2 border-gold/40 pl-3 text-sm text-muted italic">
                "{existingSub.quote}"
              </blockquote>
            )}
            <p className="text-sm text-muted mt-3">
              Points earned:{' '}
              <span className="text-gold font-semibold">
                {submissionPoints(existingSub, allActivities)}
              </span>
            </p>
          </div>
        ) : (
          <div>
            {activities.length === 0 && (
              <EmptyState icon="📋" title="No activities available yet" text={isChallenge ? "This challenge has no active period with activities." : "No active period with activities has been set up yet."} />
            )}
            {activities.map(a => (
              <ChecklistItem
                key={a.id}
                activity={a}
                checked={!!checked[a.id]}
                onChange={() => toggleCheck(a.id)}
              />
            ))}
            {activities.length > 0 && (
              <>
                <Textarea
                  label="Daily Quote (optional)"
                  value={quote}
                  onChange={e => setQuote(e.target.value.slice(0, 200))}
                  placeholder="Share an inspiring thought…"
                  className="mt-4"
                  rows={2}
                />
                <p className="text-xs text-muted -mt-3 mb-3">{quote.length}/200</p>
                {err && <p className="text-xs text-danger mb-2">{err}</p>}
                <Button full onClick={handleSubmit} disabled={!checkedCount}>
                  Submit ({checkedCount} {checkedCount === 1 ? 'activity' : 'activities'})
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
