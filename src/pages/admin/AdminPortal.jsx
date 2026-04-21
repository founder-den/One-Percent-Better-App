import { useState } from 'react';
import { useAuth }  from '../../context/AuthContext.jsx';
import { useApp }   from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Input, PasswordInput, Button, Alert, Card, SectionHeading, Avatar,
} from '../../components/ui.jsx';
import { AppLogo } from '../../components/Navbar.jsx';
import {
  LayoutDashboard, Users, Trophy, Wrench, BookOpen, Megaphone, Settings,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, CheckSquare, Clock,
} from 'lucide-react';
import AdminStudentsSection  from './AdminStudentsSection.jsx';
import AdminChallengeSection from './AdminChallengeSection.jsx';
import AdminToolsTab         from './AdminToolsTab.jsx';
import ProgramsAdminTab      from './ProgramsAdminTab.jsx';
import AnnouncementsAdminTab from './AnnouncementsAdminTab.jsx';
import SettingsTab           from './SettingsTab.jsx';
import { todayString, formatDate } from '../../services/data.js';
import { submissionPoints } from '../../services/calculations.js';

// ─── Sidebar nav items ─────────────────────────────────────────────
const NAV = [
  { key: 'overview',      label: 'Overview',      Icon: LayoutDashboard },
  { key: 'students',      label: 'Students',       Icon: Users           },
  { key: 'challenge',     label: 'Challenge',      Icon: Trophy          },
  { key: 'tools',         label: 'Tools',          Icon: Wrench          },
  { key: 'programs',      label: 'Programs',       Icon: BookOpen        },
  { key: 'announcements', label: 'Announcements',  Icon: Megaphone       },
  { key: 'settings',      label: 'Settings',       Icon: Settings        },
];

function getInitialCollapsed() {
  try { return localStorage.getItem('admin_sidebar_collapsed') === 'true'; }
  catch { return false; }
}

// ─── Login form ────────────────────────────────────────────────────
function LoginForm() {
  const { loginAdmin }    = useAuth();
  const { adminPassword } = useApp();
  const [pw,  setPw]  = useState('');
  const [err, setErr] = useState('');

  function submit(e) {
    e.preventDefault();
    if (pw === adminPassword) { loginAdmin(); }
    else { setErr('Incorrect password.'); }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 mb-20">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-5">
          <AppLogo height={80} />
        </div>
        <h2 className="font-serif text-2xl mb-1 text-primary">Admin Portal</h2>
        <p className="text-muted text-sm">Enter your admin password to continue</p>
      </div>
      <div className="bg-bg-card border border-border rounded-card p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
        <Alert type="error">{err}</Alert>
        <form onSubmit={submit} className="space-y-1">
          <PasswordInput
            label="Admin Password"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(''); }}
            placeholder="Password"
            autoComplete="current-password"
          />
          <Button type="submit" full className="mt-2">Sign In</Button>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Sidebar ─────────────────────────────────────────────────
function AdminSidebar({ active, onNavigate, onLogout, collapsed, onToggleCollapse }) {
  const { theme, toggle } = useTheme();

  return (
    <aside className="admin-sidebar" style={{ width: collapsed ? 56 : 220 }}>
      {/* Logo + collapse toggle */}
      <div className="sidebar-logo-row">
        {!collapsed && (
          <span className="sidebar-logo-link" style={{ cursor: 'default' }}>
            <AppLogo height={36} />
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="sidebar-collapse-btn"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen  size={16} strokeWidth={1.75} />
            : <PanelLeftClose size={16} strokeWidth={1.75} />
          }
        </button>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            title={collapsed ? label : undefined}
            className={[
              'sidebar-link w-full text-left',
              active === key ? 'sidebar-link--active' : '',
              collapsed ? 'sidebar-link--collapsed' : '',
            ].join(' ')}
          >
            <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* Bottom: Admin badge + logout + theme toggle */}
      <div className="sidebar-bottom">
        {!collapsed && (
          <div className="sidebar-user">
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--gold)',
              background: 'var(--gold-subtle)',
              padding: '3px 10px',
              borderRadius: 99,
              border: '1px solid var(--gold-dim)',
            }}>
              ADMIN
            </span>
          </div>
        )}
        <div className={`sidebar-actions${collapsed ? ' sidebar-actions--collapsed' : ''}`}>
          {!collapsed && (
            <button onClick={onLogout} className="sidebar-logout">Logout</button>
          )}
          <button
            onClick={toggle}
            className="sidebar-theme-btn"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark'
              ? <Sun  size={14} strokeWidth={1.75} />
              : <Moon size={14} strokeWidth={1.75} />
            }
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Admin mobile bottom bar ───────────────────────────────────────
function AdminMobileBar({ active, onNavigate }) {
  return (
    <nav className="admin-mobile-bar">
      {NAV.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onNavigate(key)}
          className={`mobile-tab${active === key ? ' mobile-tab--active' : ''}`}
          style={{ flex: 1, minWidth: 48 }}
        >
          <Icon size={18} strokeWidth={1.75} />
          <span className="mobile-tab-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Overview page ─────────────────────────────────────────────────
function AdminOverviewPage() {
  const {
    groups, students, challenges, periods, activitiesForGroup,
  } = useApp();

  const today          = todayString();
  const activeStudents = students.filter(s => (s.status || 'active') === 'active');
  const pendingStudents = students.filter(s => s.status === 'pending');
  const activeGroups   = groups.filter(g => g.isActive !== false);

  const submissionsToday = activeStudents.filter(s =>
    (s.submissions || []).some(sub => sub.date === today)
  ).length;

  const activeChallenges = challenges.filter(c => {
    if (!c.startDate || !c.endDate) return false;
    return today >= c.startDate && today <= c.endDate;
  }).length;

  // ── Recent submissions (last 5 across all students) ──────────────
  const allSubs = [];
  for (const s of activeStudents) {
    for (const sub of (s.submissions || [])) {
      allSubs.push({ student: s, sub });
    }
  }
  allSubs.sort((a, b) => b.sub.date.localeCompare(a.sub.date));
  const recentSubs = allSubs.slice(0, 5);

  // ── Top students this week (last 7 days) ─────────────────────────
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const weekRanking = activeStudents.map(s => {
    const acts = activitiesForGroup(s.groupId);
    const pts  = (s.submissions || [])
      .filter(sub => sub.date >= cutoffStr)
      .reduce((sum, sub) => sum + submissionPoints(sub, acts), 0);
    return { student: s, pts };
  }).sort((a, b) => b.pts - a.pts).slice(0, 5);

  const statCards = [
    { label: 'Active Students',   value: activeStudents.length,  Icon: Users,        urgent: false },
    { label: 'Submissions Today', value: submissionsToday,        Icon: CheckSquare,  urgent: false },
    { label: 'Active Challenges', value: activeChallenges,        Icon: Trophy,       urgent: false },
    { label: 'Pending Approvals', value: pendingStudents.length,  Icon: Clock,        urgent: pendingStudents.length > 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, Icon, urgent }) => (
          <div
            key={label}
            className="stat-card-hover"
            style={{
              background:   'var(--bg-card)',
              border:       `1px solid ${urgent ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 12,
              padding:      '20px 18px 18px',
            }}
          >
            <Icon size={20} strokeWidth={1.5} style={{ color: urgent ? 'var(--gold)' : 'var(--text-muted)', marginBottom: 10 }} />
            <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Today's Activity ─────────────────────────────────────── */}
      {activeGroups.length > 0 && (
        <Card className="!mb-0">
          <SectionHeading>Today's Activity</SectionHeading>
          <div className="space-y-3 mt-1">
            {activeGroups.map(g => {
              const gStudents  = activeStudents.filter(s => s.groupId === g.id);
              const submitted  = gStudents.filter(s =>
                (s.submissions || []).some(sub => sub.date === today)
              ).length;
              const total = gStudents.length;
              const pct   = total > 0 ? Math.round((submitted / total) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-primary">{g.name}</span>
                    <span className="text-xs text-muted">{submitted}/{total} submitted</span>
                  </div>
                  <div className="overview-bar-track">
                    <div className="overview-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Bottom two-column grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Submissions */}
        <Card className="!mb-0">
          <SectionHeading>Recent Submissions</SectionHeading>
          {recentSubs.length === 0 ? (
            <p className="text-xs text-muted py-2">No submissions yet.</p>
          ) : (
            <div className="space-y-0 mt-1">
              {recentSubs.map(({ student: s, sub }, i) => {
                const pts = submissionPoints(sub, activitiesForGroup(s.groupId));
                return (
                  <div
                    key={`${s.id}-${sub.date}`}
                    className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                  >
                    <Avatar src={s.avatar} name={s.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{s.fullName}</p>
                      <p className="text-xs text-muted">{formatDate(sub.date)}</p>
                    </div>
                    <span className="text-sm font-bold text-gold flex-shrink-0">+{pts}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top Students This Week */}
        <Card className="!mb-0">
          <SectionHeading>Top Students This Week</SectionHeading>
          {weekRanking.length === 0 ? (
            <p className="text-xs text-muted py-2">No activity in the last 7 days.</p>
          ) : (
            <div className="space-y-0 mt-1">
              {weekRanking.map(({ student: s, pts }, i) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <span
                    className="text-xs font-bold w-5 text-center flex-shrink-0"
                    style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}
                  >
                    {i + 1}
                  </span>
                  <Avatar src={s.avatar} name={s.fullName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{s.fullName}</p>
                    <p className="text-xs text-muted">@{s.username}</p>
                  </div>
                  <span className="text-sm font-bold text-gold flex-shrink-0">{pts} pts</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Admin layout (post-login) ─────────────────────────────────────
function AdminLayout() {
  const { logoutAdmin }                       = useAuth();
  const { groups }                            = useApp();
  const [section,     setSection]             = useState('overview');
  const [activeGroup, setActiveGroup]         = useState(groups[0]?.id || '');
  const [collapsed,   setCollapsed]           = useState(getInitialCollapsed);

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem('admin_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }

  const group     = groups.find(g => g.id === activeGroup) || groups[0] || null;
  const needsGroup = ['students', 'challenge'].includes(section);

  return (
    <div className="admin-layout">
      <div className="admin-layout-body">
        {/* Sidebar */}
        <AdminSidebar
          active={section}
          onNavigate={setSection}
          onLogout={logoutAdmin}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />

        {/* Content */}
        <main className="admin-content">
          {/* Content header (skip for overview — it has its own) */}
          {section !== 'overview' && (
            <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-wrap gap-3">
              <h1 className="font-serif text-xl text-primary">
                {NAV.find(n => n.key === section)?.label}
              </h1>
              <div className="flex items-center gap-3">
                {needsGroup && groups.length > 0 && (
                  <select
                    value={activeGroup}
                    onChange={e => setActiveGroup(e.target.value)}
                    className="bg-bg-card2 border border-border text-primary rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Section content */}
          <div className={section === 'overview' ? '' : 'px-6 pb-8'}>
            {section === 'overview' && <AdminOverviewPage />}

            {section === 'students' && (
              <AdminStudentsSection
                groupId={group?.id}
                onGroupCreated={id => { setActiveGroup(id); }}
              />
            )}

            {section === 'challenge' && (
              <AdminChallengeSection groupId={group?.id} />
            )}

            {section === 'tools' && <AdminToolsTab />}

            {section === 'programs' && <ProgramsAdminTab />}

            {section === 'announcements' && <AnnouncementsAdminTab />}

            {section === 'settings' && <SettingsTab />}
          </div>
        </main>
      </div>

      {/* Mobile nav */}
      <AdminMobileBar active={section} onNavigate={setSection} />
    </div>
  );
}

// ─── Entry point ───────────────────────────────────────────────────
export default function AdminPortal() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <LoginForm />;
  return <AdminLayout />;
}
