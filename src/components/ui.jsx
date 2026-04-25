// ─────────────────────────────────────────────────────────────────
//  ui.jsx — all reusable UI primitives
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';

// ─── Logo ────────────────────────────────────────────────────────
export function Logo({ size = 'md', communityLogo }) {
  const sizes = { sm: 'w-7 h-7 text-sm', md: 'w-9 h-9 text-base', lg: 'w-16 h-16 text-2xl' };
  const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };
  return (
    <div className="flex items-center gap-2">
      <div className={`${sizes[size]} rounded-full border-2 border-gold bg-bg-card flex items-center justify-center flex-shrink-0 overflow-hidden`}>
        {communityLogo
          ? <img src={communityLogo} alt="logo" className="w-full h-full object-cover" />
          : <span className="font-serif font-bold text-gold leading-none">1%</span>
        }
      </div>
      <span className={`font-serif font-semibold text-gold ${textSizes[size]} leading-tight`}>
        One % Better
      </span>
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────
export function Avatar({ src, name, size = 'md', ring = false }) {
  const s = { xs: 'w-7 h-7 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' };
  const initials = name ? name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() : '?';
  return (
    <div className={`${s[size]} rounded-full flex-shrink-0 overflow-hidden ${ring ? 'avatar-ring' : ''} bg-surface flex items-center justify-center font-semibold text-muted`}>
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : <span>{initials}</span>
      }
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────
const btnBase = 'inline-flex items-center justify-center gap-1.5 font-sans font-medium rounded-lg transition-all duration-150 cursor-pointer border-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';

const btnVariants = {
  primary:  'bg-gold text-bg font-semibold hover:bg-gold-l active:scale-95 shadow-gold',
  outline:  'border border-gold-d text-gold bg-transparent hover:bg-[var(--gold-subtle)] hover:border-gold',
  ghost:    'border border-border text-muted bg-transparent hover:border-muted hover:text-primary',
  danger:   'border border-red-500/40 text-danger bg-red-500/10 hover:bg-red-500/20 hover:border-danger',
  success:  'border border-green-500/40 text-ok bg-green-500/10 hover:bg-green-500/20',
};

const btnSizes = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ variant = 'primary', size = 'md', full, className = '', children, ...props }) {
  return (
    <button
      className={`${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────────
export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-card p-6 shadow-card mb-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────
const inputBase = 'w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm font-sans outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-muted/60';

export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">{label}</label>}
      <input className={`${inputBase} ${error ? 'border-danger' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {hint  && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">{label}</label>}
      <textarea className={`${inputBase} resize-y min-h-[80px] ${error ? 'border-danger' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {hint  && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">{label}</label>}
      <select className={`${inputBase} ${error ? 'border-danger' : ''} ${className}`} {...props}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

// ─── Alert / inline message ────────────────────────────────────
const alertVariants = {
  error:   'bg-red-500/10   border border-red-500/30   text-danger',
  success: 'bg-green-500/10 border border-green-500/30 text-ok',
  info:    'bg-[var(--gold-subtle)] border border-gold-d/40 text-gold-l',
  warning: 'bg-amber-500/10 border border-amber-500/30 text-amber-400',
};

export function Alert({ type = 'info', children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`rounded-lg px-4 py-2.5 text-sm mb-3 ${alertVariants[type]} ${className}`}>
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────
export function Badge({ variant = 'gold', children, className = '' }) {
  const variants = {
    gold:     'bg-[var(--gold-subtle)] border border-gold-d text-gold font-semibold',
    muted:    'bg-surface border border-border text-muted',
    success:  'bg-green-500/10 border border-green-500/30 text-ok',
    danger:   'bg-red-500/10 border border-red-500/30 text-danger',
    pending:  'bg-amber-500/10 border border-amber-500/30 text-amber-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Section heading ──────────────────────────────────────────────
export function SectionHeading({ children, className = '' }) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-widest text-gold whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Rank badge ───────────────────────────────────────────────────
const rankStyles = [
  'bg-yellow-500/15 text-yellow-400 border border-yellow-400/50',
  'bg-slate-400/15 text-slate-300 border border-slate-300/50',
  'bg-amber-600/15 text-amber-500 border border-amber-500/50',
];

export function RankBadge({ rank }) {
  const cls = rank <= 3
    ? rankStyles[rank - 1]
    : 'bg-bg-card2 text-muted border border-border';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${cls}`}>
      {rank}
    </span>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-border mb-5">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors pill-btn ${
            active === t.key
              ? 'text-primary font-semibold'
              : 'text-muted hover:text-primary'
          }`}
        >
          {t.label}
          {active === t.key && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gold rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Pill toggle (2-option) ───────────────────────────────────────
export function PillToggle({ options, value, onChange }) {
  return (
    <div className="flex bg-bg-card2 border border-border rounded-full p-0.5 gap-0.5 w-fit">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all pill-btn ${
            value === o.value ? 'bg-gold text-bg font-semibold' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-bg-card border border-border rounded-card w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-bg-card z-10">
          <h3 className="font-serif font-semibold text-lg text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border text-muted flex items-center justify-center hover:border-muted hover:text-primary transition-all"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 pb-5 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────
export function EmptyState({ icon = '✦', title, text }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl opacity-20 mb-3">{icon}</div>
      {title && <h3 className="text-primary font-medium mb-1">{title}</h3>}
      {text  && <p className="text-muted text-sm">{text}</p>}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-gold animate-spin" />
    </div>
  );
}

// ─── Confirm dialog (uses window.confirm for simplicity) ─────────
export function confirm(msg) {
  return window.confirm(msg);
}

// ─── Checklist item ───────────────────────────────────────────────
export function ChecklistItem({ activity, checked, onChange, disabled }) {
  return (
    <label
      className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all
        ${disabled ? 'cursor-default' : 'hover:border-gold-d'}
        ${checked
          ? 'border-gold-d bg-[var(--gold-subtle)]'
          : 'border-border bg-bg-card2'
        }
        ${disabled && !checked ? 'opacity-40' : ''}
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={disabled ? undefined : e => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 flex-shrink-0"
      />
      <div className="flex justify-between items-center w-full text-sm">
        <span className="text-primary">{activity.name}</span>
        <span className="text-gold text-xs font-semibold flex-shrink-0 ml-2">+{activity.points} pts</span>
      </div>
    </label>
  );
}

// ─── Quote card ───────────────────────────────────────────────────
export function QuoteCard({ quote, author, avatar, likes = 0, liked = false, onLike, canLike = false }) {
  return (
    <div className="bg-bg-card2 border-l-2 border-gold rounded-r-lg px-4 py-3 mb-2.5">
      <p className="italic text-primary text-sm leading-relaxed mb-2">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar src={avatar} name={author} size="xs" />
          <span className="text-xs text-gold font-semibold">— {author}</span>
        </div>
        <button
          onClick={canLike ? onLike : undefined}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all
            ${liked    ? 'text-danger bg-red-500/10' : 'text-muted hover:text-danger'}
            ${canLike  ? 'cursor-pointer' : 'cursor-default'}
          `}
        >
          {liked ? '❤️' : '🤍'} {likes}
        </button>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────
export function StatCard({ value, label }) {
  return (
    <div className="bg-bg-card border border-border rounded-card p-4 text-center">
      <div className="font-serif font-bold text-3xl text-gold leading-none mb-1">{value}</div>
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted">{label}</div>
    </div>
  );
}

// ─── Password input with show/hide toggle ────────────────────────
export function PasswordInput({ label, error, hint, className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={`${inputBase} pr-11 ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors text-base leading-none select-none"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {hint  && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ─── Weekly bar chart ─────────────────────────────────────────────
// days: [{ dateStr, points, isToday, isPast }]  — 7 entries Mon→Sun
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeeklyChart({ days }) {
  console.log('[WeeklyChart] days received:', days.map(d => ({ date: d.dateStr, pts: d.points, isToday: d.isToday })));
  const maxPts = Math.max(1, ...days.map(d => d.points));
  return (
    <div className="w-full select-none">
      <div className="flex items-end gap-1.5 h-20 mb-1">
        {days.map((day, i) => {
          const barH = day.points > 0
            ? Math.max(6, Math.round((day.points / maxPts) * 68))
            : 3;
          const barColor = day.isToday
            ? 'var(--gold)'
            : (day.isPast && day.points > 0)
            ? 'var(--success)'
            : 'var(--border)';
          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
              {day.points > 0 && (
                <span className="text-[9px] font-bold leading-none" style={{ color: day.isToday ? 'var(--gold)' : 'var(--success)' }}>
                  {day.points}
                </span>
              )}
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{ height: `${barH}px`, backgroundColor: barColor, opacity: !day.isPast && !day.isToday ? 0.3 : 1 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {days.map((day, i) => (
          <div key={day.dateStr} className="flex-1 text-center">
            <span
              className="text-[10px] font-semibold"
              style={{ color: day.isToday ? 'var(--gold)' : 'var(--text-muted)' }}
            >
              {DAY_LABELS[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Countdown timer to period end ────────────────────────────────
function calcRemaining(endDateStr) {
  if (!endDateStr) return null;
  const [y, m, d] = endDateStr.split('-').map(Number);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  const diff = end - Date.now();
  if (diff <= 0) return null;
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000)  / 60000);
  return { days, hours, mins };
}

export function CountdownTimer({ period }) {
  const [rem, setRem] = useState(() => calcRemaining(period?.endDate));

  useEffect(() => {
    if (!period?.endDate) return;
    const id = setInterval(() => setRem(calcRemaining(period.endDate)), 60000);
    return () => clearInterval(id);
  }, [period?.endDate]);

  if (!period || !rem) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className="text-gold">⏱</span>
      <span>
        <span className="font-semibold text-primary">{rem.days}d {rem.hours}h</span> remaining in period
      </span>
    </div>
  );
}

// ─── Image upload helper ──────────────────────────────────────────
export function ImageUploadButton({ onUpload, label = 'Upload Image', accept = 'image/*' }) {
  const ref = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onUpload(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <Button variant="ghost" size="sm" onClick={() => ref.current?.click()}>{label}</Button>
    </>
  );
}
