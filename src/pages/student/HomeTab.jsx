import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Card, SectionHeading, EmptyState } from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';

// ─── Days remaining from today to endDate (inclusive) ────────────
function daysRemaining(endDateStr) {
  if (!endDateStr) return null;
  const [y, m, d] = endDateStr.split('-').map(Number);
  const end  = new Date(y, m - 1, d, 23, 59, 59);
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

// ─── Single announcement row with inline join/code input ─────────
function AnnouncementRow({ challenge, studentId, joinChallenge }) {
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
      setCodeErr('Incorrect code.');
      return;
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
          {challenge.description && (
            <p className="text-xs text-muted mt-0.5 line-clamp-2">{challenge.description}</p>
          )}
          {(challenge.startDate || challenge.endDate) && (
            <p className="text-xs text-muted mt-1">
              {challenge.startDate && challenge.endDate
                ? `${formatDate(challenge.startDate)} – ${formatDate(challenge.endDate)}`
                : challenge.startDate
                  ? `Starts ${formatDate(challenge.startDate)}`
                  : `Ends ${formatDate(challenge.endDate)}`}
            </p>
          )}
        </div>
        {!challenge.isPrivate && (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-l disabled:opacity-50 transition-colors shrink-0"
          >
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
            <button
              onClick={handleJoinByCode}
              disabled={joining || !code.trim()}
              className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-l disabled:opacity-50 transition-colors"
            >
              {joining ? '…' : 'Join'}
            </button>
          </div>
          {codeErr && <p className="text-danger text-xs">{codeErr}</p>}
        </div>
      )}
    </div>
  );
}

export default function HomeTab() {
  const { student } = useAuth();
  const { theme }   = useTheme();
  const {
    community, findGroupById,
    challenges, challengeMemberships, joinChallenge,
  } = useApp();

  const group = findGroupById(student.groupId);

  const bannerSrc = theme === 'dark'
    ? (community?.bannerDark  || community?.banner || null)
    : (community?.bannerLight || community?.banner || null);

  // My joined challenge IDs
  const myIds = challengeMemberships
    .filter(m => m.studentId === student.id)
    .map(m => m.challengeId);

  const myChallenges = challenges.filter(c => myIds.includes(c.id));

  // Announcements: visible, group-relevant, not yet joined
  const announcements = challenges.filter(c =>
    c.isVisible &&
    (c.visibleToGroups.length === 0 || c.visibleToGroups.includes(student.groupId)) &&
    !myIds.includes(c.id)
  );

  return (
    <div className="mt-6 space-y-5">
      {/* Community banner */}
      {bannerSrc && (
        <div className="w-full rounded-card overflow-hidden border border-border" style={{ maxHeight: '220px' }}>
          <img
            src={bannerSrc}
            alt="Community banner"
            className="w-full object-cover"
            style={{ maxHeight: '220px' }}
          />
        </div>
      )}

      {/* Community + group info */}
      <Card>
        <SectionHeading>Community</SectionHeading>
        <div className="space-y-1.5">
          {community?.name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted w-20 flex-shrink-0">Community</span>
              <span className="text-sm text-primary font-medium">{community.name}</span>
            </div>
          )}
          {group && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted w-20 flex-shrink-0">Your Group</span>
              <span className="text-sm text-primary font-medium">{group.name}</span>
            </div>
          )}
        </div>
      </Card>

      {/* My Challenges */}
      <Card>
        <SectionHeading>My Challenges</SectionHeading>
        {myChallenges.length === 0 ? (
          <div className="space-y-3">
            <EmptyState icon="🏆" title="No challenges yet" text="You haven't joined any challenges yet." />
            <Link
              to="/challenge"
              className="block text-center text-sm font-semibold text-gold hover:text-gold-l transition-colors"
            >
              Browse Challenges →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {myChallenges.map(c => {
              const daysLeft = c.isActive ? daysRemaining(c.endDate) : null;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bg-card2 border border-border gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{c.name}</p>
                    {daysLeft !== null && (
                      <p className="text-xs text-muted mt-0.5">
                        {daysLeft === 0
                          ? 'Last day!'
                          : daysLeft === 1
                            ? '1 day remaining'
                            : `${daysLeft} days remaining`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      c.isActive ? 'bg-green-500/15 text-green-400' : 'bg-border text-muted'
                    }`}>
                      {c.isActive ? 'Active' : 'Ended'}
                    </span>
                    <Link
                      to="/challenge"
                      className="text-xs font-semibold text-gold hover:text-gold-l transition-colors whitespace-nowrap"
                    >
                      Go to Challenge →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card>
          <SectionHeading>Announcements</SectionHeading>
          <div className="space-y-2">
            {announcements.map(c => (
              <AnnouncementRow
                key={c.id}
                challenge={c}
                studentId={student.id}
                joinChallenge={joinChallenge}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
