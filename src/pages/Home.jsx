import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext.jsx';
import { useApp }   from '../context/AppContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const FEATURES = [
  { icon: '📋', title: 'Daily Activities',  desc: 'Track your daily Islamic and personal habits every day.' },
  { icon: '🏆', title: 'Leaderboard',       desc: 'Compete with your group and stay motivated to keep going.' },
  { icon: '📿', title: 'Global Tasbih',     desc: 'Count together with your entire community as one.' },
  { icon: '📚', title: 'Reading Tracker',   desc: 'Track the books you are reading and share your progress.' },
  { icon: '🌙', title: 'Programs',          desc: 'Join special night programs and community events.' },
  { icon: '🔥', title: 'Streaks',           desc: 'Build consistency with daily streaks and stay on track.' },
];

export default function Home() {
  const { student }   = useAuth();
  const { community } = useApp();
  const { theme }     = useTheme();
  const navigate      = useNavigate();

  // Auto-redirect active logged-in students to dashboard
  useEffect(() => {
    if (student && (student.status || 'active') === 'active') {
      navigate('/student', { replace: true });
    }
  }, [student, navigate]);

  // Pick banner: prefer theme-specific, fall back to generic banner
  const bannerSrc = theme === 'dark'
    ? (community?.bannerDark  || community?.banner || null)
    : (community?.bannerLight || community?.banner || null);

  // Logo src
  const logoSrc = theme === 'dark' ? '/logo-dark.png' : '/logo-light.png';

  // Gradient fallback for banner
  const bannerGradient = theme === 'dark'
    ? 'linear-gradient(135deg, #0d1f0d 0%, #0f2a1a 40%, #0c1c10 100%)'
    : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 40%, #dcedc8 100%)';

  return (
    <div className="min-h-[calc(100vh-56px)]">

      {/* ── Banner ──────────────────────────────────────────── */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{
          height: 'clamp(150px, 18.3vw, 220px)',
          background: bannerSrc ? undefined : bannerGradient,
        }}
      >
        {bannerSrc && (
          <img
            src={bannerSrc}
            alt="Community banner"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        )}
        {/* Overlay to ensure logo visibility */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Centered logo */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <img
            src={logoSrc}
            alt="1% Better"
            style={{ height: '80px', width: 'auto', display: 'block' }}
            className="drop-shadow-lg"
          />
        </div>
      </div>

      {/* ── About section ───────────────────────────────────── */}
      <div className="bg-bg px-6 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-3 leading-tight">
            1% Better Challenge
          </h1>
          <p className="text-lg font-medium text-gold mb-5">
            Build better habits. Together.
          </p>
          <p className="text-muted text-base leading-relaxed max-w-lg mx-auto">
            Join your community in a daily challenge to become 1% better every day.
            Track your habits, compete with friends, and grow together.
          </p>
        </div>
      </div>

      {/* ── Features grid ───────────────────────────────────── */}
      <div className="bg-bg-card border-t border-border px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl text-primary text-center mb-8">
            Everything you need
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="bg-bg border border-border rounded-xl p-5 flex flex-col gap-2 hover:border-gold/40 transition-colors"
              >
                <span className="text-3xl">{f.icon}</span>
                <p className="font-semibold text-primary text-sm">{f.title}</p>
                <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA section ─────────────────────────────────────── */}
      <div className="bg-bg border-t border-border px-6 py-16 text-center">
        <div className="max-w-sm mx-auto">
          <h2 className="font-serif text-2xl text-primary mb-2">Ready to start?</h2>
          <p className="text-muted text-sm mb-8">Join your group and begin your journey today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/student?register=1')}
              className="px-8 py-3.5 bg-gold text-bg font-semibold rounded-xl hover:bg-gold-l transition-all shadow-gold text-sm"
            >
              Join a Group
            </button>
            <button
              onClick={() => navigate('/student')}
              className="px-8 py-3.5 border border-gold-d text-gold rounded-xl hover:bg-[var(--gold-subtle)] transition-all text-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
