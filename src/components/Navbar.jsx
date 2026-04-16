import { NavLink } from 'react-router-dom';
import { Home, Trophy, Wrench, User, Sun, Moon } from 'lucide-react';
import { useAuth }  from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Avatar }   from './ui.jsx';

// ─── Logo (exported — used in StudentPortal auth forms) ───────────
function AppLogo({ height, className = '' }) {
  const { theme } = useTheme();
  const src = theme === 'dark' ? '/logo-dark.png' : '/logo-light.png';
  return (
    <img
      src={src}
      alt="1% Better"
      className={className}
      style={height ? { height: `${height}px`, width: 'auto', display: 'block' } : { width: 'auto', display: 'block' }}
    />
  );
}
export { AppLogo };

// ─── Nav links ────────────────────────────────────────────────────
const NAV_LINKS = [
  { to: '/student',   label: 'Home',      Icon: Home   },
  { to: '/challenge', label: 'Challenge', Icon: Trophy },
  { to: '/tools',     label: 'Tools',     Icon: Wrench },
];

// ─── Sidebar + mobile bottom bar ─────────────────────────────────
export default function Navbar() {
  const { student, logoutStudent } = useAuth();
  const { theme, toggle }          = useTheme();

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <NavLink to="/">
            <AppLogo height={36} />
          </NavLink>
        </div>

        <div className="sidebar-divider" />

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Push bottom section down */}
        <div className="sidebar-spacer" />

        {/* Bottom: user info + controls */}
        <div className="sidebar-bottom">
          {student && (
            <div className="sidebar-user">
              <Avatar src={student.avatar} name={student.fullName} size="sm" />
              <span className="sidebar-username">{student.username}</span>
            </div>
          )}
          <div className="sidebar-actions">
            {student && (
              <button onClick={logoutStudent} className="sidebar-logout">
                Logout
              </button>
            )}
            <button onClick={toggle} className="sidebar-theme-btn" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom bar ─────────────────────────────────── */}
      <nav className="mobile-bottom-bar">
        {NAV_LINKS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-tab${isActive ? ' mobile-tab--active' : ''}`}
            title={label}
          >
            <Icon size={20} strokeWidth={1.75} />
          </NavLink>
        ))}
        {/* Profile tab — always links to student portal */}
        <NavLink
          to="/student"
          className="mobile-tab"
          title="Profile"
          onClick={e => {
            // Prevent the Home tab's active state from doubling —
            // this tab is purely a navigational shortcut, no active highlight.
            e.currentTarget.blur();
          }}
          style={{ color: 'var(--text-muted)' }}
        >
          <User size={20} strokeWidth={1.75} />
        </NavLink>
      </nav>
    </>
  );
}
