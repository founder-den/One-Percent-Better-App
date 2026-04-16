import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Trophy, Wrench, BookOpen, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  { to: '/student',   label: 'Home',      Icon: Home     },
  { to: '/challenge', label: 'Challenge', Icon: Trophy   },
  { to: '/programs',  label: 'Programs',  Icon: BookOpen },
  { to: '/tools',     label: 'Tools',     Icon: Wrench   },
];

// ─── Collapse state (persisted) ───────────────────────────────────
function getInitialCollapsed() {
  try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
  catch { return false; }
}

// ─── Sidebar + mobile bottom bar ─────────────────────────────────
export default function Navbar() {
  const { student, logoutStudent } = useAuth();
  const { theme, toggle }          = useTheme();
  const [collapsed, setCollapsed]  = useState(getInitialCollapsed);

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{ width: collapsed ? '56px' : '220px' }}
      >
        {/* Logo + collapse toggle row */}
        <div className="sidebar-logo-row">
          {!collapsed && (
            <NavLink to="/" className="sidebar-logo-link">
              <AppLogo height={36} />
            </NavLink>
          )}
          <button
            onClick={toggleCollapsed}
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
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link--active' : ''}${collapsed ? ' sidebar-link--collapsed' : ''}`}
            >
              <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        {/* Bottom: user info + controls */}
        <div className="sidebar-bottom">
          {student && !collapsed && (
            <div className="sidebar-user">
              <Avatar src={student.avatar} name={student.fullName} size="sm" />
              <span className="sidebar-username">{student.username}</span>
            </div>
          )}
          {collapsed && student && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '4px' }}>
              <Avatar src={student.avatar} name={student.fullName} size="sm" />
            </div>
          )}
          <div className={`sidebar-actions${collapsed ? ' sidebar-actions--collapsed' : ''}`}>
            {student && !collapsed && (
              <button onClick={logoutStudent} className="sidebar-logout">
                Logout
              </button>
            )}
            <button
              onClick={toggle}
              className="sidebar-theme-btn"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
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
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="mobile-tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
