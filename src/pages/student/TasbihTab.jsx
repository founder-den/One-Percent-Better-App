import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, Button, SectionHeading } from '../../components/ui.jsx';
import { todayString } from '../../services/data.js';

export default function TasbihTab() {
  const { student, refreshStudent } = useAuth();
  const { saveTasbih } = useApp();

  const today = todayString();

  // Load tasbih state from student, applying daily reset if needed
  function initTasbih() {
    const t = student.tasbih || { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false };
    if (t.dailyResetEnabled && t.lastUpdatedDate !== today) {
      return { ...t, todayCount: 0, lastUpdatedDate: today };
    }
    return t;
  }

  const [tasbih, setTasbih] = useState(initTasbih);

  // Persist whenever tasbih changes
  useEffect(() => {
    const updated = saveTasbih(student, tasbih);
    if (updated) refreshStudent(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasbih]);

  function add(n) {
    setTasbih(t => ({
      ...t,
      todayCount:    t.todayCount + n,
      allTimeTotal:  t.allTimeTotal + n,
      lastUpdatedDate: today,
    }));
  }

  function resetToday() {
    setTasbih(t => ({ ...t, todayCount: 0, lastUpdatedDate: today }));
  }

  function toggleDailyReset() {
    setTasbih(t => ({ ...t, dailyResetEnabled: !t.dailyResetEnabled }));
  }

  return (
    <div className="mt-6 max-w-sm mx-auto space-y-5">
      <Card>
        <SectionHeading>Tasbih Counter</SectionHeading>

        {/* Main display */}
        <div className="text-center py-6">
          <div
            className="tasbih-tap w-40 h-40 rounded-full border-4 border-gold mx-auto flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 transition-transform bg-[var(--gold-subtle)] hover:bg-gold/20"
            onClick={() => add(1)}
            title="Tap to count"
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') add(1); }}
          >
            <span className="font-serif font-bold text-5xl text-gold leading-none">
              {tasbih.todayCount}
            </span>
            <span className="text-xs text-muted mt-1">Today</span>
          </div>

          <p className="mt-4 text-sm text-muted">
            All-time total:{' '}
            <span className="text-gold font-semibold">{tasbih.allTimeTotal.toLocaleString()}</span>
          </p>
        </div>

        {/* Quick add buttons */}
        <div className="flex gap-2 justify-center mb-4">
          <Button variant="outline" size="sm" onClick={() => add(10)}>+10</Button>
          <Button variant="outline" size="sm" onClick={() => add(100)}>+100</Button>
        </div>

        {/* Reset today */}
        <Button variant="ghost" size="sm" full onClick={resetToday}>
          Reset Today's Count
        </Button>
      </Card>

      {/* Settings */}
      <Card>
        <SectionHeading>Settings</SectionHeading>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm text-primary font-medium">Daily Auto-Reset</p>
            <p className="text-xs text-muted">Reset today's count each new day</p>
          </div>
          <div
            role="switch"
            aria-checked={tasbih.dailyResetEnabled}
            tabIndex={0}
            onClick={toggleDailyReset}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleDailyReset(); }}
            className={`relative w-11 h-6 rounded-full border-2 transition-colors cursor-pointer flex-shrink-0
              ${tasbih.dailyResetEnabled ? 'bg-gold border-gold' : 'bg-surface border-border'}
            `}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
              ${tasbih.dailyResetEnabled ? 'translate-x-5' : 'translate-x-0'}
            `} />
          </div>
        </label>
      </Card>
    </div>
  );
}
