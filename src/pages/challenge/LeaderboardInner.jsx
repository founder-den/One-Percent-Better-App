import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Tabs, Avatar, RankBadge, QuoteCard, SectionHeading,
  EmptyState, Badge,
} from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';
import {
  buildLeaderboard,
  getTodayQuotesForGroup,
} from '../../services/calculations.js';

// ─── Row ──────────────────────────────────────────────────────────
function LbRow({ entry, highlight }) {
  return (
    <div
      className={`flex items-center gap-3 py-3 px-4 rounded-lg border transition-colors
        ${highlight ? 'border-gold-d bg-[var(--gold-subtle)]' : 'border-border bg-bg-card2 hover:border-muted'}
      `}
    >
      <RankBadge rank={entry.rank} />
      <Avatar src={entry.avatar} name={entry.fullName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{entry.fullName}</p>
        <p className="text-xs text-muted">{entry.activeDays} days · {entry.streak}🔥</p>
      </div>
      <span className="font-bold text-gold text-lg flex-shrink-0">{entry.points}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// GROUP-MODE inner tabs
// ─────────────────────────────────────────────────────────────────
function GroupPeriodTab({ student, group, groupStudents, activities, periods }) {
  const period = periods.find(p => p.groupId === group.id && !!p.isActive);
  if (!period) {
    return <EmptyState icon="📅" title="No active period" text="Your admin hasn't started a period yet." />;
  }
  const lb = buildLeaderboard(groupStudents, activities, 'period', {
    periodStart: period.startDate,
    periodEnd:   period.endDate,
  });
  return (
    <div>
      <p className="text-xs text-muted mb-4">
        {period.name} · {formatDate(period.startDate)} – {formatDate(period.endDate)}
      </p>
      <div className="space-y-2">
        {lb.map(e => <LbRow key={e.id} entry={e} highlight={e.id === student.id} />)}
        {lb.length === 0 && <EmptyState icon="🏆" title="No submissions yet" text="Be the first to submit!" />}
      </div>
    </div>
  );
}

function GroupAllTimeTab({ student, groupStudents, activities, periods }) {
  const lb = buildLeaderboard(groupStudents, activities, 'alltime', { periods });
  return (
    <div>
      <p className="text-xs text-muted mb-4">
        {periods.some(p => p.countForAllTime)
          ? 'Based on admin-selected periods'
          : 'Total points across all submissions'}
      </p>
      <div className="space-y-2">
        {lb.map(e => <LbRow key={e.id} entry={e} highlight={e.id === student.id} />)}
        {lb.length === 0 && <EmptyState icon="🏆" title="No data yet" />}
      </div>
    </div>
  );
}

function GroupHallOfFameTab({ student, group, groupStudents, activities, periods }) {
  const allPeriods = periods.filter(p => p.groupId === group.id);
  const [sel, setSel] = useState(allPeriods[0]?.id || '');

  const selPeriod = allPeriods.find(p => p.id === sel);
  const lb = selPeriod
    ? buildLeaderboard(groupStudents, activities, 'period', {
        periodStart: selPeriod.startDate,
        periodEnd:   selPeriod.endDate,
      })
    : [];

  if (!allPeriods.length) {
    return <EmptyState icon="📜" title="No periods yet" text="Periods will appear here once created." />;
  }

  return (
    <div>
      <div className="mb-4">
        <select
          value={sel}
          onChange={e => setSel(e.target.value)}
          className="w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
        >
          {allPeriods.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {selPeriod && (
        <p className="text-xs text-muted mb-3">
          {formatDate(selPeriod.startDate)} – {formatDate(selPeriod.endDate)}
        </p>
      )}
      <div className="space-y-2">
        {lb.map(e => <LbRow key={e.id} entry={e} highlight={e.id === student.id} />)}
        {lb.length === 0 && <EmptyState icon="🏆" title="No submissions in this period" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHALLENGE-MODE inner tabs
// challenge.periods is fetched fresh from Supabase by ChallengePage
// ─────────────────────────────────────────────────────────────────
function ChallengePeriodTab({ student, challenge, memberStudents, activities }) {
  const periods = challenge.periods || [];
  const period  = periods.find(p => p.isActive);

  if (!period) {
    return (
      <EmptyState
        icon="📅"
        title="No active period"
        text={periods.length > 0
          ? 'No period is currently active in this challenge.'
          : 'This challenge has no periods set up yet.'}
      />
    );
  }

  const lb = buildLeaderboard(memberStudents, activities, 'period', {
    periodStart: period.startDate,
    periodEnd:   period.endDate,
  });

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        {period.name} · {formatDate(period.startDate)} – {formatDate(period.endDate)}
      </p>
      <div className="space-y-2">
        {lb.map(e => <LbRow key={e.id} entry={e} highlight={e.id === student.id} />)}
        {lb.length === 0 && <EmptyState icon="🏆" title="No submissions yet" text="Be the first to submit!" />}
      </div>
    </div>
  );
}

function ChallengeAllTimeTab({ student, challenge, memberStudents, activities }) {
  const periods = challenge.periods || [];
  const allTimePeriods = periods.filter(p => p.countForAllTime);

  if (allTimePeriods.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No periods selected for All-Time"
        text="Go to Admin → Challenge → Periods to mark periods."
      />
    );
  }

  const lb = buildLeaderboard(memberStudents, activities, 'alltime', { periods });

  return (
    <div>
      <p className="text-xs text-muted mb-4">Based on admin-selected periods</p>
      <div className="space-y-2">
        {lb.map(e => <LbRow key={e.id} entry={e} highlight={e.id === student.id} />)}
        {lb.length === 0 && <EmptyState icon="🏆" title="No data yet" />}
      </div>
    </div>
  );
}

function ChallengeHallOfFameTab({ student, challenge, memberStudents, activities }) {
  const allPeriods = challenge.periods || [];
  const [sel, setSel] = useState(allPeriods[0]?.id || '');

  const selPeriod = allPeriods.find(p => p.id === sel);
  const lb = selPeriod
    ? buildLeaderboard(memberStudents, activities, 'period', {
        periodStart: selPeriod.startDate,
        periodEnd:   selPeriod.endDate,
      })
    : [];

  if (!allPeriods.length) {
    return <EmptyState icon="📜" title="No periods yet" text="Periods will appear here once the admin creates them." />;
  }

  return (
    <div>
      <div className="mb-4">
        <select
          value={sel}
          onChange={e => setSel(e.target.value)}
          className="w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
        >
          {allPeriods.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {selPeriod && (
        <p className="text-xs text-muted mb-3">
          {formatDate(selPeriod.startDate)} – {formatDate(selPeriod.endDate)}
        </p>
      )}
      <div className="space-y-2">
        {lb.map(e => <LbRow key={e.id} entry={e} highlight={e.id === student.id} />)}
        {lb.length === 0 && <EmptyState icon="🏆" title="No submissions in this period" />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main export
// Props:
//   challenge      — optional; when provided, activates challenge mode
//   memberStudents — optional array of student objects (challenge members)
// ─────────────────────────────────────────────────────────────────
const GROUP_TABS = [
  { key: 'period',   label: 'Current Period' },
  { key: 'alltime',  label: 'All-Time' },
  { key: 'history',  label: 'Hall of Fame' },
];

const CHALLENGE_TABS = [
  { key: 'period',   label: 'Current Period' },
  { key: 'alltime',  label: 'All-Time' },
  { key: 'history',  label: 'Hall of Fame' },
];

export default function LeaderboardInner({ challenge, memberStudents }) {
  const { student } = useAuth();
  const {
    periods, studentsForGroup,
    activitiesForGroup, periodsForGroup, likeQuote, findGroupById,
  } = useApp();

  const [activeTab, setActiveTab] = useState('period');

  const isChallenge = !!challenge;

  // ── Data sources depending on mode ─────────────────────────────
  const group         = findGroupById(student.groupId);
  const groupStudents = isChallenge ? (memberStudents || []) : studentsForGroup(student.groupId);
  const activities    = isChallenge ? (challenge.activities || []) : activitiesForGroup(student.groupId);
  const groupPeriods  = isChallenge ? [] : periodsForGroup(student.groupId);

  // Quotes from the relevant student pool
  const todayQuotes = getTodayQuotesForGroup(groupStudents);

  const tabs = isChallenge ? CHALLENGE_TABS : GROUP_TABS;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h2 className="font-serif text-xl text-primary">Leaderboard</h2>
        {!isChallenge && group && <Badge variant="gold">{group.name}</Badge>}
        {isChallenge && (
          <Badge variant="gold">{memberStudents?.length ?? 0} members</Badge>
        )}
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ── Challenge mode ── */}
      {isChallenge && (
        <>
          {activeTab === 'period' && (
            <ChallengePeriodTab
              student={student}
              challenge={challenge}
              memberStudents={groupStudents}
              activities={activities}
            />
          )}
          {activeTab === 'alltime' && (
            <ChallengeAllTimeTab
              student={student}
              challenge={challenge}
              memberStudents={groupStudents}
              activities={activities}
            />
          )}
          {activeTab === 'history' && (
            <ChallengeHallOfFameTab
              student={student}
              challenge={challenge}
              memberStudents={groupStudents}
              activities={activities}
            />
          )}
        </>
      )}

      {/* ── Group mode ── */}
      {!isChallenge && (
        <>
          {activeTab === 'period' && (
            <GroupPeriodTab
              student={student}
              group={group}
              groupStudents={groupStudents}
              activities={activities}
              periods={groupPeriods}
            />
          )}
          {activeTab === 'alltime' && (
            <GroupAllTimeTab
              student={student}
              group={group}
              groupStudents={groupStudents}
              activities={activities}
              periods={groupPeriods}
            />
          )}
          {activeTab === 'history' && (
            <GroupHallOfFameTab
              student={student}
              group={group}
              groupStudents={groupStudents}
              activities={activities}
              periods={periods}
            />
          )}
        </>
      )}

      {todayQuotes.length > 0 && (
        <div className="mt-8">
          <SectionHeading>Today's Quotes</SectionHeading>
          <div className="space-y-2">
            {todayQuotes.map(q => (
              <QuoteCard
                key={q.studentId}
                quote={q.quote}
                author={q.name}
                avatar={q.avatar}
                likes={(q.quoteLikes || []).length}
                liked={(q.quoteLikes || []).includes(student.id)}
                canLike={q.studentId !== student.id}
                onLike={() => likeQuote(q.studentId, q.date, student.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
