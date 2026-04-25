import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, SectionHeading, EmptyState } from '../../components/ui.jsx';
import { formatDate, todayString, parseLocalDate, dateToStr } from '../../services/data.js';
import {
  getStudentTotalPoints, getStudentGrandTotal, getStudentStreak, getStudentActiveDays, submissionPoints,
} from '../../services/calculations.js';
import {
  Pencil, Flame, Star, CalendarDays, Trophy, Lock,
  X, Award, Users,
} from 'lucide-react';

// ─── Badge definitions (22 total) ─────────────────────────────────
const BADGE_DEFS = [
  { id: 'first_step',    emoji: '🌟', name: 'First Step',    desc: 'Made your first submission' },
  { id: 'on_fire',       emoji: '🔥', name: 'On Fire',       desc: 'Achieved a 3-day streak' },
  { id: 'unstoppable',   emoji: '⚡', name: 'Unstoppable',   desc: 'Achieved a 7-day streak' },
  { id: 'diamond',       emoji: '💎', name: 'Diamond',       desc: 'Achieved a 30-day streak' },
  { id: 'top3',          emoji: '🏆', name: 'Top 3',         desc: 'Ranked in top 3 overall' },
  { id: 'champion',      emoji: '👑', name: 'Champion',      desc: 'Ranked #1 overall' },
  { id: 'bookworm',      emoji: '📚', name: 'Bookworm',      desc: 'Completed Reading Books 10+ times' },
  { id: 'night_owl',     emoji: '🌙', name: 'Night Owl',     desc: 'Completed Tahajjud 10+ times' },
  { id: 'century',       emoji: '✨', name: 'Century',       desc: 'Earned 100+ points total' },
  { id: 'high_achiever', emoji: '🚀', name: 'High Achiever', desc: 'Earned 500+ points total' },
  { id: 'perfect_week',  emoji: '💯', name: 'Perfect Week',  desc: 'Submitted all 7 days in a week' },
  { id: 'consistent',    emoji: '🎯', name: 'Consistent',    desc: 'Submitted on 30+ different days' },
  { id: 'perfect_10',    emoji: '🎖️', name: 'Perfect 10',   desc: 'Submitted 10 consecutive days with all activities' },
  { id: 'iron_will',     emoji: '💪', name: 'Iron Will',     desc: 'Submitted every day for 20 consecutive days' },
  { id: 'full_period',   emoji: '🏅', name: 'Full Period',   desc: 'Submitted every single day of a complete challenge period' },
  { id: 'devoted',       emoji: '👼', name: 'Devoted',       desc: 'Completed Tahajjud 20+ times total' },
  { id: 'scholar',       emoji: '📖', name: 'Scholar',       desc: 'Completed Reading Books 20+ times total' },
  { id: 'all_star',      emoji: '🌠', name: 'All-Star',      desc: 'Earned points on 50+ different days' },
  { id: 'comeback',      emoji: '🔄', name: 'Comeback',      desc: 'Submitted after missing 3+ consecutive days' },
  { id: 'legend',        emoji: '🥇', name: 'Legend',        desc: 'Earned 1,000+ points total' },
  { id: 'early_bird',    emoji: '⏰', name: 'Early Bird',    desc: 'Submitted on the very first day of a challenge period' },
  { id: 'dedicated',     emoji: '🤲', name: 'Dedicated',     desc: 'Completed ALL activities in a single submission at least once' },
];

// ─── Pure badge helpers ────────────────────────────────────────────
function calcBestStreak(student) {
  const subs = student.submissions || [];
  if (!subs.length) return 0;
  const seen = {};
  subs.forEach(s => { seen[s.date] = true; });
  const dates = Object.keys(seen).sort();
  let best = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round(
      (parseLocalDate(dates[i]) - parseLocalDate(dates[i - 1])) / 86400000
    );
    if (diff === 1) { cur++; if (cur > best) best = cur; }
    else cur = 1;
  }
  return best;
}

function checkPerfectWeek(subs) {
  const subDates = new Set(subs.map(s => s.date));
  for (const dateStr of subDates) {
    const d = parseLocalDate(dateStr);
    const dow = d.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + offset);
    let allIn = true;
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      if (!subDates.has(dateToStr(day))) { allIn = false; break; }
    }
    if (allIn) return true;
  }
  return false;
}

function checkPerfectConsecutive(subs, groupActivities, minDays) {
  if (!groupActivities.length) return false;
  const actIds = groupActivities.map(a => a.id);
  // Build set of dates where ALL group activities were completed
  const perfDates = new Set();
  subs.forEach(s => {
    const completed = new Set(s.completedActivities || []);
    if (actIds.every(id => completed.has(id))) perfDates.add(s.date);
  });
  const dates = [...perfDates].sort();
  if (dates.length < minDays) return false;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round((parseLocalDate(dates[i]) - parseLocalDate(dates[i - 1])) / 86400000);
    if (diff === 1) { streak++; if (streak >= minDays) return true; }
    else streak = 1;
  }
  return streak >= minDays;
}

function checkFullPeriod(subs, periods) {
  if (!periods.length) return false;
  const subDates = new Set(subs.map(s => s.date));
  return periods.some(period => {
    if (!period.startDate || !period.endDate) return false;
    const start = parseLocalDate(period.startDate);
    const end   = parseLocalDate(period.endDate);
    const cur   = new Date(start);
    while (cur <= end) {
      if (!subDates.has(dateToStr(cur))) return false;
      cur.setDate(cur.getDate() + 1);
    }
    return true;
  });
}

function checkComeback(subs) {
  const dates = [...new Set(subs.map(s => s.date))].sort();
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round((parseLocalDate(dates[i]) - parseLocalDate(dates[i - 1])) / 86400000);
    if (diff > 3) return true;
  }
  return false;
}

function checkEarlyBird(subs, periods) {
  const subDates = new Set(subs.map(s => s.date));
  return periods.some(p => p.startDate && subDates.has(p.startDate));
}

function checkDedicated(subs, groupActivities) {
  if (!groupActivities.length) return false;
  return subs.some(s => (s.completedActivities || []).length >= groupActivities.length);
}

function computeEarnedBadges(student, activities, allStudents, groupActivities, groupPeriods, studentRanks = null) {
  const subs        = student.submissions || [];
  const totalPoints = getStudentTotalPoints(student, activities);
  const bestStreak  = calcBestStreak(student);
  const activeDays  = getStudentActiveDays(student);

  const readIds     = activities.filter(a => a.name.toLowerCase().includes('reading book')).map(a => a.id);
  const tahIds      = activities.filter(a => a.name.toLowerCase().includes('tahajjud')).map(a => a.id);
  const readCount   = subs.reduce((n, s) => n + (s.completedActivities || []).filter(id => readIds.includes(id)).length, 0);
  const tahCount    = subs.reduce((n, s) => n + (s.completedActivities || []).filter(id => tahIds.includes(id)).length, 0);

  let myRank = 0;
  if (studentRanks) {
    myRank = studentRanks[student.id] || 0;
  } else {
    const sorted  = [...allStudents]
      .filter(s => (s.status || 'active') === 'active')
      .sort((a, b) => getStudentTotalPoints(b, activities) - getStudentTotalPoints(a, activities));
    myRank  = sorted.findIndex(s => s.id === student.id) + 1;
  }

  const earned = new Set();
  if (subs.length > 0)            earned.add('first_step');
  if (bestStreak >= 3)            earned.add('on_fire');
  if (bestStreak >= 7)            earned.add('unstoppable');
  if (bestStreak >= 30)           earned.add('diamond');
  if (myRank > 0 && myRank <= 3) earned.add('top3');
  if (myRank === 1)               earned.add('champion');
  if (readCount >= 10)            earned.add('bookworm');
  if (tahCount  >= 10)            earned.add('night_owl');
  if (totalPoints >= 100)         earned.add('century');
  if (totalPoints >= 500)         earned.add('high_achiever');
  if (checkPerfectWeek(subs))     earned.add('perfect_week');
  if (activeDays >= 30)           earned.add('consistent');
  if (checkPerfectConsecutive(subs, groupActivities, 10)) earned.add('perfect_10');
  if (bestStreak >= 20)           earned.add('iron_will');
  if (checkFullPeriod(subs, groupPeriods))  earned.add('full_period');
  if (tahCount  >= 20)            earned.add('devoted');
  if (readCount >= 20)            earned.add('scholar');
  if (activeDays >= 50)           earned.add('all_star');
  if (checkComeback(subs))        earned.add('comeback');
  if (totalPoints >= 1000)        earned.add('legend');
  if (checkEarlyBird(subs, groupPeriods))   earned.add('early_bird');
  if (checkDedicated(subs, groupActivities)) earned.add('dedicated');
  return earned;
}

// ─── Month / day label constants ───────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS  = ['M','T','W','T','F','S','S'];

// ─── GitHub-style streak calendar ─────────────────────────────────
function StreakCalendar({ student, activities }) {
  const today      = todayString();
  const todayDate  = parseLocalDate(today);
  const subMap     = useMemo(() => {
    const m = {};
    (student.submissions || []).forEach(s => { m[s.date] = s; });
    return m;
  }, [student.submissions]);

  const rangeStart = new Date(todayDate);
  rangeStart.setDate(rangeStart.getDate() - 89);
  const rangeStartStr = dateToStr(rangeStart);

  const startDow  = rangeStart.getDay();
  const padDays   = startDow === 0 ? 6 : startDow - 1;
  const gridStart = new Date(rangeStart);
  gridStart.setDate(gridStart.getDate() - padDays);

  const allDays = [];
  const cur = new Date(gridStart);
  while (cur <= todayDate) {
    const str   = dateToStr(cur);
    const isPad = str < rangeStartStr;
    const sub   = !isPad ? subMap[str] : null;
    allDays.push({
      date:      str,
      submitted: !!sub,
      points:    sub ? submissionPoints(sub, activities) : 0,
      isPad,
      isToday:   str === today,
      month:     cur.getMonth(),
    });
    cur.setDate(cur.getDate() + 1);
  }

  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  const activeDaysInRange = allDays.filter(d => !d.isPad && d.submitted).length;

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'flex-start' }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '14px' }}>
            {DAY_LABELS.map((lbl, i) => (
              <div key={i} style={{ width: '10px', height: '10px', fontSize: '8px', lineHeight: '10px', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '1px', userSelect: 'none' }}>
                {i % 2 === 0 ? lbl : ''}
              </div>
            ))}
          </div>
          {/* Week columns */}
          {weeks.map((week, wi) => {
            const firstReal  = week.find(d => !d.isPad);
            const prevFirst  = wi > 0 ? weeks[wi - 1].find(d => !d.isPad) : null;
            const showMonth  = firstReal && (!prevFirst || firstReal.month !== prevFirst.month);
            return (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                <div style={{ height: '12px', fontSize: '8px', color: 'var(--text-muted)', whiteSpace: 'nowrap', userSelect: 'none', lineHeight: '12px' }}>
                  {showMonth ? MONTH_NAMES[firstReal.month] : ''}
                </div>
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={!day.isPad ? `${formatDate(day.date)}${day.submitted ? ` · ${day.points} pts` : ' · No submission'}` : undefined}
                    style={{
                      width: '10px', height: '10px', borderRadius: '2px', flexShrink: 0,
                      background: day.isPad ? 'transparent' : day.submitted ? 'var(--gold)' : 'var(--surface)',
                      outline:    day.isToday ? '1.5px solid var(--gold)' : undefined,
                      outlineOffset: '1px',
                      cursor: 'default', transition: 'opacity 0.1s',
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <p className="text-xs text-muted">
          <span className="font-semibold text-primary">{activeDaysInRange}</span> day{activeDaysInRange !== 1 ? 's' : ''} active in the last 90 days
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span>Less</span>
          {[0, 0.3, 0.6, 1].map((op, i) => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: op === 0 ? 'var(--surface)' : 'var(--gold)', opacity: op === 0 ? 1 : op }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────
function StatPill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-card2 border border-border text-xs font-semibold text-muted">
      <span className="text-gold">{icon}</span>
      {label}
    </div>
  );
}

// ─── Stat card (4-card row) ────────────────────────────────────────
function ProfileStatCard({ icon, value, label, gold = false }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-1.5 text-center">
      <span className="text-gold">{icon}</span>
      <div className={`font-serif font-bold text-2xl leading-none ${gold ? 'text-gold' : 'text-primary'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted">{label}</div>
    </div>
  );
}

// ─── Badge chip with tooltip ───────────────────────────────────────
function BadgeChip({ def, earned, rarityText }) {
  const [tip, setTip] = useState(false);
  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '6px', padding: '14px 8px 10px',
          borderRadius: '12px', background: 'var(--bg-card2)',
          border: '1px solid var(--border)',
          filter:    earned ? 'none' : 'grayscale(1)',
          opacity:   earned ? 1 : 0.35,
          boxShadow: earned ? '0 0 14px var(--gold-subtle)' : 'none',
          cursor: 'default', userSelect: 'none',
          transition: 'transform 0.15s, box-shadow 0.15s',
          transform: tip && earned ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        <span style={{ fontSize: '24px', lineHeight: 1 }}>{def.emoji}</span>
        <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
          {def.name}
        </span>
        {rarityText && (
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.8, marginTop: '-2px' }}>
            {rarityText}
          </span>
        )}
        {!earned && (
          <div style={{ position: 'absolute', top: '6px', right: '6px', color: 'var(--text-muted)', opacity: 0.6 }}>
            <Lock size={9} />
          </div>
        )}
      </div>
      {tip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, whiteSpace: 'nowrap',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '8px 10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          fontSize: '11px', color: 'var(--text)',
          pointerEvents: 'none',
        }}>
          <p style={{ fontWeight: 700, marginBottom: '3px' }}>{def.name}</p>
          <p style={{ color: 'var(--text-muted)' }}>{def.desc}</p>
          {!earned && <p style={{ color: 'var(--text-muted)', marginTop: '3px', fontStyle: 'italic' }}>Not yet earned</p>}
        </div>
      )}
    </div>
  );
}

// ─── Inline avatar (no upload, just display) ───────────────────────
function InlineAvatar({ src, name, size = 48 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, color: 'var(--gold)', fontSize: size * 0.35,
      boxShadow: '0 0 0 2.5px var(--gold)',
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{initials}</span>}
    </div>
  );
}

// ─── Public profile modal ──────────────────────────────────────────
function PublicProfileModal({ s, activities, allStudents, groupActivities, groupPeriods, findGroupById, challenges, challengeMemberships, onClose }) {
  // Returns the activities array to use for a given submission:
  // challenge-specific if the submission date falls within a challenge the student joined,
  // otherwise falls back to the general group activities.
  function getActivitiesForSub(sub) {
    const memberOf = challengeMemberships.filter(m => m.studentId === s.id);
    for (const membership of memberOf) {
      const challenge = challenges.find(c => c.id === membership.challengeId);
      if (!challenge) continue;
      const { startDate, endDate, activities: challengeActs } = challenge;
      if (startDate && endDate && sub.date >= startDate && sub.date <= endDate) {
        return challengeActs || [];
      }
    }
    return activities;
  }

  const totalPoints = useMemo(() => getStudentGrandTotal(s, s.submissions || []), [s]);

  const pointsBreakdown = useMemo(() => {
    const myMemberships = challengeMemberships.filter(m => m.studentId === s.id);
    const rows = myMemberships.map(m => {
      const ch = challenges.find(c => c.id === m.challengeId);
      if (!ch) return null;
      const periodIds = new Set((ch.periods || []).map(p => p.id));
      const subs = (s.submissions || []).filter(sub => sub.periodId && periodIds.has(sub.periodId));
      const pts = subs.reduce((sum, sub) => sum + (typeof sub.points === 'number' ? sub.points : 0), 0);
      return { label: ch.name, pts };
    }).filter(Boolean);
    const bonusPts = (s.bonusPoints || []).reduce((sum, b) => sum + Number(b.points || 0), 0);
    const total = rows.reduce((sum, r) => sum + r.pts, 0) + bonusPts;
    return { rows, bonusPts, total };
  }, [s, challenges, challengeMemberships]);
  const currentStreak = useMemo(() => getStudentStreak(s), [s]);
  const activeDays    = useMemo(() => getStudentActiveDays(s), [s]);
  const bestStreak    = useMemo(() => calcBestStreak(s), [s]);
  const earnedBadges  = useMemo(() => computeEarnedBadges(s, activities, allStudents, groupActivities, groupPeriods), [s, activities, allStudents, groupActivities, groupPeriods]);
  const group         = findGroupById(s.groupId);
  const recentSubs    = useMemo(() =>
    [...(s.submissions || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [s.submissions]
  );
  const earnedDefs = BADGE_DEFS.filter(d => earnedBadges.has(d.id));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', width: '100%', maxWidth: '480px',
          maxHeight: '90vh', overflowY: 'auto',
          padding: '24px', position: 'relative',
          animation: 'fadeInScale 0.18s ease',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', lineHeight: 1 }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <InlineAvatar src={s.avatar} name={s.fullName} size={64} />
          <div>
            <h3 style={{ fontFamily: 'serif', fontWeight: 700, fontSize: '18px', color: 'var(--text)', margin: 0 }}>{s.fullName}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '3px 0 0' }}>@{s.username}</p>
            {(s.university || group?.name) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>
                {[s.university, group?.name].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Points',      value: totalPoints },
            { label: 'Streak',      value: `${currentStreak}d` },
            { label: 'Active Days', value: activeDays },
            { label: 'Best Streak', value: `${bestStreak}d` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'serif', fontWeight: 700, fontSize: '18px', color: 'var(--gold)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Points Breakdown */}
        {(pointsBreakdown.rows.length > 0 || pointsBreakdown.bonusPts > 0) && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>POINTS BREAKDOWN</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pointsBreakdown.rows.map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{row.pts} pts</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Bonus Points</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{pointsBreakdown.bonusPts} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-card2)', border: '1px solid var(--gold)', borderRadius: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Total</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>{totalPoints} pts</span>
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>ACTIVITY</p>
          <StreakCalendar student={s} activities={activities} />
        </div>

        {/* Earned badges */}
        {earnedDefs.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
              BADGES ({earnedDefs.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {earnedDefs.map(def => (
                <span key={def.id} title={`${def.name}: ${def.desc}`} style={{ fontSize: '22px', cursor: 'default' }}>
                  {def.emoji}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent submissions */}
        {recentSubs.length > 0 && (
          <div>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>RECENT SUBMISSIONS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentSubs.map(sub => (
                <div key={sub.date} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDate(sub.date)}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>+{sub.points || sub.scoreOverride || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Community student card ────────────────────────────────────────
function CommunityStudentCard({ s, earnedBadges, challenges, onClick }) {
  const totalPoints   = getStudentGrandTotal(s, s.submissions || []);
  const currentStreak = getStudentStreak(s);
  const topBadges     = BADGE_DEFS.filter(d => earnedBadges.has(d.id)).slice(0, 2);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: '12px', padding: '14px', cursor: 'pointer',
        transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <InlineAvatar src={s.avatar} name={s.fullName} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.fullName}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            🔥 {currentStreak}d streak
          </p>
        </div>
        {topBadges.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {topBadges.map(b => (
              <span key={b.id} style={{ fontSize: '16px' }} title={b.name}>{b.emoji}</span>
            ))}
          </div>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{totalPoints}</span> pts
      </p>
    </div>
  );
}

// ─── Announcement row (challenge join) ────────────────────────────
function ChallengeAnnouncementRow({ challenge, studentId, joinChallenge }) {
  const [code,    setCode]    = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined,  setJoined]  = useState(false);

  if (joined) return null;

  async function handleJoin() {
    setJoining(true);
    const ok = await joinChallenge(challenge.id, studentId);
    setJoining(false);
    if (ok) setJoined(true);
  }

  async function handleJoinByCode() {
    if (!code.trim()) return;
    if (challenge.code && challenge.code.trim().toLowerCase() !== code.trim().toLowerCase()) {
      setCodeErr('Incorrect code.'); return;
    }
    setJoining(true);
    const ok = await joinChallenge(challenge.id, studentId);
    setJoining(false);
    if (ok) { setJoined(true); setCode(''); setCodeErr(''); }
    else setCodeErr('Failed to join. Please try again.');
  }

  return (
    <div className="bg-bg-card2 border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary">{challenge.name}</p>
          {challenge.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{challenge.description}</p>}
          {(challenge.startDate || challenge.endDate) && (
            <p className="text-xs text-muted mt-1">
              {challenge.startDate && challenge.endDate
                ? `${formatDate(challenge.startDate)} – ${formatDate(challenge.endDate)}`
                : challenge.startDate ? `Starts ${formatDate(challenge.startDate)}` : `Ends ${formatDate(challenge.endDate)}`}
            </p>
          )}
        </div>
        {!challenge.isPrivate && (
          <button onClick={handleJoin} disabled={joining} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-l disabled:opacity-50 transition-colors shrink-0">
            {joining ? 'Joining…' : 'Join'}
          </button>
        )}
      </div>
      {challenge.isPrivate && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => { setCode(e.target.value); setCodeErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
              placeholder="Enter code to join…"
              className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-primary outline-none focus:border-gold transition-colors"
            />
            <button onClick={handleJoinByCode} disabled={joining || !code.trim()} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-l disabled:opacity-50 transition-colors">
              {joining ? '…' : 'Join'}
            </button>
          </div>
          {codeErr && <p className="text-danger text-xs">{codeErr}</p>}
        </div>
      )}
    </div>
  );
}

// ─── localStorage helpers for dismissed announcements ─────────────
const DISMISSED_KEY = 'dismissed_announcements';
function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}
function saveDismissed(id) {
  const prev = getDismissed();
  if (!prev.includes(id)) localStorage.setItem(DISMISSED_KEY, JSON.stringify([...prev, id]));
}

function daysRemaining(endDateStr) {
  if (!endDateStr) return null;
  const [y, m, d] = endDateStr.split('-').map(Number);
  const end  = new Date(y, m - 1, d, 23, 59, 59);
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

// ─── Main Dashboard component ──────────────────────────────────────
export default function HomeTab({ onEditProfile }) {
  const { student } = useAuth();
  const {
    findGroupById, activitiesForGroup, periodsForGroup,
    challenges, challengeMemberships, joinChallenge,
    announcements, activities, students,
  } = useApp();

  const [dismissed,    setDismissed]   = useState(() => getDismissed());
  const [modalStudent, setModalStudent] = useState(null);

  const group = findGroupById(student.groupId);

  // ── Group-scoped derived data ────────────────────────────────────
  const groupActivities = useMemo(
    () => activitiesForGroup(student.groupId).filter(a => a.isActive !== false),
    [activities, student.groupId]
  );
  const groupPeriods = useMemo(
    () => periodsForGroup(student.groupId),
    [student.groupId]
  );

  // ── Computed stats ───────────────────────────────────────────────
  const totalPoints   = useMemo(() => getStudentGrandTotal(student, student.submissions || []), [student]);
  const currentStreak = useMemo(() => getStudentStreak(student),                    [student]);
  const activeDays    = useMemo(() => getStudentActiveDays(student),                [student]);
  const bestStreak    = useMemo(() => calcBestStreak(student),                      [student]);

  // ── My badges ───────────────────────────────────────────────────
  const myEarnedBadges = useMemo(
    () => computeEarnedBadges(student, activities, students, groupActivities, groupPeriods),
    [student, activities, students, groupActivities, groupPeriods]
  );

  // ── Group students (active, excluding self for community but include in rarity) ───
  const groupStudents = useMemo(
    () => students.filter(s => s.groupId === student.groupId && (s.status || 'active') === 'active'),
    [students, student.groupId]
  );

  // ── Per-student earned badges (for rarity + community cards) ────
  const allStudentBadges = useMemo(() => {
    const sorted = [...students]
      .filter(s => (s.status || 'active') === 'active')
      .sort((a, b) => getStudentGrandTotal(b, b.submissions || []) - getStudentGrandTotal(a, a.submissions || []));
    const ranks = {};
    sorted.forEach((s, i) => { ranks[s.id] = i + 1; });

    const map = {};
    groupStudents.forEach(s => {
      map[s.id] = computeEarnedBadges(s, activities, students, groupActivities, groupPeriods, ranks);
    });
    return map;
  }, [groupStudents, activities, students, groupActivities, groupPeriods]);

  // Badge rarity: how many group students earned each badge
  const badgeCounts = useMemo(() => {
    const counts = {};
    BADGE_DEFS.forEach(b => { counts[b.id] = 0; });
    Object.values(allStudentBadges).forEach(earned => {
      earned.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    });
    return counts;
  }, [allStudentBadges]);

  // ── Challenge data ───────────────────────────────────────────────
  const myIds = challengeMemberships
    .filter(m => m.studentId === student.id)
    .map(m => m.challengeId);
  const myChallenges = challenges.filter(c => myIds.includes(c.id));
  const challengeAnnouncements = challenges.filter(c =>
    c.isVisible &&
    (c.visibleToGroups.length === 0 || c.visibleToGroups.includes(student.groupId)) &&
    !myIds.includes(c.id)
  );

  // ── Admin announcements ──────────────────────────────────────────
  const adminAnnouncements = announcements
    .filter(a =>
      a.isActive &&
      (a.visibleToGroups.length === 0 || a.visibleToGroups.includes(student.groupId)) &&
      !dismissed.includes(a.id)
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  // ── Community students (same group, sorted by points) ───────────
  const communityStudents = useMemo(
    () => [...groupStudents].sort((a, b) => getStudentGrandTotal(b, b.submissions || []) - getStudentGrandTotal(a, a.submissions || [])),
    [groupStudents]
  );

  function handleDismiss(id) {
    saveDismissed(id);
    setDismissed(prev => [...prev, id]);
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mt-6 space-y-4">

      {/* ── Section 1: Profile Hero ─────────────────────────────── */}
      <div
        className="relative rounded-xl border border-border p-5"
        style={{ background: 'var(--gold-subtle)' }}
      >
        {/* Edit button */}
        <button
          onClick={onEditProfile}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-muted text-xs font-medium transition-all hover:border-gold hover:text-gold"
        >
          <Pencil size={11} /> Edit
        </button>

        <div className="flex flex-wrap items-center gap-5 pr-20">
          {/* Avatar */}
          <InlineAvatar src={student.avatar} name={student.fullName} size={64} />

          {/* Name / meta */}
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-xl text-primary leading-tight">{student.fullName}</h2>
            <p className="text-muted text-sm mt-0.5">@{student.username}</p>
            {(student.university || group?.name) && (
              <p className="text-muted text-xs mt-0.5">
                {[student.university, group?.name].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          <StatPill icon={<Flame size={12} />}       label={`${currentStreak} day streak`} />
          <StatPill icon={<Star size={12} />}         label={`${totalPoints} total points`} />
          <StatPill icon={<CalendarDays size={12} />} label={`${activeDays} active days`} />
        </div>
      </div>

      {/* ── Section 2: Stats Row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ProfileStatCard icon={<Star size={16} />}         value={totalPoints}   label="Total Points"   gold />
        <ProfileStatCard icon={<Flame size={16} />}        value={currentStreak} label="Current Streak" />
        <ProfileStatCard icon={<CalendarDays size={16} />} value={activeDays}    label="Active Days" />
        <ProfileStatCard icon={<Trophy size={16} />}       value={bestStreak}    label="Best Streak" />
      </div>

      {/* ── Section 3: Activity Calendar ─────────────────────────── */}
      <Card>
        <SectionHeading>Activity</SectionHeading>
        <StreakCalendar student={student} activities={activities} />
      </Card>

      {/* ── Section 4: Achievements ──────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionHeading className="mb-0">Achievements</SectionHeading>
          <span className="text-xs text-muted flex items-center gap-1">
            <Award size={12} className="text-gold" />
            {myEarnedBadges.size}/{BADGE_DEFS.length} earned
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: '10px' }}>
          {BADGE_DEFS.map(def => (
            <BadgeChip
              key={def.id}
              def={def}
              earned={myEarnedBadges.has(def.id)}
              rarityText={`${badgeCounts[def.id] || 0}/${groupStudents.length}`}
            />
          ))}
        </div>
      </Card>

      {/* ── Section 5: My Challenges ─────────────────────────────── */}
      <Card>
        <SectionHeading>My Challenges</SectionHeading>
        {myChallenges.length === 0 ? (
          <div className="space-y-3">
            <EmptyState icon="🏆" title="No challenges yet" text="You haven't joined any challenges yet." />
            <Link to="/challenge" className="block text-center text-sm font-semibold text-gold hover:text-gold-l transition-colors">
              Browse Challenges →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {myChallenges.map(c => {
              const daysLeft = c.isActive ? daysRemaining(c.endDate) : null;
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bg-card2 border border-border gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{c.name}</p>
                    {daysLeft !== null && (
                      <p className="text-xs text-muted mt-0.5">
                        {daysLeft === 0 ? 'Last day!' : daysLeft === 1 ? '1 day remaining' : `${daysLeft} days remaining`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-500/15 text-green-400' : 'bg-border text-muted'}`}>
                      {c.isActive ? 'Active' : 'Ended'}
                    </span>
                    <Link to="/challenge" className="text-xs font-semibold text-gold hover:text-gold-l transition-colors whitespace-nowrap">
                      Go to Challenge →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Challenge announcements (available to join) */}
        {challengeAnnouncements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Available to Join</p>
            {challengeAnnouncements.map(c => (
              <ChallengeAnnouncementRow key={c.id} challenge={c} studentId={student.id} joinChallenge={joinChallenge} />
            ))}
          </div>
        )}
      </Card>

      {/* ── Section 6: Announcements ─────────────────────────────── */}
      {adminAnnouncements.length > 0 && (
        <div className="space-y-2">
          {adminAnnouncements.map(ann => (
            <div
              key={ann.id}
              className="rounded-lg border border-border bg-bg-card px-4 py-3 flex gap-3 items-start"
              style={{ borderLeft: '3px solid var(--gold)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">{ann.title}</p>
                {ann.message && <p className="text-xs text-muted mt-0.5 whitespace-pre-wrap">{ann.message}</p>}
              </div>
              <button onClick={() => handleDismiss(ann.id)} className="text-muted hover:text-primary transition-colors text-xs flex-shrink-0 mt-0.5" aria-label="Dismiss">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 7: Community ─────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionHeading className="mb-0">Community</SectionHeading>
          <span className="text-xs text-muted flex items-center gap-1">
            <Users size={12} className="text-gold" />
            {communityStudents.length} member{communityStudents.length !== 1 ? 's' : ''}
          </span>
        </div>
        {communityStudents.length === 0 ? (
          <EmptyState icon="👥" title="No members yet" text="No other students in your group yet." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {communityStudents.map(s => (
              <CommunityStudentCard
                key={s.id}
                s={s}
                earnedBadges={allStudentBadges[s.id] || new Set()}
                challenges={challenges}
                onClick={() => setModalStudent(s)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ── Public Profile Modal ─────────────────────────────────── */}
      {modalStudent && (
        <PublicProfileModal
          s={modalStudent}
          activities={activities}
          allStudents={students}
          groupActivities={groupActivities}
          groupPeriods={groupPeriods}
          findGroupById={findGroupById}
          challenges={challenges}
          challengeMemberships={challengeMemberships}
          onClose={() => setModalStudent(null)}
        />
      )}
    </div>
  );
}
