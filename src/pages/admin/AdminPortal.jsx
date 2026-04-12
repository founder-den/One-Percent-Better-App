import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { Input, PasswordInput, Button, Alert, Tabs } from '../../components/ui.jsx';
import { AppLogo } from '../../components/Navbar.jsx';
import AdminStudentsSection  from './AdminStudentsSection.jsx';
import AdminChallengeSection from './AdminChallengeSection.jsx';
import AdminToolsTab         from './AdminToolsTab.jsx';
import ProgramsAdminTab      from './ProgramsAdminTab.jsx';
import SettingsTab           from './SettingsTab.jsx';

const TABS = [
  { key: 'students',  label: 'Students' },
  { key: 'challenge', label: 'Challenge' },
  { key: 'tools',     label: 'Tools' },
  { key: 'programs',  label: 'Programs' },
  { key: 'settings',  label: 'Settings' },
];

function LoginForm() {
  const { loginAdmin }          = useAuth();
  const { adminPassword }       = useApp();
  const [pw, setPw]             = useState('');
  const [err, setErr]           = useState('');

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

export default function AdminPortal() {
  const { isAdmin, logoutAdmin } = useAuth();
  const { groups }               = useApp();

  const [activeTab,   setActiveTab]   = useState('students');
  const [activeGroup, setActiveGroup] = useState(groups[0]?.id || '');

  if (!isAdmin) return <LoginForm />;

  const group = groups.find(g => g.id === activeGroup) || groups[0] || null;

  // Tabs that show the group selector
  const needsGroup = ['students', 'challenge'].includes(activeTab);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-serif text-2xl text-primary">Admin Panel</h1>
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
          <button
            onClick={logoutAdmin}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'students'  && <AdminStudentsSection  groupId={group?.id} onGroupCreated={id => { setActiveGroup(id); }} />}
      {activeTab === 'challenge' && <AdminChallengeSection groupId={group?.id} />}
      {activeTab === 'tools'     && <AdminToolsTab />}
      {activeTab === 'programs'  && <ProgramsAdminTab />}
      {activeTab === 'settings'  && <SettingsTab />}
    </div>
  );
}
