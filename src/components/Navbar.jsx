import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp }  from '../context/AppContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Avatar } from './ui.jsx';

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

const NAV_LINKS = [
  { to: '/student',   label: 'Home' },
  { to: '/challenge', label: 'Challenge' },
  { to: '/tools',     label: 'Tools' },
];

export default function Navbar() {
  const { student, logoutStudent } = useAuth();
  const { community }              = useApp();
  const { theme, toggle }          = useTheme();
  const [menuOpen, setMenuOpen]    = useState(false);

  const linkCls = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'text-gold bg-[var(--gold-subtle)]'
        : 'text-muted hover:text-primary hover:bg-surface'
    }`;

  const mobileLinkCls = ({ isActive }) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'text-gold bg-[var(--gold-subtle)]'
        : 'text-muted hover:text-primary hover:bg-surface'
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-bg-card/90 backdrop-blur-md border-b border-border">
      {/* ── Main bar ───────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <NavLink to="/" className="flex-shrink-0" onClick={() => setMenuOpen(false)}>
          <AppLogo className="h-10 sm:h-12" />
        </NavLink>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map(l => (
            <NavLink key={l.to} to={l.to} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg border border-border text-muted hover:text-primary hover:border-muted flex items-center justify-center text-base transition-all"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Student avatar + logout — desktop only */}
          {student && (
            <div className="hidden sm:flex items-center gap-2">
              <Avatar src={student.avatar} name={student.fullName} size="sm" ring />
              <button
                onClick={logoutStudent}
                className="text-xs text-muted hover:text-danger transition-colors"
              >
                Logout
              </button>
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="sm:hidden w-8 h-8 rounded-lg border border-border text-muted hover:text-primary hover:border-muted flex items-center justify-center text-base transition-all"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ─────────────────────────────────────────── */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border bg-bg-card px-4 pt-2 pb-4 space-y-1">
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={mobileLinkCls}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}

          {/* Student info + logout in mobile menu */}
          {student && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Avatar src={student.avatar} name={student.fullName} size="sm" ring />
                <span className="text-sm text-primary truncate max-w-[140px]">{student.fullName}</span>
              </div>
              <button
                onClick={() => { logoutStudent(); setMenuOpen(false); }}
                className="text-xs text-muted hover:text-danger transition-colors flex-shrink-0"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
