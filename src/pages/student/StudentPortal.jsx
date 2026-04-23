import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { Alert, Button, Input, PasswordInput, Tabs } from '../../components/ui.jsx';
import { AppLogo } from '../../components/Navbar.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { dbRegisterStudent, dbValidateGroupCode } from '../../services/db.js';
import HomeTab    from './HomeTab.jsx';
import ProfileTab from './ProfileTab.jsx';

// ─── Theme-aware banner header ────────────────────────────────────
function AuthBanner({ title, subtitle }) {
  const { theme } = useTheme();
  return (
    <div
      className={`w-full rounded-card mb-8 px-6 py-10 flex flex-col items-center gap-5 border transition-colors
        ${theme === 'dark'
          ? 'bg-[#0c0c12] border-[#252538]'
          : 'bg-white border-[#e2e1dc]'
        }`}
    >
      <AppLogo height={80} />
      <div className="text-center">
        <h2 className="font-serif text-2xl mb-1 text-primary">{title}</h2>
        <p className="text-muted text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Auth forms ───────────────────────────────────────────────────
function LoginForm({ onShowRegister }) {
  const { loginStudent, loginAdmin } = useAuth();
  const { students, adminUsername, adminPassword } = useApp();
  const navigate = useNavigate();
  const [username, setU]   = useState('');
  const [password, setP]   = useState('');
  const [error, setError]  = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);

    // Silent admin check — no visible difference to the user
    if (username.trim() === adminUsername && password === adminPassword) {
      loginAdmin();
      navigate('/admin', { replace: true });
      return;
    }

    try {
      await loginStudent(username.trim(), password);
    } catch (err) {
      setError('Incorrect username or password.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-8 mb-20 px-4">
      <AuthBanner title="Welcome Back" subtitle="Sign in to track your daily progress" />
      <div className="bg-bg-card border border-border rounded-card p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
        <Alert type="error">{error}</Alert>
        <form onSubmit={submit} className="space-y-1">
          <Input
            label="Username"
            value={username}
            onChange={e => { setU(e.target.value); setError(''); }}
            placeholder="Your username"
            autoComplete="username"
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={e => { setP(e.target.value); setError(''); }}
            placeholder="Your password"
            autoComplete="current-password"
          />
          <Button type="submit" full className="mt-2" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted mt-4">
          Don't have an account?{' '}
          <button onClick={onShowRegister} className="text-gold font-medium hover:text-gold-l">Register here</button>
        </p>
      </div>
    </div>
  );
}

function RegisterForm({ onShowLogin }) {
  const { loginStudent }              = useAuth();
  const { students, findGroupByCode, registerStudent, registrationMode } = useApp();
  const [form, setForm]               = useState({ fullName: '', username: '', password: '', code: '' });
  const [errors, setErrors]           = useState({});
  const [usernameHint, setUsernameHint] = useState('');
  const [codeHint, setCodeHint]       = useState('');
  const [loading, setLoading]         = useState(false);

  function set(k) { return e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: '' })); }; }

  function checkUsername(val) {
    if (!val || val.length < 3) { setUsernameHint(''); return; }
    const taken = students.some(s => s.username.toLowerCase() === val.toLowerCase());
    setUsernameHint(taken ? '✗ Already taken' : '✓ Available');
  }

  function checkCode(val) {
    if (!val) { setCodeHint(''); return; }
    const g = findGroupByCode(val);
    if (!g)         setCodeHint('✗ Invalid group code');
    else if (!g.isActive) setCodeHint('✗ Group not accepting registrations');
    else            setCodeHint(`✓ ${g.name}`);
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!form.username.trim() || form.username.length < 3) errs.username = 'Min 3 characters';
    if (form.password.length < 4) errs.password = 'Min 4 characters';
    if (!form.code.trim()) errs.code = 'Required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const taken = students.some(s => s.username.toLowerCase() === form.username.toLowerCase());
    if (taken) { setErrors({ username: 'Username already taken' }); return; }

    setLoading(true);

    const grp = await dbValidateGroupCode(form.code.trim());
    if (!grp)          { setErrors({ code: 'Invalid group code' }); setLoading(false); return; }
    if (!grp.isActive) { setErrors({ code: 'Group not accepting registrations' }); setLoading(false); return; }

    const status = registrationMode === 'approval' ? 'pending' : 'active';
    const newStudent = await dbRegisterStudent({ ...form, groupId: grp.id, status });

    if (newStudent) {
      window.location.reload(); // Quick refresh so AuthContext grabs the new session + students array
    } else {
      setErrors({ code: 'Registration failed. Username might be taken.' });
      setLoading(false);
    }
  }

  const codeHintColor = codeHint.startsWith('✓') ? 'text-ok' : 'text-danger';
  const uHintColor    = usernameHint.startsWith('✓') ? 'text-ok' : 'text-danger';

  return (
    <div className="max-w-sm mx-auto mt-8 mb-20 px-4">
      <AuthBanner title="Create Account" subtitle="Join your group and start your journey" />
      <div className="bg-bg-card border border-border rounded-card p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
        <form onSubmit={submit} className="space-y-1">
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
            placeholder="Your full name"
            autoComplete="name"
          />
          <div>
            <Input
              label="Username"
              value={form.username}
              onChange={e => { set('username')(e); checkUsername(e.target.value); }}
              error={errors.username}
              placeholder="Min 3 characters"
              autoComplete="username"
            />
            {usernameHint && !errors.username && (
              <p className={`-mt-3 mb-3 text-xs ${uHintColor}`}>{usernameHint}</p>
            )}
          </div>
          <PasswordInput
            label="Password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            placeholder="Min 4 characters"
            autoComplete="new-password"
          />
          <div>
            <Input
              label="Group Code"
              value={form.code}
              onChange={e => { set('code')(e); checkCode(e.target.value); }}
              error={errors.code}
              placeholder="Enter your group code"
              autoComplete="off"
            />
            {codeHint && !errors.code && (
              <p className={`-mt-3 mb-3 text-xs ${codeHintColor}`}>{codeHint}</p>
            )}
          </div>
          <Button type="submit" full className="mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted mt-4">
          Already have an account?{' '}
          <button onClick={onShowLogin} className="text-gold font-medium hover:text-gold-l">Sign in</button>
        </p>
      </div>
    </div>
  );
}

// ─── Pending screen ───────────────────────────────────────────────
function PendingScreen({ onLogout }) {
  return (
    <div className="max-w-sm mx-auto text-center py-24 px-6">
      <div className="text-5xl mb-5 opacity-50">⏳</div>
      <h2 className="font-serif text-2xl mb-3 text-primary">Account Pending Approval</h2>
      <p className="text-muted text-sm leading-relaxed mb-6">
        Your account is awaiting admin approval. You'll be able to access the app once approved.
      </p>
      <Button variant="ghost" onClick={onLogout}>Back to Login</Button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
const TABS = [
  { key: 'home',    label: 'Dashboard' },
  { key: 'profile', label: 'Profile' },
];

export default function StudentPortal() {
  const { student, logoutStudent } = useAuth();
  const [searchParams]             = useSearchParams();
  const [authMode, setAuthMode]    = useState(
    () => searchParams.get('register') === '1' ? 'register' : 'login'
  );
  const [activeTab, setActiveTab]  = useState(
    () => searchParams.get('tab') === 'profile' ? 'profile' : 'home'
  );

  if (!student) {
    return authMode === 'login'
      ? <LoginForm    onShowRegister={() => setAuthMode('register')} />
      : <RegisterForm onShowLogin={() => setAuthMode('login')} />;
  }

  if ((student.status || 'active') === 'pending') {
    return <PendingScreen onLogout={logoutStudent} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === 'home'    && <HomeTab onEditProfile={() => setActiveTab('profile')} />}
      {activeTab === 'profile' && <ProfileTab />}
    </div>
  );
}
