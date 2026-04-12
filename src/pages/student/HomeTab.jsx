import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Card, SectionHeading, EmptyState } from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';

// ─── Days remaining from today to endDate (inclusive) ────────────
function daysRemaining(endDateStr) {
  if (!endDateStr) return null;
  const [y, m, d] = endDateStr.split('-').map(Number);
  const end   = new Date(y, m - 1, d, 23, 59, 59);
  const diff  = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

export default function HomeTab() {
  const { student }  = useAuth();
  const { theme }    = useTheme();
  const {
    community, findGroupById, activitiesForGroup, activePeriod,
  } = useApp();

  const group      = findGroupById(student.groupId);
  const period     = activePeriod(student.groupId);
  const activities = activitiesForGroup(student.groupId).filter(a => a.isActive ?? a.active ?? true);
  const daysLeft   = period ? daysRemaining(period.endDate) : null;

  // Pick theme-aware banner: prefer bannerDark/bannerLight, fall back to legacy banner
  const bannerSrc = theme === 'dark'
    ? (community?.bannerDark  || community?.banner || null)
    : (community?.bannerLight || community?.banner || null);

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

      {/* Challenge / period info */}
      <Card>
        <SectionHeading>Current Challenge</SectionHeading>
        {period ? (
          <div className="space-y-3">
            <div>
              <p className="font-serif text-lg font-semibold text-primary">{period.name}</p>
              <p className="text-xs text-muted mt-0.5">
                {formatDate(period.startDate)} – {formatDate(period.endDate)}
              </p>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-[var(--gold-subtle)] border border-gold-d">
              <span className="text-2xl">⏱</span>
              <div>
                {daysLeft === 0 ? (
                  <p className="text-sm font-semibold text-gold">Last day — finish strong!</p>
                ) : daysLeft === 1 ? (
                  <p className="text-sm font-semibold text-gold">1 day remaining</p>
                ) : (
                  <p className="text-sm font-semibold text-gold">{daysLeft} days remaining</p>
                )}
                <p className="text-xs text-muted">Ends {formatDate(period.endDate)}</p>
              </div>
            </div>

            {period.prizeText && (
              <div className="flex items-center gap-2 text-sm">
                <span>🏅</span>
                <span className="text-primary">{period.prizeText}</span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon="📅" title="No active period" text="Your admin hasn't started a challenge period yet." />
        )}
      </Card>

      {/* Activities */}
      <Card>
        <SectionHeading>Activities This Period</SectionHeading>
        {activities.length === 0 ? (
          <EmptyState icon="📋" title="No activities yet" text="Your admin will add activities for this group." />
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-bg-card2 border border-border"
              >
                <span className="text-sm text-primary">{a.name}</span>
                <span className="text-xs font-semibold text-gold flex-shrink-0 ml-2">+{a.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
