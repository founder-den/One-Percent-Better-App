import { useApp }  from '../../context/AppContext.jsx';
import { Card, SectionHeading } from '../../components/ui.jsx';
import { todayString } from '../../services/data.js';

export default function OverviewTab() {
  const { students, groups, programs, globalTasbihs, periods } = useApp();
  const today = todayString();

  const activeStudents  = students.filter(s => (s.status || 'active') === 'active');
  const pendingStudents = students.filter(s => s.status === 'pending');
  const activeGroups    = groups.filter(g => g.isActive !== false);
  const activePrograms  = programs.filter(p => p.isActive !== false);
  const activeTasbihs   = globalTasbihs.filter(t => t.isActive);
  const submissionsToday = students.reduce((acc, s) => {
    return acc + ((s.submissions || []).some(sub => sub.date === today) ? 1 : 0);
  }, 0);

  const statCards = [
    { label: 'Active Students',    value: activeStudents.length,  icon: '👥' },
    { label: 'Pending Approvals',  value: pendingStudents.length, icon: '⏳', urgent: pendingStudents.length > 0 },
    { label: 'Groups',             value: activeGroups.length,    icon: '🏫' },
    { label: 'Submissions Today',  value: submissionsToday,       icon: '📝' },
    { label: 'Active Programs',    value: activePrograms.length,  icon: '📋' },
    { label: 'Global Tasbihs',     value: activeTasbihs.length,   icon: '📿' },
  ];

  return (
    <div className="space-y-5 mt-6">

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(s => (
          <Card
            key={s.label}
            className={`text-center !mb-0 ${s.urgent ? 'border-gold' : ''}`}
          >
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="font-serif text-3xl text-gold font-bold">{s.value}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Pending approvals detail */}
      {pendingStudents.length > 0 && (
        <Card>
          <SectionHeading>Pending Approvals</SectionHeading>
          <div className="space-y-1">
            {pendingStudents.map(s => {
              const group = groups.find(g => g.id === s.groupId);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm text-primary">{s.fullName}</p>
                    <p className="text-xs text-muted">
                      @{s.username} · {group?.name || 'Unknown group'}
                    </p>
                  </div>
                  <span className="text-xs text-muted bg-surface border border-border rounded px-2 py-0.5">
                    Pending
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-3">
            Go to the Students tab to approve or reject.
          </p>
        </Card>
      )}

      {/* Per-group breakdown */}
      {activeGroups.length > 0 && (
        <Card>
          <SectionHeading>Group Breakdown</SectionHeading>
          <div className="space-y-2">
            {activeGroups.map(g => {
              const groupStudents  = activeStudents.filter(s => s.groupId === g.id);
              const submittedToday = groupStudents.filter(s =>
                (s.submissions || []).some(sub => sub.date === today)
              ).length;
              const activePeriod = periods.find(p => p.groupId === g.id && p.isActive);
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">{g.name}</p>
                    {activePeriod && (
                      <p className="text-xs text-muted">{activePeriod.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-primary">
                      {submittedToday}/{groupStudents.length}
                    </p>
                    <p className="text-xs text-muted">submitted today</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
