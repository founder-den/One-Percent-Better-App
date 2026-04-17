import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { supabase } from '../../services/supabase.js';
import { Tabs } from '../../components/ui.jsx';
import DashboardTab     from '../student/DashboardTab.jsx';
import HistoryTab       from '../student/HistoryTab.jsx';
import LeaderboardInner from './LeaderboardInner.jsx';

const INNER_TABS = [
  { key: 'submissions', label: 'Submission' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'history',     label: 'History' },
];

// ─── Auth guards ─────────────────────────────────────────────────
function NotLoggedIn() {
  return (
    <div className="max-w-sm mx-auto text-center py-24 px-6">
      <div className="text-5xl opacity-30 mb-5">🔒</div>
      <h2 className="font-serif text-2xl mb-3">Login Required</h2>
      <p className="text-muted text-sm mb-6">Sign in to view challenges.</p>
      <Link
        to="/student"
        className="px-6 py-2.5 bg-gold text-bg font-semibold rounded-xl hover:bg-gold-l text-sm inline-block"
      >
        Go to Login
      </Link>
    </div>
  );
}

function PendingAccount() {
  return (
    <div className="max-w-sm mx-auto text-center py-24 px-6">
      <div className="text-5xl opacity-30 mb-5">⏳</div>
      <h2 className="font-serif text-2xl mb-3">Account Pending</h2>
      <p className="text-muted text-sm">Challenges are available once your account is approved.</p>
    </div>
  );
}

// ─── Inside a single challenge ────────────────────────────────────
function ChallengeDetail({ challenge, onBack }) {
  const { challengeMemberships, students } = useApp();
  const [activeTab,       setActiveTab]       = useState('submissions');
  // enriched = challenge merged with periods fetched fresh from Supabase
  const [enriched, setEnriched] = useState(challenge);

  // Fetch the periods column (not in AppContext/mapChallenge) whenever the challenge changes
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('challenges')
      .select('periods')
      .eq('id', challenge.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setEnriched({ ...challenge, periods: data?.periods || [] });
        }
      });
    return () => { cancelled = true; };
  }, [challenge.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep non-periods fields in sync if context challenge updates (e.g. activities saved)
  useEffect(() => {
    setEnriched(prev => ({ ...challenge, periods: prev.periods || [] }));
  }, [challenge]); // eslint-disable-line react-hooks/exhaustive-deps

  // Challenge members as full student objects (with submissions)
  const memberIds = challengeMemberships
    .filter(m => m.challengeId === challenge.id)
    .map(m => m.studentId);
  const memberStudents = students.filter(s => memberIds.includes(s.id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted hover:text-primary text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        Back to Challenges
      </button>

      <h1 className="font-serif text-2xl text-primary mb-5">{enriched.name}</h1>

      <Tabs tabs={INNER_TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'submissions' && (
        <DashboardTab challenge={enriched} memberStudents={memberStudents} />
      )}
      {activeTab === 'leaderboard' && (
        <LeaderboardInner challenge={enriched} memberStudents={memberStudents} />
      )}
      {activeTab === 'history' && <HistoryTab challenge={enriched} />}
    </div>
  );
}

// ─── Challenge list (main view) ────────────────────────────────────
function ChallengeList({ student, challenges, challengeMemberships, onSelect, joinChallenge }) {
  const [code, setCode]       = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [joining, setJoining] = useState(false);

  const myMembershipIds = challengeMemberships
    .filter(m => m.studentId === student.id)
    .map(m => m.challengeId);

  const myChallenges = challenges.filter(c => myMembershipIds.includes(c.id));

  const openChallenges = challenges.filter(c =>
    c.isVisible &&
    c.visibleToGroups.includes(student.groupId) &&
    !myMembershipIds.includes(c.id)
  );

  async function handleJoinByCode() {
    if (!code.trim()) return;
    const match = challenges.find(
      c => c.code && c.code.trim().toLowerCase() === code.trim().toLowerCase()
    );
    if (!match) { setCodeErr('No challenge found with that code.'); return; }
    setJoining(true);
    const ok = await joinChallenge(match.id, student.id);
    setJoining(false);
    if (ok) { setCode(''); setCodeErr(''); }
    else { setCodeErr('Failed to join. Please try again.'); }
  }

  async function handleJoinOpen(challengeId) {
    setJoining(true);
    await joinChallenge(challengeId, student.id);
    setJoining(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* ── Join by code ── */}
      <div className="bg-bg-card border border-border rounded-card p-5">
        <h2 className="font-semibold text-primary mb-3">Join a Challenge</h2>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => { setCode(e.target.value); setCodeErr(''); }}
            onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
            placeholder="Enter challenge code…"
            className="flex-1 bg-bg-card2 border border-border rounded-xl px-3 py-2 text-sm text-primary outline-none focus:border-gold transition-colors"
          />
          <button
            onClick={handleJoinByCode}
            disabled={joining || !code.trim()}
            className="px-4 py-2 bg-gold text-bg font-semibold rounded-xl text-sm hover:bg-gold-l disabled:opacity-50 transition-colors"
          >
            Join
          </button>
        </div>
        {codeErr && <p className="text-danger text-xs mt-2">{codeErr}</p>}
      </div>

      {/* ── My Challenges ── */}
      <div>
        <h2 className="font-semibold text-primary mb-3">My Challenges</h2>
        {myChallenges.length === 0 ? (
          <p className="text-muted text-sm">You haven't joined any challenges yet.</p>
        ) : (
          <div className="space-y-2">
            {myChallenges.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left bg-bg-card border border-border rounded-card p-4 hover:border-gold transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary text-sm">{c.name}</p>
                    {c.description && (
                      <p className="text-muted text-xs mt-0.5 line-clamp-1">{c.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${c.isActive ? 'bg-green-500/15 text-green-400' : 'bg-border text-muted'}`}>
                    {c.isActive ? 'Active' : 'Ended'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Open Challenges ── */}
      {openChallenges.length > 0 && (
        <div>
          <h2 className="font-semibold text-primary mb-3">Open Challenges</h2>
          <div className="space-y-2">
            {openChallenges.map(c => (
              <div key={c.id} className="bg-bg-card border border-border rounded-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary text-sm">{c.name}</p>
                    {c.description && (
                      <p className="text-muted text-xs mt-0.5">{c.description}</p>
                    )}
                  </div>
                  {c.isPrivate ? (
                    <span className="text-muted text-xs shrink-0 mt-0.5">Enter code to join</span>
                  ) : (
                    <button
                      onClick={() => handleJoinOpen(c.id)}
                      disabled={joining}
                      className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-l disabled:opacity-50 transition-colors shrink-0"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function ChallengePage() {
  const { student } = useAuth();
  const { challenges, challengeMemberships, joinChallenge } = useApp();
  const [selected, setSelected] = useState(null);

  if (!student)                              return <NotLoggedIn />;
  if ((student.status || 'active') === 'pending') return <PendingAccount />;

  // Keep selected challenge in sync with context (e.g. activities updated by admin)
  const liveChallenge = selected
    ? (challenges.find(c => c.id === selected.id) || selected)
    : null;

  if (liveChallenge) {
    return (
      <ChallengeDetail
        key={liveChallenge.id}
        challenge={liveChallenge}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <ChallengeList
      student={student}
      challenges={challenges}
      challengeMemberships={challengeMemberships}
      onSelect={setSelected}
      joinChallenge={joinChallenge}
    />
  );
}
