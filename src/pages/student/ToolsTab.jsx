import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, Button, SectionHeading, Input, Modal, Alert, Avatar, Badge } from '../../components/ui.jsx';
import { todayString, formatDate } from '../../services/data.js';

// ─── Shared: progress bar ─────────────────────────────────────────
function ProgressBar({ value, max, className = '' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`w-full bg-surface rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className="h-2 rounded-full bg-gold transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Shared: section divider ──────────────────────────────────────
function SectionDivider() {
  return <div className="gold-divider my-2" />;
}

// ─── Shared: multiline text renderer ─────────────────────────────
function MultilineText({ text, className = '' }) {
  if (!text) return null;
  return <p className={`whitespace-pre-wrap ${className}`}>{text}</p>;
}

// ─── Shared: fullscreen tap overlay ──────────────────────────────
function TasbihCounterOverlay({ title, count, target, isDone, onTap, onClose }) {
  const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;

  const [pos, setPos]                     = useState(null); // null = centered; {x,y} = abs center in container
  const [size, setSize]                   = useState(176);
  const [flash, setFlash]                 = useState(false);
  const [mashallahVisible, setMashallah]  = useState(false);

  const containerRef = useRef(null);
  const dragState    = useRef(null);
  const posRef       = useRef(null);
  const sizeRef      = useRef(176);
  const wasDone      = useRef(isDone);

  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { posRef.current = pos; },  [pos]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Show ما شاء الله when target first reached during this session
  useEffect(() => {
    if (isDone && !wasDone.current) {
      setMashallah(true);
      setTimeout(() => setMashallah(false), 2000);
    }
    wasDone.current = isDone;
  }, [isDone]);

  // Global drag listeners — installed once, read everything via refs
  useEffect(() => {
    function move(clientX, clientY) {
      if (!dragState.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx   = (clientX - rect.left) - dragState.current.startMX;
      const dy   = (clientY - rect.top)  - dragState.current.startMY;
      const half = (sizeRef.current + 32) / 2;
      const newX = Math.max(half, Math.min(rect.width  - half, dragState.current.startBX + dx));
      const newY = Math.max(half, Math.min(rect.height - half, dragState.current.startBY + dy));
      posRef.current = { x: newX, y: newY };
      setPos({ x: newX, y: newY });
    }
    function onMouseMove(e)  { move(e.clientX, e.clientY); }
    function onMouseUp()     { dragState.current = null; }
    function onTouchMove(e)  {
      if (!dragState.current) return;
      e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    }
    function onTouchEnd()    { dragState.current = null; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, []);

  function startDrag(clientX, clientY) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cur  = posRef.current;
    dragState.current = {
      startMX: clientX - rect.left,
      startMY: clientY - rect.top,
      startBX: cur ? cur.x : rect.width  / 2,
      startBY: cur ? cur.y : rect.height / 2,
    };
  }

  function handleTap(e) {
    e.stopPropagation();
    if (isDone || dragState.current) return;
    onTap(1);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  }

  const outerSize = size + 32;
  const outerR    = outerSize / 2;
  const dotR      = 3;
  const dots      = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 - 90) * (Math.PI / 180);
    const r     = outerR - dotR - 1;
    return { left: outerR + r * Math.cos(angle) - dotR, top: outerR + r * Math.sin(angle) - dotR };
  });

  const innerBg   = flash ? 'rgba(220,175,60,0.85)' : isDone ? 'transparent' : 'var(--gold)';
  const countSize = size >= 200 ? '4rem' : size >= 160 ? '3.5rem' : size >= 130 ? '2.5rem' : '2rem';

  return (
    <div
      className="tasbih-overlay-anim fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <style>{`
        @keyframes tasbih-overlay-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .tasbih-overlay-anim { animation: tasbih-overlay-in 0.2s ease forwards; }
      `}</style>

      <div className="flex flex-col flex-1 m-2 rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(45,106,79,0.3)' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-3">
          <div className="min-w-0">
            <p style={{ color: 'var(--text, #fff)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.3 }}>
              {title}
            </p>
            <p style={{ color: 'var(--gold)', fontSize: '0.875rem', marginTop: 2 }}>
              {count.toLocaleString()} / {target.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-3">
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, background: 'var(--gold)' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textAlign: 'right', marginTop: 4 }}>{pct}%</p>
        </div>

        {/* ما شاء الله */}
        {mashallahVisible && (
          <p style={{ textAlign: 'center', color: 'var(--gold)', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '1.25rem', marginBottom: 8 }}>
            ما شاء الله
          </p>
        )}

        {/* Draggable double-ring tap button */}
        <div ref={containerRef} className="flex-1 relative" style={{ minHeight: outerSize + 20 }}>
          <div
            style={{
              position: 'absolute',
              left:      pos ? pos.x - outerSize / 2 : '50%',
              top:       pos ? pos.y - outerSize / 2 : '50%',
              transform: pos ? 'none' : 'translate(-50%, -50%)',
              width: outerSize, height: outerSize,
              cursor: 'grab', touchAction: 'none', userSelect: 'none',
            }}
            onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
            onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          >
            {/* Outer ring */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--gold)', pointerEvents: 'none' }} />
            {/* 8 dot decorations */}
            {dots.map((d, i) => (
              <span key={i} style={{ position: 'absolute', width: dotR * 2, height: dotR * 2, borderRadius: '50%', background: 'var(--gold)', left: d.left, top: d.top, pointerEvents: 'none' }} />
            ))}
            {/* Inner filled circle */}
            <div
              onClick={handleTap}
              style={{
                position: 'absolute', top: 16, left: 16,
                width: size, height: size, borderRadius: '50%',
                background: innerBg,
                border: isDone ? '2px solid var(--gold)' : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(45,106,79,0.3)',
                cursor: isDone ? 'default' : 'pointer',
                transform: flash ? 'scale(0.93)' : 'scale(1)',
                transition: 'transform 0.15s ease, background 0.1s',
              }}
            >
              <span style={{ fontSize: countSize, fontWeight: 700, color: isDone ? 'var(--gold)' : '#fff', fontFamily: 'DM Sans, sans-serif', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {count.toLocaleString()}
              </span>
              {isDone && (
                <span style={{ color: 'var(--gold)', fontSize: '0.85rem', marginTop: 4, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  Done ✓
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick-add buttons */}
        <div className="flex gap-3 justify-center pt-4 pb-3">
          {!isDone ? (
            [10, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => onTap(n)}
                style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >+{n}</button>
            ))
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', padding: '10px 0' }}>
              Goal reached! Tap ✕ to close.
            </p>
          )}
        </div>

        {/* Size controls */}
        <div className="flex items-center gap-3 justify-center pb-10">
          {[['−', -20, 120], ['+', 20, 240]].map(([label, delta, limit]) => (
            <button
              key={label}
              onClick={() => setSize(s => delta < 0 ? Math.max(limit, s + delta) : Math.min(limit, s + delta))}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}
            >{label}</button>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── Expand trigger button ────────────────────────────────────────
function ExpandButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title="Open counter"
      className="flex-shrink-0 flex flex-col items-center gap-0.5"
      style={{
        background: 'transparent',
        border: `1px solid ${hov ? 'var(--gold)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '4px 8px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <span style={{ fontSize: '1rem', color: hov ? 'var(--gold)' : 'var(--text-muted)', transition: 'color 0.15s' }}>📿</span>
      <span style={{ fontSize: 10, color: hov ? 'var(--gold)' : 'var(--text-muted)', transition: 'color 0.15s', lineHeight: 1.2 }}>
        Tap to count
      </span>
    </button>
  );
}

// ─── Shared: "Updated X" label for reading tracker ───────────────
function lastUpdatedLabel(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const diff = Math.round((today - date) / 86400000);
  if (diff === 0) return 'Updated today';
  if (diff === 1) return 'Updated yesterday';
  if (diff >= 2 && diff <= 9) return `Updated ${diff} days ago`;
  return `Updated ${formatDate(dateStr)}`;
}

// ═════════════════════════════════════════════════════════════════
// SECTION 1 — PERSONAL TASBIH
// All state is local + student.tasbih in localStorage.
// Completely independent from Global Tasbih.
// Also shows admin-created personal tasbih template goals.
// ═════════════════════════════════════════════════════════════════

// ─── Admin template goal tracker ─────────────────────────────────
function PersonalTemplateGoal({ template, student }) {
  const { getPersonalTplProgress, savePersonalTplProgress } = useApp();
  const [data, setData] = useState(() => getPersonalTplProgress(student.id, template.id));
  const [celebration, setCelebration] = useState('');
  const [expanded, setExpanded] = useState(false);

  const count  = data.count || 0;
  const target = template.target || 100;
  const pct    = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;
  const isDone = count >= target;

  function tap(n) {
    const newCount = count + n;
    const newData = { count: newCount };
    setData(newData);
    savePersonalTplProgress(student.id, template.id, newData);
    if (!isDone && newCount >= target) {
      setCelebration('MashAllah! Goal reached! 🎉');
      setTimeout(() => setCelebration(''), 4000);
    }
  }

  function reset() {
    const newData = { count: 0 };
    setData(newData);
    savePersonalTplProgress(student.id, template.id, newData);
    setCelebration('');
  }

  return (
    <>
      {expanded && (
        <TasbihCounterOverlay
          title={template.title}
          count={count}
          target={target}
          isDone={isDone}
          celebration={celebration}
          onTap={tap}
          onClose={() => setExpanded(false)}
        />
      )}
      <div className={`p-4 rounded-lg border ${isDone ? 'border-gold-d bg-[var(--gold-subtle)]' : 'border-border bg-bg-card2'} mt-3`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">{template.title}</p>
            {template.description && (
              <p className="text-xs text-muted mt-0.5 whitespace-pre-wrap">{template.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDone && <span className="text-xs text-gold font-bold">✓ Done</span>}
            <ExpandButton onClick={() => setExpanded(true)} />
          </div>
        </div>
        {celebration && (
          <div className="text-center text-xs font-semibold text-gold py-1 px-2 rounded bg-[var(--gold-subtle)] mb-2">
            {celebration}
          </div>
        )}
        <ProgressBar value={count} max={target} className="mb-1" />
        <p className="text-xs text-muted mb-2">{count.toLocaleString()} / {target.toLocaleString()} ({pct}%)</p>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="xs" variant="outline" onClick={() => tap(1)}>+1</Button>
          <Button size="xs" variant="outline" onClick={() => tap(10)}>+10</Button>
          <Button size="xs" variant="outline" onClick={() => tap(50)}>+50</Button>
          <Button size="xs" variant="outline" onClick={() => tap(100)}>+100</Button>
          <Button size="xs" variant="ghost" onClick={reset}>Reset</Button>
        </div>
      </div>
    </>
  );
}

// ─── Student-created personal tasbih card ────────────────────────
function StudentTasbihCard({ pt, studentId }) {
  const { updatePersonalTasbih, deletePersonalTasbih } = useApp();
  const [celebration, setCelebration] = useState('');
  const [expanded, setExpanded] = useState(false);

  const current = pt.current || 0;
  const target  = pt.target  || 100;
  const pct     = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const isDone  = current >= target;

  function tap(n) {
    if (isDone) return;
    const newCurrent = Math.min(current + n, target);
    updatePersonalTasbih(studentId, pt.id, { current: newCurrent });
    if (!isDone && newCurrent >= target) {
      setCelebration('MashAllah! Goal reached!');
      setTimeout(() => setCelebration(''), 4000);
    }
  }

  function reset() {
    updatePersonalTasbih(studentId, pt.id, { current: 0 });
    setCelebration('');
  }

  const RESET_LABELS = { none: '', daily: 'Daily reset', weekly: 'Weekly reset' };

  return (
    <>
      {expanded && (
        <TasbihCounterOverlay
          title={pt.title}
          count={current}
          target={target}
          isDone={isDone}
          celebration={celebration}
          onTap={tap}
          onClose={() => setExpanded(false)}
        />
      )}
      <div className={`p-4 rounded-lg border ${isDone ? 'border-gold-d bg-[var(--gold-subtle)]' : 'border-border bg-bg-card2'} mt-3`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary">{pt.title}</p>
          {pt.resetType && pt.resetType !== 'none' && (
            <p className="text-xs text-muted">{RESET_LABELS[pt.resetType]}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isDone && <span className="text-xs text-gold font-bold">Done</span>}
          <ExpandButton onClick={() => setExpanded(true)} />
          <button
            onClick={() => { if (window.confirm(`Delete "${pt.title}"?`)) deletePersonalTasbih(studentId, pt.id); }}
            className="text-xs text-muted hover:text-danger transition-colors"
            title="Delete"
          >✕</button>
        </div>
      </div>
      {celebration && (
        <div className="text-center text-xs font-semibold text-gold py-1 px-2 rounded bg-[var(--gold-subtle)] mb-2">
          {celebration}
        </div>
      )}
      <ProgressBar value={current} max={target} className="mb-1" />
      <p className="text-xs text-muted mb-2">{current.toLocaleString()} / {target.toLocaleString()} ({pct}%)</p>
      <div className="flex gap-1.5 flex-wrap">
        <Button size="xs" variant="outline" onClick={() => tap(1)}>+1</Button>
        <Button size="xs" variant="outline" onClick={() => tap(10)}>+10</Button>
        <Button size="xs" variant="outline" onClick={() => tap(50)}>+50</Button>
        <Button size="xs" variant="outline" onClick={() => tap(100)}>+100</Button>
        <Button size="xs" variant="ghost" onClick={reset}>Reset</Button>
      </div>
    </div>
    </>
  );
}

export function PersonalTasbih() {
  const { student, refreshStudent } = useAuth();
  const { saveTasbih, personalTasbihTemplates, addPersonalTasbih } = useApp();
  const today = todayString();

  // State for add-tasbih form
  const [showAddForm, setShowAddForm]   = useState(false);
  const [addForm, setAddForm]           = useState({ title: '', target: '', resetType: 'none' });
  const [addErr, setAddErr]             = useState('');

  function initTasbih() {
    const t = student.tasbih || {
      allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false,
    };
    if (t.dailyResetEnabled && t.lastUpdatedDate !== today) {
      return { ...t, todayCount: 0, lastUpdatedDate: today };
    }
    return t;
  }

  const [tasbih, setTasbih] = useState(initTasbih);

  useEffect(() => {
    const updated = saveTasbih(student, tasbih);
    if (updated) refreshStudent(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasbih]);

  function add(n) {
    setTasbih(t => ({
      ...t,
      todayCount:      t.todayCount + n,
      allTimeTotal:    t.allTimeTotal + n,
      lastUpdatedDate: today,
    }));
  }

  function resetToday() {
    setTasbih(t => ({ ...t, todayCount: 0, lastUpdatedDate: today }));
  }

  function toggleDailyReset() {
    setTasbih(t => ({ ...t, dailyResetEnabled: !t.dailyResetEnabled }));
  }

  function handleAdd() {
    setAddErr('');
    if (!addForm.title.trim()) { setAddErr('Title is required.'); return; }
    const target = parseInt(addForm.target);
    if (isNaN(target) || target < 1) { setAddErr('Target must be a positive number.'); return; }
    addPersonalTasbih(student.id, { title: addForm.title.trim(), target, resetType: addForm.resetType });
    setAddForm({ title: '', target: '', resetType: 'none' });
    setShowAddForm(false);
    setAddErr('');
  }

  // Filter templates visible to this student's group
  const visibleTemplates = personalTasbihTemplates.filter(t =>
    t.isActive &&
    (t.groupScope === 'all' ||
      (Array.isArray(t.groupScope) && t.groupScope.includes(student.groupId)))
  );

  const myTasbihs = student.personalTasbihs || [];

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeading>Personal Counter</SectionHeading>
        <div className="text-center py-4">
          <div
            className="tasbih-tap w-36 h-36 rounded-full border-4 border-gold mx-auto flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 transition-transform bg-[var(--gold-subtle)] hover:bg-gold/20"
            onClick={() => add(1)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') add(1); }}
            title="Tap to count"
          >
            <span className="font-serif font-bold text-5xl text-gold leading-none">
              {tasbih.todayCount}
            </span>
            <span className="text-xs text-muted mt-1">Today</span>
          </div>
          <p className="mt-3 text-sm text-muted">
            All-time:{' '}
            <span className="text-gold font-semibold">{tasbih.allTimeTotal.toLocaleString()}</span>
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-3">
          <Button variant="outline" size="sm" onClick={() => add(10)}>+10</Button>
          <Button variant="outline" size="sm" onClick={() => add(100)}>+100</Button>
        </div>
        <Button variant="ghost" size="sm" full onClick={resetToday}>Reset Today's Count</Button>

        <label className="flex items-center justify-between cursor-pointer mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-primary font-medium">Daily Auto-Reset</p>
            <p className="text-xs text-muted">Resets today's count each new day</p>
          </div>
          <div
            role="switch"
            aria-checked={tasbih.dailyResetEnabled}
            tabIndex={0}
            onClick={toggleDailyReset}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleDailyReset(); }}
            className={`relative w-11 h-6 rounded-full border-2 transition-colors cursor-pointer flex-shrink-0
              ${tasbih.dailyResetEnabled ? 'bg-gold border-gold' : 'bg-surface border-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
              ${tasbih.dailyResetEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </label>
      </Card>

      {/* My Tasbihs — student-created personal counters */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <SectionHeading>My Tasbihs</SectionHeading>
          <Button size="xs" variant="ghost" onClick={() => { setShowAddForm(f => !f); setAddErr(''); }}>
            {showAddForm ? 'Cancel' : '+ Add'}
          </Button>
        </div>

        {showAddForm && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {addErr && <p className="text-xs text-danger">{addErr}</p>}
            <Input
              label="Title *"
              value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Say Subhanallah 100 times"
            />
            <Input
              label="Target *"
              type="number"
              value={addForm.target}
              onChange={e => setAddForm(f => ({ ...f, target: e.target.value }))}
              placeholder="e.g. 100"
              min={1}
            />
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Auto Reset</label>
              <select
                value={addForm.resetType}
                onChange={e => setAddForm(f => ({ ...f, resetType: e.target.value }))}
                className="w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              >
                <option value="none">None — never resets</option>
                <option value="daily">Daily — resets every midnight</option>
                <option value="weekly">Weekly — resets every Monday</option>
              </select>
            </div>
            <Button size="sm" full onClick={handleAdd}>Add Tasbih</Button>
          </div>
        )}

        {myTasbihs.length === 0 && !showAddForm && (
          <p className="text-sm text-muted mt-2">No personal tasbihs yet. Tap + Add to create one.</p>
        )}

        {myTasbihs.map(pt => (
          <StudentTasbihCard key={pt.id} pt={pt} studentId={student.id} />
        ))}
      </Card>

      {visibleTemplates.length > 0 && (
        <Card>
          <SectionHeading>Tasbih Goals</SectionHeading>
          <div className="space-y-3">
            {visibleTemplates.map(t => (
              <PersonalTemplateGoal key={t.id} template={t} student={student} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// SECTION 2 — GLOBAL TASBIH
// Uses opb_global_tasbihs — completely separate from personal tasbih.
// tapGlobalTasbih always reads fresh from localStorage before writing.
// ═════════════════════════════════════════════════════════════════
function GlobalTasbihCard({ tasbih, groupId }) {
  const { tapGlobalTasbih } = useApp();
  const [celebration, setCelebration] = useState('');
  const [expanded, setExpanded] = useState(false);

  const visible =
    tasbih.groupScope === 'all' ||
    (Array.isArray(tasbih.groupScope) && tasbih.groupScope.includes(groupId));
  if (!visible || !tasbih.isActive) return null;

  function tap(amount) {
    const result = tapGlobalTasbih(tasbih.id, amount);
    if (result?.justCompleted) {
      setCelebration(
        `MashAllah! Completed ${result.completedTimes} time${result.completedTimes !== 1 ? 's' : ''}! 🎉`
      );
      setTimeout(() => setCelebration(''), 4000);
    }
  }

  const pct =
    tasbih.target > 0
      ? Math.min(100, Math.round((tasbih.current / tasbih.target) * 100))
      : 0;

  const isDone = tasbih.current >= tasbih.target;

  return (
    <>
      {expanded && (
        <TasbihCounterOverlay
          title={tasbih.title}
          count={tasbih.current}
          target={tasbih.target}
          isDone={isDone}
          celebration={celebration}
          onTap={tap}
          onClose={() => setExpanded(false)}
        />
      )}
      <Card>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">{tasbih.title}</p>
            {tasbih.description && (
              <MultilineText text={tasbih.description} className="text-xs text-muted mt-0.5" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tasbih.completedTimes > 0 && (
              <Badge variant="gold">{tasbih.completedTimes}×</Badge>
            )}
            <ExpandButton onClick={() => setExpanded(true)} />
          </div>
        </div>

        {celebration && (
          <div className="text-center text-sm font-semibold text-gold py-2 px-3 rounded-lg bg-[var(--gold-subtle)] border border-gold-d mb-3">
            {celebration}
          </div>
        )}

        <ProgressBar value={tasbih.current} max={tasbih.target} className="mb-1" />
        <p className="text-xs text-muted text-right mb-3">
          {tasbih.current.toLocaleString()} / {tasbih.target.toLocaleString()} ({pct}%)
        </p>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => tap(1)}>+1</Button>
          <Button variant="outline" size="sm" onClick={() => tap(10)}>+10</Button>
          <Button variant="outline" size="sm" onClick={() => tap(50)}>+50</Button>
          <Button variant="outline" size="sm" onClick={() => tap(100)}>+100</Button>
        </div>
      </Card>
    </>
  );
}

export function GlobalTasbihSection({ groupId }) {
  const { globalTasbihs } = useApp();
  const visible = globalTasbihs.filter(
    t =>
      t.isActive &&
      (t.groupScope === 'all' ||
        (Array.isArray(t.groupScope) && t.groupScope.includes(groupId)))
  );

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted py-2">
        No global tasbihs active for your group.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map(t => (
        <GlobalTasbihCard key={t.id} tasbih={t} groupId={groupId} />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// SECTION 3 — READING TRACKER
// Per-student books stored in opb_reading_{username}
// lastUpdated field stored per book, updated on every page change.
// ═════════════════════════════════════════════════════════════════
function BookCard({ book, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [page, setPage]       = useState(String(book.currentPage));
  const [pageErr, setPageErr] = useState('');

  function savePage() {
    const n = parseInt(page);
    if (isNaN(n) || n < 0)  { setPageErr('Enter a valid page number.'); return; }
    if (n > book.totalPages) { setPageErr(`Max ${book.totalPages} pages.`); return; }
    onUpdate(book.id, {
      currentPage: n,
      lastUpdated: todayString(),
      status: n >= book.totalPages ? 'Finished' : book.status,
    });
    setEditing(false);
    setPageErr('');
  }

  function markFinished() {
    onUpdate(book.id, {
      currentPage: book.totalPages,
      lastUpdated: todayString(),
      status: 'Finished',
    });
  }

  const pct =
    book.totalPages > 0
      ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
      : 0;

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary">{book.title}</p>
          {book.author    && <p className="text-xs text-muted">{book.author}</p>}
          {book.startDate && <p className="text-xs text-muted">Started {formatDate(book.startDate)}</p>}
        </div>
        <Badge variant={book.status === 'Finished' ? 'success' : 'muted'}>{book.status}</Badge>
      </div>

      <ProgressBar value={book.currentPage} max={book.totalPages} className="mb-1" />
      <p className="text-xs text-muted mb-2">p. {book.currentPage} / {book.totalPages} · {pct}%</p>

      {book.status !== 'Finished' && (
        <>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={page}
                onChange={e => { setPage(e.target.value); setPageErr(''); }}
                className="w-24 bg-bg-card2 border border-border text-primary rounded-lg px-2 py-1.5 text-sm outline-none focus:border-gold"
                placeholder="Page"
                min={0}
                max={book.totalPages}
              />
              <Button size="xs" onClick={savePage}>Save</Button>
              <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setPageErr(''); }}>Cancel</Button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Button size="xs" variant="outline" onClick={() => { setPage(String(book.currentPage)); setEditing(true); }}>
                Update page
              </Button>
              <Button size="xs" variant="success" onClick={markFinished}>Mark Finished</Button>
            </div>
          )}
          {pageErr && <p className="text-xs text-danger mt-1">{pageErr}</p>}
        </>
      )}
      <Button size="xs" variant="ghost" className="mt-2" onClick={() => onDelete(book.id)}>Remove</Button>
    </div>
  );
}

// ─── Groupmates "See Others" card — improved readability ──────────
function OtherReadersRow({ student, books }) {
  const reading = books.filter(b => b.status === 'Reading');
  if (reading.length === 0) return null;

  return (
    <div className="py-4 border-b border-border last:border-0">
      {/* Student header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={student.avatar} name={student.fullName} size="sm" />
        <span className="text-sm font-bold text-primary">{student.fullName}</span>
      </div>

      {/* Books */}
      <div className="space-y-3">
        {reading.map(b => {
          const pct = b.totalPages > 0
            ? Math.min(100, Math.round((b.currentPage / b.totalPages) * 100))
            : 0;
          const updLabel = lastUpdatedLabel(b.lastUpdated);

          return (
            <div
              key={b.id}
              className="bg-bg-card2 border border-border rounded-lg px-4 py-3"
            >
              {/* Book title */}
              <p className="text-sm font-semibold text-primary mb-2">{b.title}</p>

              {/* Progress bar */}
              <ProgressBar value={b.currentPage} max={b.totalPages} className="mb-2" />

              {/* Pages + last updated */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">
                  p. {b.currentPage} / {b.totalPages}
                  <span className="text-muted/60 ml-1">({pct}%)</span>
                </span>
                {updLabel && (
                  <span className="text-xs text-muted flex-shrink-0">{updLabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReadingTrackerSection({ student, groupmates }) {
  const { addBook: ctxAddBook, updateBook: ctxUpdateBook, removeBook: ctxRemoveBook } = useApp();
  // Books come from student.books (kept fresh by AppContext)
  const books = student.books || [];
  const [showOthers, setShowOthers]     = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm]           = useState({
    title: '', author: '', startDate: todayString(), totalPages: '', currentPage: '0',
  });
  const [addErr, setAddErr] = useState('');

  function addBook() {
    setAddErr('');
    const total = parseInt(addForm.totalPages);
    const cur   = parseInt(addForm.currentPage) || 0;
    if (!addForm.title.trim())     { setAddErr('Title is required.'); return; }
    if (isNaN(total) || total < 1) { setAddErr('Enter valid total pages.'); return; }
    const bookData = {
      title:       addForm.title.trim(),
      author:      addForm.author.trim(),
      startDate:   addForm.startDate,
      totalPages:  total,
      currentPage: Math.min(cur, total),
      lastUpdated: todayString(),
      status:      cur >= total ? 'Finished' : 'Reading',
    };
    ctxAddBook(student.id, bookData);
    setShowAddModal(false);
    setAddForm({ title: '', author: '', startDate: todayString(), totalPages: '', currentPage: '0' });
  }

  function updateBook(id, fields) {
    ctxUpdateBook(student.id, id, fields);
  }

  function deleteBook(id) {
    if (!window.confirm('Remove this book?')) return;
    ctxRemoveBook(student.id, id);
  }

  function toggleOthers() {
    setShowOthers(v => !v);
  }

  const othersData = groupmates
    .map(s => ({ student: s, books: s.books || [] }))
    .filter(d => d.books.some(b => b.status === 'Reading'));

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading className="!mb-0">My Books</SectionHeading>
        <div className="flex gap-2">
          <Button size="xs" variant="ghost" onClick={toggleOthers}>
            {showOthers ? 'Hide Others' : 'See Others'}
          </Button>
          <Button size="xs" onClick={() => setShowAddModal(true)}>+ Add Book</Button>
        </div>
      </div>

      {books.length === 0 && !showOthers && (
        <p className="text-sm text-muted py-2">No books yet. Add your first book!</p>
      )}
      {books.map(b => (
        <BookCard key={b.id} book={b} onUpdate={updateBook} onDelete={deleteBook} />
      ))}

      {showOthers && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Groupmates Currently Reading
          </p>
          {othersData.length === 0 ? (
            <p className="text-sm text-muted">No groupmates currently reading.</p>
          ) : (
            othersData.map(d => (
              <OtherReadersRow key={d.student.id} student={d.student} books={d.books} />
            ))
          )}
        </div>
      )}

      {/* Add Book Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setAddErr(''); }}
        title="Add Book"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setShowAddModal(false); setAddErr(''); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={addBook}>Add</Button>
          </>
        }
      >
        {addErr && <Alert type="error">{addErr}</Alert>}
        <Input label="Title *" value={addForm.title}
          onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Book title" />
        <Input label="Author (optional)" value={addForm.author}
          onChange={e => setAddForm(f => ({ ...f, author: e.target.value }))}
          placeholder="Author name" />
        <Input label="Start Date" type="date" value={addForm.startDate}
          onChange={e => setAddForm(f => ({ ...f, startDate: e.target.value }))} />
        <Input label="Total Pages *" type="number" value={addForm.totalPages}
          onChange={e => setAddForm(f => ({ ...f, totalPages: e.target.value }))}
          placeholder="e.g. 320" min={1} />
        <Input label="Current Page" type="number" value={addForm.currentPage}
          onChange={e => setAddForm(f => ({ ...f, currentPage: e.target.value }))}
          placeholder="0" min={0} />
      </Modal>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════
// SECTION 4 — PROGRAMS
// Admin creates programs with tasks; completions stored per student.
// ═════════════════════════════════════════════════════════════════
function TaskTasbihCounter({ taskId, target, completion, onChange }) {
  const count  = completion?.count || 0;
  const isDone = completion?.isDone || false;
  const pct    = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;

  function tap(n) {
    if (isDone) return;
    const newCount = Math.min(count + n, target);
    onChange(taskId, { count: newCount, isDone: newCount >= target });
  }

  return (
    <div className="mt-2">
      <ProgressBar value={count} max={target} className="mb-1" />
      <p className="text-xs text-muted mb-2">
        {count} / {target} ({pct}%){isDone ? ' ✓ Done!' : ''}
      </p>
      {!isDone && (
        <div className="flex gap-1.5 flex-wrap">
          <Button size="xs" variant="outline" onClick={() => tap(1)}>+1</Button>
          <Button size="xs" variant="outline" onClick={() => tap(10)}>+10</Button>
          <Button size="xs" variant="outline" onClick={() => tap(50)}>+50</Button>
          <Button size="xs" variant="outline" onClick={() => tap(100)}>+100</Button>
        </div>
      )}
    </div>
  );
}

// ─── Collective tasbih counter (shared across all students) ──────
function CollectiveTasbihCounter({ task }) {
  const { tapCollectiveTask, getCollectiveTaskCount } = useApp();
  const [celebration, setCelebration] = useState('');

  // Read live from context (updated by tapCollectiveTask)
  const data = getCollectiveTaskCount(task.id);
  const target = task.target || 100;
  const { count, completedTimes } = data;
  const pct = target > 0 ? Math.min(100, Math.round((count / target) * 100)) : 0;

  async function tap(n) {
    const result = await tapCollectiveTask(task.id, target, n);
    if (result?.justCompleted) {
      setCelebration(`Completed ${result.completedTimes}× ! 🎉`);
      setTimeout(() => setCelebration(''), 4000);
    }
  }

  return (
    <div className="mt-2">
      {celebration && (
        <div className="text-center text-xs font-semibold text-gold py-1 px-2 rounded bg-[var(--gold-subtle)] mb-2">
          {celebration}
        </div>
      )}
      <ProgressBar value={count} max={target} className="mb-1" />
      <div className="flex items-center justify-between text-xs text-muted mb-2">
        <span>
          {count.toLocaleString()} / {target.toLocaleString()} ({pct}%)
          {completedTimes > 0 && <span className="text-gold font-semibold ml-1">{completedTimes}× done</span>}
        </span>
        <span className="opacity-60 text-xs">Everyone contributes</span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <Button size="xs" variant="outline" onClick={() => tap(1)}>+1</Button>
        <Button size="xs" variant="outline" onClick={() => tap(10)}>+10</Button>
        <Button size="xs" variant="outline" onClick={() => tap(50)}>+50</Button>
        <Button size="xs" variant="outline" onClick={() => tap(100)}>+100</Button>
      </div>
    </div>
  );
}

function ProgramCard({ program, completions, onUpdateCompletion }) {
  function getCompletion(taskId) {
    return completions.find(c => c.programId === program.id && c.taskId === taskId);
  }

  // Collective tasbih tasks are shared — exclude from per-student progress count
  const individualTasks = program.tasks.filter(
    t => !(t.type === 'tasbih' && t.mode === 'collective')
  );
  const totalTasks = individualTasks.length;
  const doneTasks  = individualTasks.filter(t => getCompletion(t.id)?.isDone).length;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary">{program.name}</p>
          {program.description && (
            <MultilineText text={program.description} className="text-xs text-muted mt-0.5" />
          )}
          {program.date && <p className="text-xs text-muted">{formatDate(program.date)}</p>}
        </div>
        {totalTasks > 0 && (
          <span className="text-xs text-muted flex-shrink-0">{doneTasks}/{totalTasks}</span>
        )}
      </div>

      {totalTasks > 0 && (
        <ProgressBar value={doneTasks} max={totalTasks} className="mb-3" />
      )}

      <div className="space-y-3">
        {[...program.tasks]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(task => {
            const isCollective = task.type === 'tasbih' && task.mode === 'collective';
            const comp   = isCollective ? null : getCompletion(task.id);
            const isDone = isCollective ? false : comp?.isDone;
            return (
              <div
                key={task.id}
                className={`p-3 rounded-lg border transition-colors
                  ${isDone
                    ? 'border-gold-d bg-[var(--gold-subtle)]'
                    : 'border-border bg-bg-card2'}`}
              >
                <div className="flex items-start gap-3">
                  {task.type === 'todo' ? (
                    <button
                      onClick={() =>
                        onUpdateCompletion(program.id, task.id, {
                          isDone: !comp?.isDone,
                          count:  comp?.count || 0,
                        })
                      }
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${comp?.isDone ? 'bg-gold border-gold text-bg' : 'border-border bg-bg'}`}
                    >
                      {comp?.isDone && <span className="text-xs leading-none">✓</span>}
                    </button>
                  ) : (
                    <span className="mt-0.5 text-base flex-shrink-0">
                      {isCollective ? '🌐' : '📿'}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <MultilineText
                        text={task.description}
                        className={`text-sm flex-1 ${
                          isDone && task.type === 'todo'
                            ? 'text-primary line-through opacity-60'
                            : 'text-primary'
                        }`}
                      />
                      {isCollective && (
                        <span className="text-xs text-muted border border-border rounded px-1.5 py-0.5 flex-shrink-0">
                          Shared
                        </span>
                      )}
                    </div>
                    {task.type === 'tasbih' && (
                      isCollective
                        ? <CollectiveTasbihCounter task={task} />
                        : <TaskTasbihCounter
                            taskId={task.id}
                            target={task.target || 100}
                            completion={comp}
                            onChange={(tid, upd) => onUpdateCompletion(program.id, tid, upd)}
                          />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {program.tasks.length === 0 && (
        <p className="text-xs text-muted">No tasks yet.</p>
      )}
    </Card>
  );
}

export function ProgramsSection({ student, groupId }) {
  const { programs, programsLabel, getStudentProgramCompletions, saveProgramCompletion } = useApp();

  // Completions come from context (kept fresh by AppContext)
  const completions = getStudentProgramCompletions(student.id);

  const visible = programs.filter(
    p =>
      p.isActive &&
      (p.groupScope === 'all' ||
        (Array.isArray(p.groupScope) && p.groupScope.includes(groupId)))
  );

  function updateCompletion(programId, taskId, fields) {
    const existing = completions.find(c => c.programId === programId && c.taskId === taskId);
    const isDone = fields.isDone ?? existing?.isDone ?? false;
    const count  = fields.count  ?? existing?.count  ?? 0;
    saveProgramCompletion(student.id, programId, taskId, isDone, count);
  }

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted py-2">
        No {programsLabel.toLowerCase()} available for your group.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map(prog => (
        <ProgramCard
          key={prog.id}
          program={prog}
          completions={completions}
          onUpdateCompletion={updateCompletion}
        />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DEFAULT EXPORT — kept for backward compatibility
// ToolsPage.jsx uses the named section exports above.
// ═════════════════════════════════════════════════════════════════
export default function ToolsTab() {
  const { student }      = useAuth();
  const { programsLabel, studentsForGroup } = useApp();
  const groupmates = studentsForGroup(student.groupId).filter(s => s.id !== student.id);

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-serif text-xl text-primary mb-4">Personal Tasbih</h2>
          <PersonalTasbih />
        </section>
        <section>
          <h2 className="font-serif text-xl text-primary mb-4">Global Tasbih</h2>
          <GlobalTasbihSection groupId={student.groupId} />
        </section>
      </div>
      <SectionDivider />
      <section>
        <h2 className="font-serif text-xl text-primary mb-4">Reading Tracker</h2>
        <ReadingTrackerSection student={student} groupmates={groupmates} />
      </section>
      <SectionDivider />
      <section>
        <h2 className="font-serif text-xl text-primary mb-4">{programsLabel}</h2>
        <ProgramsSection student={student} groupId={student.groupId} />
      </section>
    </div>
  );
}
