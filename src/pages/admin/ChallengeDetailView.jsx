import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { supabase } from '../../services/supabase.js';
import {
  Button, Input, Card, SectionHeading, EmptyState, Badge, Tabs,
} from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';

// ─── SVG Donut ────────────────────────────────────────────────────────
function Donut({ pct, size = 80, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--surface)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--gold)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill="var(--text)"
        fontSize={size > 100 ? 18 : 13}
        fontWeight="bold"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Activities sub-tab ───────────────────────────────────────────────
function ChallengeActivitiesTab({ challenge, onUpdate }) {
  const [name,     setName]     = useState('');
  const [points,   setPoints]   = useState('');
  const [err,      setErr]      = useState('');
  const [editId,   setEditId]   = useState(null);
  const [editName, setEditName] = useState('');
  const [editPts,  setEditPts]  = useState('');

  const activities = challenge.activities || [];

  function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim())              { setErr('Name is required.'); return; }
    const pts = parseInt(points);
    if (isNaN(pts) || pts <= 0)   { setErr('Points must be a positive number.'); return; }
    const newAct = { id: `act_${Date.now()}`, name: name.trim(), points: pts, isActive: true };
    onUpdate({ activities: [...activities, newAct] });
    setName(''); setPoints('');
  }

  function saveEdit() {
    if (!editName.trim()) return;
    const pts = parseInt(editPts);
    if (isNaN(pts) || pts <= 0) return;
    onUpdate({ activities: activities.map(a => a.id === editId ? { ...a, name: editName.trim(), points: pts } : a) });
    setEditId(null);
  }

  function toggleActive(act) {
    onUpdate({ activities: activities.map(a => a.id === act.id ? { ...a, isActive: !(a.isActive ?? true) } : a) });
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeading>Add Activity</SectionHeading>
        <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-40">
            <Input
              label="Activity Name"
              value={name}
              onChange={e => { setName(e.target.value); setErr(''); }}
              placeholder="e.g. Quran Reading"
            />
          </div>
          <div className="w-28">
            <Input
              label="Points"
              type="number"
              value={points}
              onChange={e => { setPoints(e.target.value); setErr(''); }}
              placeholder="10"
              min="1"
            />
          </div>
          <Button type="submit" className="mb-4">Add</Button>
        </form>
        {err && <p className="text-xs text-danger -mt-2">{err}</p>}
      </Card>

      <Card>
        <SectionHeading>Activities ({activities.length})</SectionHeading>
        {activities.length === 0 && (
          <EmptyState icon="📋" title="No activities" text="Add challenge-specific activities above." />
        )}
        <div className="space-y-2">
          {activities.map(act => {
            const isActive = act.isActive ?? true;
            if (editId === act.id) {
              return (
                <div key={act.id} className="border border-gold-d rounded-lg p-3 bg-[var(--gold-subtle)]">
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-32">
                      <Input label="Name" value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div className="w-24">
                      <Input label="Points" type="number" value={editPts} onChange={e => setEditPts(e.target.value)} min="1" />
                    </div>
                    <div className="flex gap-2 mb-4">
                      <Button size="sm" onClick={saveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={act.id}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg border transition-all
                  ${isActive ? 'border-border bg-bg-card2' : 'border-border bg-surface opacity-50'}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-primary">{act.name}</span>
                  <span className="ml-2 text-xs text-gold font-semibold">+{act.points} pts</span>
                </div>
                <Badge variant={isActive ? 'success' : 'muted'}>{isActive ? 'Active' : 'Inactive'}</Badge>
                <Button
                  size="xs" variant="ghost"
                  onClick={() => { setEditId(act.id); setEditName(act.name); setEditPts(String(act.points)); }}
                >Edit</Button>
                <Button size="xs" variant={isActive ? 'ghost' : 'success'} onClick={() => toggleActive(act)}>
                  {isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── Periods sub-tab ──────────────────────────────────────────────────
// Periods are stored in the `periods` jsonb column (not mapped by db.js),
// so we read/write via supabase directly and keep local state.
function ChallengePeriodsTab({ challengeId }) {
  const [periods,  setPeriods]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [name,     setName]     = useState('');
  const [start,    setStart]    = useState('');
  const [end,      setEnd]      = useState('');
  const [err,      setErr]      = useState('');

  const sorted = [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));

  useEffect(() => {
    supabase
      .from('challenges')
      .select('periods')
      .eq('id', challengeId)
      .maybeSingle()
      .then(({ data }) => {
        setPeriods(data?.periods || []);
        setLoading(false);
      });
  }, [challengeId]);

  async function persist(updated) {
    setPeriods(updated);
    await supabase.from('challenges').update({ periods: updated }).eq('id', challengeId);
  }

  function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim())   { setErr('Name is required.'); return; }
    if (!start || !end) { setErr('Start and end dates are required.'); return; }
    if (start > end)    { setErr('Start date must be before end date.'); return; }
    const overlap = periods.find(p => !(end < p.startDate || start > p.endDate));
    if (overlap)        { setErr(`Overlaps with "${overlap.name}".`); return; }
    const newP = { id: `period_${Date.now()}`, name: name.trim(), startDate: start, endDate: end, isActive: false };
    persist([...periods, newP]);
    setName(''); setStart(''); setEnd('');
  }

  function activate(pid) {
    persist(periods.map(p => ({ ...p, isActive: p.id === pid })));
  }

  function deactivate(pid) {
    persist(periods.map(p => p.id === pid ? { ...p, isActive: false } : p));
  }

  function handleDelete(pid) {
    if (!window.confirm('Delete this period?')) return;
    persist(periods.filter(p => p.id !== pid));
  }

  if (loading) {
    return <p className="text-sm text-muted mt-6">Loading periods…</p>;
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeading>Add Period</SectionHeading>
        <form onSubmit={handleAdd}>
          <Input
            label="Period Name"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
            placeholder="e.g. Week 1"
          />
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <Input label="Start Date" type="date" value={start} onChange={e => { setStart(e.target.value); setErr(''); }} />
            </div>
            <div className="flex-1 min-w-32">
              <Input label="End Date"   type="date" value={end}   onChange={e => { setEnd(e.target.value);   setErr(''); }} />
            </div>
          </div>
          {err && <p className="text-xs text-danger -mt-2 mb-3">{err}</p>}
          <Button type="submit" full>Add Period</Button>
        </form>
      </Card>

      <Card>
        <SectionHeading>Periods ({sorted.length})</SectionHeading>
        {sorted.length === 0 && (
          <EmptyState icon="📅" title="No periods yet" text="Add a period above." />
        )}
        <div className="space-y-4">
          {sorted.map(p => (
            <div
              key={p.id}
              className={`border rounded-lg p-4 ${p.isActive ? 'border-gold-d bg-[var(--gold-subtle)]' : 'border-border bg-bg-card2'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-primary text-sm">{p.name}</span>
                    {p.isActive && <Badge variant="success">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {!p.isActive && (
                    <Button size="xs" variant="success" onClick={() => activate(p.id)}>Activate</Button>
                  )}
                  {p.isActive && (
                    <Button size="xs" variant="ghost" onClick={() => deactivate(p.id)}>Deactivate</Button>
                  )}
                  <Button size="xs" variant="danger" onClick={() => handleDelete(p.id)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Members sub-tab ──────────────────────────────────────────────────
function ChallengeMembersTab({ challenge, students, memberships, onReload }) {
  const members = memberships
    .filter(m => m.challengeId === challenge.id)
    .map(m => {
      const s = students.find(st => st.id === m.studentId);
      return s ? { ...s, joinedAt: m.joinedAt, membershipId: m.id } : null;
    })
    .filter(Boolean);

  async function handleRemove(membershipId, displayName) {
    if (!window.confirm(`Remove ${displayName} from this challenge?`)) return;
    const { error } = await supabase
      .from('challenge_memberships')
      .delete()
      .eq('id', membershipId);
    if (!error) onReload();
  }

  return (
    <div className="mt-2">
      <Card>
        <SectionHeading>Members ({members.length})</SectionHeading>
        {members.length === 0 && (
          <EmptyState icon="👥" title="No members yet" text="Students can join from the challenge page." />
        )}
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border bg-bg-card2">
              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted flex-shrink-0">
                {(m.fullName || m.username || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-primary font-medium truncate">{m.fullName || m.username}</p>
                <p className="text-xs text-muted">@{m.username}</p>
              </div>
              {m.joinedAt && (
                <p className="text-xs text-muted flex-shrink-0 hidden sm:block">
                  Joined {formatDate(m.joinedAt.slice(0, 10))}
                </p>
              )}
              <Button
                size="xs"
                variant="danger"
                onClick={() => handleRemove(m.membershipId, m.fullName || m.username)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Data sub-tab ─────────────────────────────────────────────────────
function ChallengeDataTab({ challenge, students, memberships }) {
  const memberIds = memberships
    .filter(m => m.challengeId === challenge.id)
    .map(m => m.studentId);

  const memberStudents = students.filter(s => memberIds.includes(s.id));
  const activities     = challenge.activities || [];

  // All submissions from members within the challenge date range
  const allSubs = memberStudents.flatMap(s =>
    (s.submissions || [])
      .filter(sub => {
        if (!sub.date) return false;
        if (challenge.startDate && sub.date < challenge.startDate) return false;
        if (challenge.endDate   && sub.date > challenge.endDate)   return false;
        return true;
      })
      .map(sub => ({ ...sub, studentId: s.id }))
  );

  // Section 1
  const submittedIds  = new Set(allSubs.map(s => s.studentId));
  const totalMembers  = memberIds.length;
  const submittedCount = submittedIds.size;
  const submissionPct  = totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0;

  // Section 2 — per-activity completion rate
  const activityStats = activities.map(act => {
    const count = allSubs.filter(sub =>
      (sub.completedActivities || []).some(ca =>
        (typeof ca === 'string' ? ca : ca?.id) === act.id
      )
    ).length;
    const pct = allSubs.length > 0 ? (count / allSubs.length) * 100 : 0;
    return { ...act, count, pct };
  });

  // Section 3 — top 3 leaderboard
  const leaderboard = memberStudents
    .map(s => {
      const pts = (s.submissions || []).reduce((sum, sub) => {
        if (!sub.date) return sum;
        if (challenge.startDate && sub.date < challenge.startDate) return sum;
        if (challenge.endDate   && sub.date > challenge.endDate)   return sum;
        return sum + (sub.completedActivities || []).reduce((aSum, ca) => {
          const actId = typeof ca === 'string' ? ca : ca?.id;
          const act   = activities.find(a => a.id === actId);
          return aSum + (act ? act.points : 0);
        }, 0);
      }, 0);
      return { ...s, pts };
    })
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  return (
    <div className="space-y-6 mt-2">
      {/* Section 1 — Overall submission rate */}
      <Card>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Overall Submission Rate</p>
        <div className="flex items-center gap-6">
          <Donut pct={submissionPct} size={120} stroke={12} />
          <div className="space-y-1.5">
            <p className="text-sm text-primary">
              <span className="font-bold text-gold">{submittedCount}</span>
              {' '}of{' '}
              <span className="font-bold">{totalMembers}</span>
              {' '}members submitted
            </p>
            <p className="text-sm text-muted">
              <span className="font-bold text-primary">{allSubs.length}</span> total submissions
            </p>
          </div>
        </div>
      </Card>

      {/* Section 2 — Activity completion rates */}
      {activities.length > 0 && (
        <Card>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Activity Completion Rates</p>
          {allSubs.length === 0 ? (
            <EmptyState icon="📊" title="No submissions yet" text="Data will appear when members start submitting." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {activityStats.map(act => (
                <div key={act.id} className="flex flex-col items-center gap-1">
                  <Donut pct={act.pct} size={80} stroke={9} />
                  <p className="text-xs text-primary font-medium text-center leading-tight mt-1">{act.name}</p>
                  <p className="text-xs text-muted">{act.count} submission{act.count !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Section 3 — Top 3 */}
      <Card>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Top 3 Leaderboard</p>
        {leaderboard.length === 0 ? (
          <EmptyState icon="🏆" title="No members yet" />
        ) : (
          <div className="space-y-2">
            {leaderboard.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border bg-bg-card2">
                <span className="text-sm font-bold text-gold w-5 text-center flex-shrink-0">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-muted flex-shrink-0">
                  {(s.fullName || s.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary font-medium truncate">{s.fullName || s.username}</p>
                  {s.username && s.fullName && (
                    <p className="text-xs text-muted">@{s.username}</p>
                  )}
                </div>
                <p className="text-sm font-bold text-gold flex-shrink-0">{s.pts} pts</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Detail view root ─────────────────────────────────────────────────
const DETAIL_TABS = [
  { key: 'activities', label: 'Activities' },
  { key: 'periods',    label: 'Periods' },
  { key: 'members',    label: 'Members' },
  { key: 'data',       label: 'Data' },
];

export default function ChallengeDetailView({ challengeId, onBack }) {
  const { challenges, challengeMemberships, students, updateChallenge, reload } = useApp();
  const [activeTab, setActiveTab] = useState('activities');

  // Always read the live challenge from context so updates reflect immediately
  const challenge = challenges.find(c => c.id === challengeId);

  if (!challenge) {
    return (
      <div className="mt-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back to Challenges</Button>
        <p className="text-sm text-muted mt-4">Challenge not found.</p>
      </div>
    );
  }

  // activities go through AppContext (db.js supports them)
  async function handleUpdate(fields) {
    await updateChallenge(challenge.id, fields);
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <button
        onClick={onBack}
        className="text-sm text-muted hover:text-primary transition-colors mb-4 flex items-center gap-1"
      >
        ← Back to Challenges
      </button>

      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h2 className="text-lg font-semibold text-primary">{challenge.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${challenge.isActive ? 'bg-green-500/15 text-green-400' : 'bg-border text-muted'}`}>
          {challenge.isActive ? 'Active' : 'Ended'}
        </span>
      </div>
      {challenge.description && (
        <p className="text-sm text-muted mb-4">{challenge.description}</p>
      )}

      {/* Sub-tabs */}
      <Tabs tabs={DETAIL_TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'activities' && (
        <ChallengeActivitiesTab
          challenge={challenge}
          onUpdate={handleUpdate}
        />
      )}
      {activeTab === 'periods' && (
        <ChallengePeriodsTab challengeId={challenge.id} />
      )}
      {activeTab === 'members' && (
        <ChallengeMembersTab
          challenge={challenge}
          students={students}
          memberships={challengeMemberships}
          onReload={reload}
        />
      )}
      {activeTab === 'data' && (
        <ChallengeDataTab
          challenge={challenge}
          students={students}
          memberships={challengeMemberships}
        />
      )}
    </div>
  );
}
