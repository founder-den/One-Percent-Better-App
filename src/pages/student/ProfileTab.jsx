import { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import {
  Card, Button, Input, SectionHeading, Alert, EmptyState, PasswordInput,
} from '../../components/ui.jsx';
import { formatDate, todayString, parseLocalDate, dateToStr } from '../../services/data.js';
import {
  getStudentTotalPoints, getStudentStreak, getStudentActiveDays, submissionPoints,
} from '../../services/calculations.js';
import {
  Pencil, Camera, Flame, Star, CalendarDays, Trophy, Lock,
  X, Check, ChevronRight, Award,
} from 'lucide-react';

// ─── Badge definitions (emojis allowed here per spec) ─────────────
const BADGE_DEFS = [
  { id: 'first_step',    emoji: '🌟', name: 'First Step',    desc: 'Submit at least once' },
  { id: 'on_fire',       emoji: '🔥', name: 'On Fire',       desc: 'Achieve a 3-day streak' },
  { id: 'unstoppable',   emoji: '⚡', name: 'Unstoppable',   desc: 'Achieve a 7-day streak' },
  { id: 'diamond',       emoji: '💎', name: 'Diamond',       desc: 'Achieve a 30-day streak' },
  { id: 'top3',          emoji: '🏆', name: 'Top 3',         desc: 'Rank top 3 overall' },
  { id: 'champion',      emoji: '👑', name: 'Champion',      desc: 'Rank #1 overall' },
  { id: 'bookworm',      emoji: '📚', name: 'Bookworm',      desc: 'Complete Reading Book 10+ times' },
  { id: 'night_owl',     emoji: '🌙', name: 'Night Owl',     desc: 'Complete Tahajjud 10+ times' },
  { id: 'century',       emoji: '✨', name: 'Century',       desc: 'Earn 100+ total points' },
  { id: 'high_achiever', emoji: '🚀', name: 'High Achiever', desc: 'Earn 500+ total points' },
  { id: 'perfect_week',  emoji: '💯', name: 'Perfect Week',  desc: 'Submit all 7 days in a week' },
  { id: 'consistent',    emoji: '🎯', name: 'Consistent',    desc: 'Submit 30+ total days' },
];

// ─── Pure helpers ──────────────────────────────────────────────────
function calcBestStreak(student) {
  const subs = student.submissions || [];
  if (!subs.length) return 0;
  const seen = {};
  subs.forEach(s => { seen[s.date] = true; });
  const dates = Object.keys(seen).sort();
  if (dates.length === 0) return 0;
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
    const dow = d.getDay(); // 0=Sun…6=Sat
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

function computeEarnedBadges(student, activities, students) {
  const subs = student.submissions || [];
  const totalPoints  = getStudentTotalPoints(student, activities);
  const bestStreak   = calcBestStreak(student);
  const activeDays   = getStudentActiveDays(student);

  const readIds      = activities.filter(a => a.name.toLowerCase().includes('reading book')).map(a => a.id);
  const tahajjudIds  = activities.filter(a => a.name.toLowerCase().includes('tahajjud')).map(a => a.id);
  const readCount    = subs.reduce((n, s) => n + (s.completedActivities||[]).filter(id => readIds.includes(id)).length, 0);
  const tahCount     = subs.reduce((n, s) => n + (s.completedActivities||[]).filter(id => tahajjudIds.includes(id)).length, 0);

  const sorted = [...students]
    .filter(s => (s.status || 'active') === 'active')
    .sort((a, b) => getStudentTotalPoints(b, activities) - getStudentTotalPoints(a, activities));
  const myRank = sorted.findIndex(s => s.id === student.id) + 1;

  const earned = new Set();
  if (subs.length > 0)             earned.add('first_step');
  if (bestStreak >= 3)             earned.add('on_fire');
  if (bestStreak >= 7)             earned.add('unstoppable');
  if (bestStreak >= 30)            earned.add('diamond');
  if (myRank > 0 && myRank <= 3)  earned.add('top3');
  if (myRank === 1)                earned.add('champion');
  if (readCount >= 10)             earned.add('bookworm');
  if (tahCount >= 10)              earned.add('night_owl');
  if (totalPoints >= 100)          earned.add('century');
  if (totalPoints >= 500)          earned.add('high_achiever');
  if (checkPerfectWeek(subs))      earned.add('perfect_week');
  if (activeDays >= 30)            earned.add('consistent');
  return earned;
}

// ─── Avatar with camera-overlay upload ────────────────────────────
function AvatarUpload({ avatar, name, onUpload }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onUpload(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div
      className="relative flex-shrink-0 group cursor-pointer"
      style={{ width: 80, height: 80 }}
      onClick={() => inputRef.current?.click()}
      title="Click to change photo"
    >
      {/* Ring */}
      <div
        className="w-full h-full rounded-full overflow-hidden bg-surface flex items-center justify-center font-bold font-serif text-2xl text-gold"
        style={{ boxShadow: '0 0 0 2.5px var(--gold)' }}
      >
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : <span>{initials}</span>
        }
      </div>
      {/* Camera overlay */}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera size={20} className="text-white" />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Quick stat pill ───────────────────────────────────────────────
function StatPill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-card2 border border-border text-xs font-semibold text-muted">
      <span className="text-gold">{icon}</span>
      {label}
    </div>
  );
}

// ─── Stat card (for the 4-card row) ───────────────────────────────
function ProfileStatCard({ icon, value, label, gold = false }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-1.5 text-center">
      <span className="text-gold">{icon}</span>
      <div className={`font-serif font-bold text-2xl leading-none ${gold ? 'text-gold' : 'text-primary'}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted">{label}</div>
    </div>
  );
}

// ─── Streak calendar (GitHub-style, columns = weeks) ──────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS  = ['M','T','W','T','F','S','S'];

function StreakCalendar({ student, activities }) {
  const today     = todayString();
  const todayDate = parseLocalDate(today);

  const subMap = useMemo(() => {
    const m = {};
    (student.submissions || []).forEach(s => { m[s.date] = s; });
    return m;
  }, [student.submissions]);

  // 90 days ending today
  const rangeStart = new Date(todayDate);
  rangeStart.setDate(rangeStart.getDate() - 89);
  const rangeStartStr = dateToStr(rangeStart);

  // Pad back to the nearest Monday so weeks align Mon–Sun
  const startDow = rangeStart.getDay(); // 0=Sun…6=Sat
  const padDays  = startDow === 0 ? 6 : startDow - 1;
  const gridStart = new Date(rangeStart);
  gridStart.setDate(gridStart.getDate() - padDays);

  // Build day array (sequential Mon→Sun per group of 7)
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

  // Group into weeks (each = one column, 7 days Mon→Sun)
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const activeDaysInRange = allDays.filter(d => !d.isPad && d.submitted).length;

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        {/* Outer column: day labels + week columns side by side */}
        <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'flex-start' }}>

          {/* Day-of-week labels column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '14px' }}>
            {DAY_LABELS.map((lbl, i) => (
              <div
                key={i}
                style={{
                  width: '10px', height: '10px',
                  fontSize: '8px', lineHeight: '10px',
                  color: 'var(--text-muted)',
                  textAlign: 'right',
                  paddingRight: '1px',
                  userSelect: 'none',
                }}
              >
                {i % 2 === 0 ? lbl : ''}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => {
            // Month label: show at the start of a new month
            const firstReal = week.find(d => !d.isPad);
            const prevFirst = wi > 0 ? weeks[wi - 1].find(d => !d.isPad) : null;
            const showMonth = firstReal && (!prevFirst || firstReal.month !== prevFirst.month);

            return (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                {/* Month label */}
                <div
                  style={{
                    height: '12px',
                    fontSize: '8px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    lineHeight: '12px',
                  }}
                >
                  {showMonth ? MONTH_NAMES[firstReal.month] : ''}
                </div>

                {/* Day squares */}
                {week.map((day, di) => (
                  <div
                    key={di}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      flexShrink: 0,
                      background: day.isPad
                        ? 'transparent'
                        : day.submitted
                          ? 'var(--gold)'
                          : 'var(--surface)',
                      outline: day.isToday ? '1.5px solid var(--gold)' : undefined,
                      outlineOffset: '1px',
                      cursor: 'default',
                      transition: 'opacity 0.1s',
                    }}
                    title={
                      !day.isPad
                        ? `${formatDate(day.date)}${day.submitted ? ` · ${day.points} pts` : ' · No submission'}`
                        : undefined
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <p className="text-xs text-muted">
          <span className="font-semibold text-primary">{activeDaysInRange}</span> day{activeDaysInRange !== 1 ? 's' : ''} active in the last 90 days
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span>Less</span>
          {[0, 0.3, 0.6, 1].map((op, i) => (
            <div
              key={i}
              style={{
                width: '10px', height: '10px', borderRadius: '2px',
                background: op === 0 ? 'var(--surface)' : `var(--gold)`,
                opacity: op === 0 ? 1 : op,
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Achievement badge chip ────────────────────────────────────────
function BadgeChip({ def, earned }) {
  return (
    <div
      title={`${def.name}: ${def.desc}`}
      style={{
        position: 'relative',
        display:  'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:    '6px',
        padding: '14px 8px 10px',
        borderRadius: '12px',
        background: 'var(--bg-card2)',
        border:   `1px solid var(--border)`,
        filter:   earned ? 'none' : 'grayscale(1)',
        opacity:  earned ? 1 : 0.3,
        boxShadow: earned ? '0 0 14px var(--gold-subtle)' : 'none',
        cursor: 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (earned) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={{ fontSize: '26px', lineHeight: 1 }}>{def.emoji}</span>
      <span style={{
        fontSize: '9px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3,
      }}>
        {def.name}
      </span>
      {!earned && (
        <div style={{ position: 'absolute', top: '6px', right: '6px', color: 'var(--text-muted)', opacity: 0.7 }}>
          <Lock size={9} />
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────
export default function ProfileTab() {
  const { student } = useAuth();
  const { updateStudent, findGroupById, activities, students } = useApp();

  const group = findGroupById(student.groupId);

  // Edit-profile state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName:   student.fullName   || '',
    username:   student.username   || '',
    university: student.university || '',
    phone:      student.phone      || '',
  });
  const [avatar, setAvatar] = useState(student.avatar || null);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState('');

  // Password-change state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwErr,  setPwErr]  = useState('');
  const [pwOk,   setPwOk]   = useState('');

  // ── Computed stats ──────────────────────────────────────────────
  const totalPoints   = useMemo(() => getStudentTotalPoints(student, activities),      [student, activities]);
  const currentStreak = useMemo(() => getStudentStreak(student),                       [student]);
  const activeDays    = useMemo(() => getStudentActiveDays(student),                   [student]);
  const bestStreak    = useMemo(() => calcBestStreak(student),                         [student]);
  const earnedBadges  = useMemo(() => computeEarnedBadges(student, activities, students), [student, activities, students]);

  const bonusPoints = useMemo(() =>
    [...(student.bonusPoints || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [student.bonusPoints],
  );
  const bonusTotal = bonusPoints.reduce((s, b) => s + (b.points || 0), 0);

  const recentSubs = useMemo(() =>
    [...(student.submissions || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [student.submissions],
  );

  const activityMap = useMemo(() => {
    const m = {};
    activities.forEach(a => { m[a.id] = a; });
    return m;
  }, [activities]);

  // ── Handlers ────────────────────────────────────────────────────
  function set(k) {
    return e => { setForm(f => ({ ...f, [k]: e.target.value })); setSaved(false); setErr(''); };
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setErr(''); setSaved(false);
    if (!form.fullName.trim()) { setErr('Full name is required.'); return; }
    if (!form.username.trim() || form.username.length < 3) { setErr('Username must be at least 3 characters.'); return; }
    const ok = await updateStudent(student.id, {
      fullName:   form.fullName.trim(),
      username:   form.username.trim(),
      university: form.university.trim(),
      phone:      form.phone.trim(),
      avatar,
    });
    if (ok) { setSaved(true); setEditing(false); }
    else setErr('Failed to save. Please try again.');
  }

  async function handleAvatarUpload(dataUrl) {
    setAvatar(dataUrl);
    await updateStudent(student.id, { avatar: dataUrl });
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwErr(''); setPwOk('');
    if (pwForm.current !== student.password) { setPwErr('Current password is incorrect.'); return; }
    if (pwForm.newPw.length < 4) { setPwErr('New password must be at least 4 characters.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwErr('Passwords do not match.'); return; }
    const ok = await updateStudent(student.id, { password: pwForm.newPw });
    if (ok) { setPwForm({ current: '', newPw: '', confirm: '' }); setPwOk('Password changed successfully.'); }
    else setPwErr('Failed to update password. Please try again.');
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="mt-6 max-w-2xl space-y-4">

      {/* ── Part 1: Profile Header Card ─────────────────────────── */}
      <Card className="relative overflow-visible">
        {/* Edit button */}
        <button
          onClick={() => { setEditing(v => !v); setErr(''); setSaved(false); }}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted text-xs font-medium transition-all hover:border-gold hover:text-gold"
        >
          <Pencil size={12} />
          Edit
        </button>

        <div className="flex flex-wrap items-center gap-5 pr-16">
          {/* Avatar */}
          <AvatarUpload
            avatar={avatar}
            name={student.fullName}
            onUpload={handleAvatarUpload}
          />

          {/* Name + info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-xl text-primary leading-tight">
              {student.fullName}
            </h2>
            <p className="text-muted text-sm mt-0.5">@{student.username}</p>
            {(student.university || group?.name) && (
              <p className="text-muted text-xs mt-0.5">
                {[student.university, group?.name].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Quick stat pills */}
          <div className="flex flex-wrap gap-2">
            <StatPill icon={<Flame size={12} />} label={`${currentStreak}d streak`} />
            <StatPill icon={<Star size={12} />}   label={`${totalPoints} pts`} />
            <StatPill icon={<CalendarDays size={12} />} label={`${activeDays} days`} />
          </div>
        </div>
      </Card>

      {/* ── Part 5: Inline Edit Form (shown when editing) ────────── */}
      {editing && (
        <Card>
          <SectionHeading>Edit Profile</SectionHeading>
          {saved && <Alert type="success">Profile saved.</Alert>}
          {err   && <Alert type="error">{err}</Alert>}

          {/* Avatar upload row */}
          <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-bg-card2 border border-border">
            <div
              className="w-14 h-14 rounded-full overflow-hidden bg-surface flex items-center justify-center flex-shrink-0 font-bold text-gold"
              style={{ boxShadow: '0 0 0 2px var(--gold)' }}
            >
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                : <span>{(form.fullName || '?').charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted text-xs font-medium cursor-pointer hover:border-gold hover:text-gold transition-all">
                <Camera size={12} />
                Upload Photo
                <input
                  type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => { setAvatar(ev.target.result); };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </label>
              {avatar && (
                <Button variant="danger" size="sm" onClick={() => setAvatar(null)}>Remove</Button>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <Input label="Full Name"   value={form.fullName}   onChange={set('fullName')}   placeholder="Your full name" />
            <Input label="Username"    value={form.username}   onChange={set('username')}   placeholder="Min 3 characters" autoComplete="username" />
            <Input label="University"  value={form.university} onChange={set('university')} placeholder="e.g. Harvard University" />
            <Input label="Phone"       value={form.phone}      onChange={set('phone')}      placeholder="e.g. +1 617 555 0100" type="tel" />
            {group && (
              <p className="text-xs text-muted -mt-2 mb-4">
                Group: <span className="text-gold font-medium">{group.name}</span>
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-1.5">
                <Check size={14} /> Save Changes
              </Button>
              <Button
                type="button" variant="ghost"
                onClick={() => { setEditing(false); setErr(''); }}
                className="gap-1.5"
              >
                <X size={14} /> Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Part 2: Stats Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ProfileStatCard icon={<Star size={16} />}        value={totalPoints}   label="Total Points"    gold />
        <ProfileStatCard icon={<Flame size={16} />}       value={currentStreak} label="Current Streak" />
        <ProfileStatCard icon={<CalendarDays size={16} />} value={activeDays}   label="Active Days" />
        <ProfileStatCard icon={<Trophy size={16} />}      value={bestStreak}    label="Best Streak" />
      </div>

      {/* ── Part 3: Streak Calendar ───────────────────────────────── */}
      <Card>
        <SectionHeading>Activity</SectionHeading>
        <StreakCalendar student={student} activities={activities} />
      </Card>

      {/* ── Part 4: Achievements ──────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionHeading className="mb-0">Achievements</SectionHeading>
          <span className="text-xs text-muted flex items-center gap-1">
            <Award size={12} className="text-gold" />
            {earnedBadges.size}/{BADGE_DEFS.length} earned
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
            gap: '10px',
          }}
        >
          {BADGE_DEFS.map(def => (
            <BadgeChip key={def.id} def={def} earned={earnedBadges.has(def.id)} />
          ))}
        </div>
      </Card>

      {/* ── Part 6: Recent Activity ───────────────────────────────── */}
      <Card>
        <SectionHeading>Recent Activity</SectionHeading>
        {recentSubs.length === 0 ? (
          <EmptyState icon="📋" title="No submissions yet" text="Start submitting to see your activity here." />
        ) : (
          <div>
            {recentSubs.map((sub, i) => {
              const pts = submissionPoints(sub, activities);
              return (
                <div
                  key={sub.date}
                  className="flex items-start justify-between gap-3 py-3"
                  style={{ borderBottom: i < recentSubs.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-muted mb-2">{formatDate(sub.date)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(sub.completedActivities || []).map(id => {
                        const act = activityMap[id];
                        return act ? (
                          <span
                            key={id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--gold-subtle)] text-gold border border-gold-d"
                          >
                            {act.name}
                          </span>
                        ) : null;
                      })}
                      {!(sub.completedActivities || []).length && (
                        <span className="text-xs text-muted">No activities logged</span>
                      )}
                    </div>
                  </div>
                  <span className="text-gold font-bold text-sm flex-shrink-0 pt-0.5">+{pts}</span>
                </div>
              );
            })}
            <button className="mt-3 flex items-center gap-1 text-xs text-gold font-medium hover:text-gold-l transition-colors">
              View all in Challenge History <ChevronRight size={13} />
            </button>
          </div>
        )}
      </Card>

      {/* ── Change Password ───────────────────────────────────────── */}
      <Card>
        <SectionHeading>Change Password</SectionHeading>
        {pwErr && <Alert type="error">{pwErr}</Alert>}
        {pwOk  && <Alert type="success">{pwOk}</Alert>}
        <form onSubmit={handleChangePassword}>
          <PasswordInput
            label="Current Password"
            value={pwForm.current}
            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
            autoComplete="current-password"
          />
          <PasswordInput
            label="New Password"
            value={pwForm.newPw}
            onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
            placeholder="Min 4 characters"
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm Password"
            value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          <Button type="submit" full variant="outline">Change Password</Button>
        </form>
      </Card>

      {/* ── Bonus Points History ──────────────────────────────────── */}
      <Card>
        <SectionHeading>Bonus Points</SectionHeading>
        {bonusPoints.length === 0 ? (
          <EmptyState icon="🎁" title="No bonus points yet" text="Bonus points awarded by your admin will appear here." />
        ) : (
          <>
            <p className="text-xs text-muted mb-3">
              Total bonus received:{' '}
              <span className="text-gold font-semibold">+{bonusTotal} pts</span>
            </p>
            <div className="space-y-2">
              {bonusPoints.map(b => (
                <div
                  key={b.id}
                  className="flex items-start justify-between gap-3 py-2.5 px-3 rounded-xl bg-bg-card2 border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-primary font-medium">{b.reason || 'Bonus points'}</p>
                    <p className="text-xs text-muted">{formatDate(b.date)}</p>
                  </div>
                  <span className="text-gold font-bold text-sm flex-shrink-0">+{b.points}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

    </div>
  );
}
