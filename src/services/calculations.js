// ─────────────────────────────────────────────────────────────────
//  calculations.js — pure functions, no localStorage access
//  All existing business rules are preserved exactly.
// ─────────────────────────────────────────────────────────────────

import { diffDays, todayString } from './data.js';

// ─── Monday of the week containing dateStr (YYYY-MM-DD) ───────────
function getMondayString(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day  = date.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ─── Tasbih auto-reset check ──────────────────────────────────────
// resetType: 'none' | 'daily' | 'weekly'
// lastResetDate: YYYY-MM-DD string (may be '' or null for never reset)
// Returns: { needsReset: boolean, newLastResetDate: string }
export function checkAndResetTasbih(resetType, lastResetDate) {
  const today = todayString();
  if (!resetType || resetType === 'none') {
    return { needsReset: false, newLastResetDate: lastResetDate || '' };
  }
  if (resetType === 'daily') {
    return { needsReset: lastResetDate !== today, newLastResetDate: today };
  }
  if (resetType === 'weekly') {
    const thisMonday = getMondayString(today);
    const lastMonday = lastResetDate ? getMondayString(lastResetDate) : '';
    return { needsReset: lastMonday !== thisMonday, newLastResetDate: today };
  }
  return { needsReset: false, newLastResetDate: lastResetDate || '' };
}

// ─── Points map ───────────────────────────────────────────────────
function pointsMap(activities) {
  const map = {};
  activities.forEach(a => { map[a.id] = Number(a.points || 0); });
  return map;
}

function subPoints(sub, map) {
  if (typeof sub.scoreOverride === 'number') return sub.scoreOverride;
  return (sub.completedActivities || []).reduce((sum, id) => sum + Number(map[id] || 0), 0);
}

function bonusTotal(student) {
  return (student.bonusPoints || []).reduce((sum, b) => sum + Number(b.points || 0), 0);
}

function bonusBetween(student, start, end) {
  return (student.bonusPoints || [])
    .filter(b => b.date >= start && b.date <= end)
    .reduce((sum, b) => sum + Number(b.points || 0), 0);
}

// ─── Grand total: all challenge submissions + bonus points ────────────
export function getStudentGrandTotal(student, submissions, challenges) {
  const subPts = (submissions || []).reduce((sum, sub) => {
    const ch = (challenges || []).find(c => sub.date >= c.startDate && sub.date <= c.endDate);
    if (!ch) return sum;
    const chPts = (sub.completedActivities || []).reduce((s, actId) => {
      const act = (ch.activities || []).find(a => a.id === actId);
      return s + Number(act?.points || 0);
    }, 0);
    return sum + Number(chPts || 0);
  }, 0);
  const bonusPts = (student.bonusPoints || []).reduce((sum, b) => sum + Number(b.points || 0), 0);
  return subPts + bonusPts;
}

// ─── Total points across ALL submissions + bonus ───────────────────
export function getStudentTotalPoints(student, activities) {
  const map = pointsMap(activities);
  const actPts = (student.submissions || []).reduce((sum, sub) => sum + subPoints(sub, map), 0);
  return actPts + bonusTotal(student);
}

// ─── Points within a date range (inclusive) + bonus in range ─────
export function getStudentPeriodPoints(student, activities, periodStart, periodEnd) {
  if (!periodStart || !periodEnd) return 0;
  const map = pointsMap(activities);
  const actPts = (student.submissions || [])
    .filter(sub => sub.date >= periodStart && sub.date <= periodEnd)
    .reduce((sum, sub) => sum + subPoints(sub, map), 0);
  return actPts + bonusBetween(student, periodStart, periodEnd);
}

// ─── Points across admin-selected periods (All-Time tab) ─────────
// Falls back to total if no periods are marked countForAllTime=true
export function getStudentAllTimePoints(student, activities, periods) {
  const selected = periods.filter(p => !!p.countForAllTime);
  if (!selected.length) return getStudentTotalPoints(student, activities);
  const map = pointsMap(activities);
  const actPts = (student.submissions || [])
    .filter(sub => selected.some(p => sub.date >= p.startDate && sub.date <= p.endDate))
    .reduce((sum, sub) => sum + subPoints(sub, map), 0);
  const bPts = (student.bonusPoints || [])
    .filter(b => selected.some(p => b.date >= p.startDate && b.date <= p.endDate))
    .reduce((sum, b) => sum + (b.points || 0), 0);
  return actPts + bPts;
}

// ─── Active days ──────────────────────────────────────────────────
export function getStudentActiveDays(student) {
  const seen = {};
  (student.submissions || []).forEach(s => { seen[s.date] = true; });
  return Object.keys(seen).length;
}

// ─── Streak (backward from most-recent submitted day) ─────────────
// Rule: consecutive calendar days going backward from last submission.
export function getStudentStreak(student) {
  const subs = student.submissions || [];
  if (!subs.length) return 0;
  const seen = {};
  subs.forEach(s => { seen[s.date] = true; });
  const dates = Object.keys(seen).sort().reverse();
  if (!dates.length) return 0;
  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const gap = diffDays(dates[i + 1], dates[i]);
    if (gap === 1) { streak++; } else { break; }
  }
  return streak;
}

// ─── Leaderboard builder ──────────────────────────────────────────
// mode: 'alltime' | 'period' | 'total'
export function buildLeaderboard(students, activities, mode, options = {}) {
  const eligible = students.filter(s => (s.status || 'active') === 'active');
  const rows = eligible.map(s => {
    let pts;
    if (mode === 'period' && options.periodStart && options.periodEnd) {
      pts = getStudentPeriodPoints(s, activities, options.periodStart, options.periodEnd);
    } else if (mode === 'alltime' && options.periods) {
      pts = getStudentAllTimePoints(s, activities, options.periods);
    } else {
      pts = getStudentTotalPoints(s, activities);
    }
    return {
      id:         s.id,
      fullName:   s.fullName,
      username:   s.username,
      avatar:     s.avatar || null,
      points:     pts,
      activeDays: getStudentActiveDays(s),
      streak:     getStudentStreak(s),
    };
  });

  rows.sort((a, b) => {
    if (b.points     !== a.points)     return b.points     - a.points;
    if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
    return a.fullName.localeCompare(b.fullName);
  });

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ─── Completed periods (for Hall of Fame) ─────────────────────────
export function getCompletedPeriods(periods) {
  const today = todayString();
  return periods.filter(p => !p.isActive && p.endDate < today);
}

// ─── Today's quotes (group-scoped) ───────────────────────────────
export function getTodayQuotesForGroup(students) {
  const today = todayString();
  const quotes = [];
  students.forEach(s => {
    if ((s.status || 'active') !== 'active') return;
    const sub = (s.submissions || []).find(x => x.date === today);
    if (sub && sub.quote && sub.quote.trim()) {
      quotes.push({
        studentId:  s.id,
        name:       s.fullName,
        avatar:     s.avatar || null,
        quote:      sub.quote.trim(),
        quoteLikes: sub.quoteLikes || [],
        date:       today,
      });
    }
  });
  quotes.sort((a, b) => b.quoteLikes.length - a.quoteLikes.length);
  return quotes;
}

// ─── Points for a single submission ──────────────────────────────
export function submissionPoints(sub, activities) {
  if (typeof sub.scoreOverride === 'number') return sub.scoreOverride;
  const map = pointsMap(activities);
  return subPoints(sub, map);
}

// ─── Points per day for a student (for weekly chart) ─────────────
export function pointsPerDay(student, activities, dates) {
  const map = pointsMap(activities);
  return dates.map(dateStr => {
    const sub = (student.submissions || []).find(s => s.date === dateStr);
    return sub ? subPoints(sub, map) : 0;
  });
}
