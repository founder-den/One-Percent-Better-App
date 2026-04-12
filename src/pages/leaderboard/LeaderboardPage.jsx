import { useState } from 'react';
import { Link } from 'react-router-dom';
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

const TABS = [
  { key: 'period',   label: 'Current Period' },
  { key: 'alltime',  label: 'All-Time' },
  { key: 'history',  label: 'Hall of Fame' },
];

// ─── Single leaderboard row ───────────────────────────────────────
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

// ─── Tab: Current Period ───────────────────────────────────────────
function PeriodTab({ student, group, groupStudents, activities, periods }) {
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

// ─── Tab: All-Time ────────────────────────────────────────────────
function AllTimeTab({ student, group, groupStudents, activities, periods }) {
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

// ─── Tab: History ─────────────────────────────────────────────────
function HistoryTab({ student, group, groupStudents, activities, periods }) {
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

// ─── Main ─────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { student } = useAuth();
  const {
    groups, activities, periods, studentsForGroup,
    activitiesForGroup, periodsForGroup, likeQuote, findGroupById,
  } = useApp();

  const [activeTab, setActiveTab] = useState('period');

  // Not logged in
  if (!student) {
    return (
      <div className="max-w-sm mx-auto text-center py-24 px-6">
        <div className="text-5xl opacity-30 mb-5">🔒</div>
        <h2 className="font-serif text-2xl mb-3">Login Required</h2>
        <p className="text-muted text-sm mb-6">Sign in to view the leaderboard.</p>
        <Link
          to="/student"
          className="px-6 py-2.5 bg-gold text-bg font-semibold rounded-xl hover:bg-gold-l text-sm inline-block"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if ((student.status || 'active') === 'pending') {
    return (
      <div className="max-w-sm mx-auto text-center py-24 px-6">
        <div className="text-5xl opacity-30 mb-5">⏳</div>
        <h2 className="font-serif text-2xl mb-3">Account Pending</h2>
        <p className="text-muted text-sm">The leaderboard is available once your account is approved.</p>
      </div>
    );
  }

  const group         = findGroupById(student.groupId);
  const groupStudents = studentsForGroup(student.groupId);
  const groupActs     = activitiesForGroup(student.groupId);
  const groupPeriods  = periodsForGroup(student.groupId);

  // Today's quotes for the group
  const todayQuotes = getTodayQuotesForGroup(groupStudents);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="font-serif text-2xl text-primary">Leaderboard</h1>
        {group && <Badge variant="gold">{group.name}</Badge>}
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'period' && (
        <PeriodTab
          student={student}
          group={group}
          groupStudents={groupStudents}
          activities={groupActs}
          periods={groupPeriods}
        />
      )}
      {activeTab === 'alltime' && (
        <AllTimeTab
          student={student}
          group={group}
          groupStudents={groupStudents}
          activities={groupActs}
          periods={groupPeriods}
        />
      )}
      {activeTab === 'history' && (
        <HistoryTab
          student={student}
          group={group}
          groupStudents={groupStudents}
          activities={groupActs}
          periods={groupPeriods}
        />
      )}

      {/* Today's quotes */}
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
