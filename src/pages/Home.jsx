import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp }  from '../context/AppContext.jsx';
import { Logo }    from '../components/ui.jsx';

export default function Home() {
  const { student }    = useAuth();
  const { community }  = useApp();
  const navigate       = useNavigate();

  // Auto-redirect active logged-in students to dashboard
  useEffect(() => {
    if (student && (student.status || 'active') === 'active') {
      navigate('/student', { replace: true });
    }
  }, [student, navigate]);

  return (
    <div
      className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center text-center px-6 py-16"
      style={{
        background: [
          'radial-gradient(ellipse at 15% 50%, rgba(201,168,76,0.07) 0%, transparent 55%)',
          'radial-gradient(ellipse at 85% 20%, rgba(201,168,76,0.05) 0%, transparent 50%)',
          'radial-gradient(ellipse at 50% 80%, rgba(201,168,76,0.03) 0%, transparent 60%)',
        ].join(', '),
      }}
    >
      {/* Animated ornament */}
      <div className="text-4xl text-gold animate-breathe mb-8 select-none">✦</div>

      {/* Large logo */}
      <div className="mb-6 flex justify-center">
        <Logo size="lg" communityLogo={community?.logo} />
      </div>

      <h1 className="font-serif text-4xl md:text-6xl font-bold text-primary mb-4 leading-tight">
        1% <span className="text-gold">Better</span> Challenge
      </h1>

      <p className="text-muted text-lg max-w-sm mx-auto mb-10 leading-relaxed">
        Build better habits. <span className="text-primary font-medium">Together.</span>
      </p>

      {community?.name && (
        <p className="text-gold/70 text-sm font-medium mb-8">{community.name}</p>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => navigate('/student?register=1')}
          className="px-7 py-3.5 bg-gold text-bg font-semibold rounded-xl hover:bg-gold-l transition-all shadow-gold text-sm"
        >
          Join a Group
        </button>
        <button
          onClick={() => navigate('/student')}
          className="px-7 py-3.5 border border-gold-d text-gold rounded-xl hover:bg-[var(--gold-subtle)] transition-all text-sm"
        >
          Sign In
        </button>
      </div>

      <p className="text-xs text-muted mt-10 opacity-50">
        Already have an account? Click Sign In above.
      </p>
    </div>
  );
}
