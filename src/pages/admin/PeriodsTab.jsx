import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, Button, Input, SectionHeading, EmptyState, Badge } from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';
import { generateId } from '../../services/data.js';

// ─── Per-period activity manager ──────────────────────────────────
function PeriodActivityEditor({ period, onUpdate }) {
  const [name,    setName]    = useState('');
  const [points,  setPoints]  = useState('');
  const [err,     setErr]     = useState('');
  const [editId,  setEditId]  = useState(null);
  const [editName, setEditName] = useState('');
  const [editPts,  setEditPts]  = useState('');
  const [editErr,  setEditErr]  = useState('');

  const activities = period.activities || [];

  function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('Name is required.'); return; }
    const pts = parseInt(points);
    if (isNaN(pts) || pts <= 0) { setErr('Points must be a positive number.'); return; }
    onUpdate([...activities, { id: generateId(), name: name.trim(), points: pts, is_active: true }]);
    setName(''); setPoints('');
  }

  function startEdit(act) {
    setEditId(act.id);
    setEditName(act.name);
    setEditPts(String(act.points));
    setEditErr('');
  }

  function saveEdit() {
    setEditErr('');
    if (!editName.trim()) { setEditErr('Name is required.'); return; }
    const pts = parseInt(editPts);
    if (isNaN(pts) || pts <= 0) { setEditErr('Points must be a positive number.'); return; }
    onUpdate(activities.map(a => a.id === editId ? { ...a, name: editName.trim(), points: pts } : a));
    setEditId(null);
  }

  function toggleActive(act) {
    onUpdate(activities.map(a => a.id === act.id ? { ...a, is_active: !a.is_active } : a));
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">Period Activities</p>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap mb-2">
        <div className="flex-1 min-w-32">
          <Input
            label="Activity Name"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
            placeholder="e.g. Reading Book"
          />
        </div>
        <div className="w-24">
          <Input
            label="Points"
            type="number"
            value={points}
            onChange={e => { setPoints(e.target.value); setErr(''); }}
            placeholder="10"
            min="1"
          />
        </div>
        <Button type="submit" size="sm" className="mb-4">Add</Button>
      </form>
      {err && <p className="text-xs text-danger -mt-1 mb-2">{err}</p>}

      {/* Activity list */}
      {activities.length === 0 && (
        <p className="text-xs text-muted">No activities yet. Add one above.</p>
      )}
      <div className="space-y-1.5">
        {activities.map(act => {
          if (editId === act.id) {
            return (
              <div key={act.id} className="border border-gold-d rounded-lg p-2 bg-[var(--gold-subtle)]">
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-28">
                    <Input label="Name" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div className="w-20">
                    <Input label="Points" type="number" value={editPts} onChange={e => setEditPts(e.target.value)} min="1" />
                  </div>
                  <div className="flex gap-1.5 mb-4">
                    <Button size="xs" onClick={saveEdit}>Save</Button>
                    <Button size="xs" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
                {editErr && <p className="text-xs text-danger -mt-2">{editErr}</p>}
              </div>
            );
          }

          const isActive = act.is_active !== false;
          return (
            <div
              key={act.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                ${isActive ? 'border-border bg-bg-card2' : 'border-border bg-surface opacity-50'}`}
            >
              <span className="flex-1 text-sm text-primary">{act.name}</span>
              <span className="text-xs text-gold font-semibold">+{act.points} pts</span>
              <Button size="xs" variant="ghost" onClick={() => startEdit(act)}>Edit</Button>
              <Button size="xs" variant={isActive ? 'ghost' : 'success'} onClick={() => toggleActive(act)}>
                {isActive ? 'Disable' : 'Enable'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function PeriodsTab({ groupId }) {
  const { periodsForGroup, addPeriod, updatePeriod, activatePeriod, deletePeriod } = useApp();

  const [name,  setName]  = useState('');
  const [start, setStart] = useState('');
  const [end,   setEnd]   = useState('');
  const [err,   setErr]   = useState('');

  const periods = periodsForGroup(groupId).sort((a, b) => b.startDate.localeCompare(a.startDate));

  function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim())   { setErr('Name is required.'); return; }
    if (!start || !end) { setErr('Start and end dates are required.'); return; }
    if (start > end)    { setErr('Start date must be before end date.'); return; }
    const overlap = periods.find(p => !(end < p.startDate || start > p.endDate));
    if (overlap)        { setErr(`Overlaps with "${overlap.name}".`); return; }
    addPeriod(groupId, name.trim(), start, end);
    setName(''); setStart(''); setEnd('');
  }

  function toggleAllTime(p) {
    updatePeriod(p.id, { countForAllTime: !p.countForAllTime });
  }

  function handlePrizeText(p, val) {
    updatePeriod(p.id, { prizeText: val });
  }

  if (!groupId) {
    return <EmptyState icon="📅" title="No group selected" />;
  }

  return (
    <div className="space-y-5">
      {/* Add period */}
      <Card>
        <SectionHeading>Add Period</SectionHeading>
        <form onSubmit={handleAdd}>
          <Input
            label="Period Name"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
            placeholder="e.g. Spring Challenge 2025"
          />
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <Input
                label="Start Date"
                type="date"
                value={start}
                onChange={e => { setStart(e.target.value); setErr(''); }}
              />
            </div>
            <div className="flex-1 min-w-32">
              <Input
                label="End Date"
                type="date"
                value={end}
                onChange={e => { setEnd(e.target.value); setErr(''); }}
              />
            </div>
          </div>
          {err && <p className="text-xs text-danger -mt-2 mb-3">{err}</p>}
          <Button type="submit" full>Add Period</Button>
        </form>
      </Card>

      {/* Periods list */}
      <Card>
        <SectionHeading>Periods ({periods.length})</SectionHeading>
        {periods.length === 0 && (
          <EmptyState icon="📅" title="No periods yet" text="Add a period above." />
        )}
        <div className="space-y-4">
          {periods.map(p => (
            <div key={p.id} className={`border rounded-lg p-4 ${p.isActive ? 'border-gold-d bg-[var(--gold-subtle)]' : 'border-border bg-bg-card2'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-primary text-sm">{p.name}</span>
                    {p.isActive && <Badge variant="success">Active</Badge>}
                    {p.countForAllTime && <Badge variant="gold">All-Time</Badge>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {!p.isActive && (
                    <Button size="xs" variant="success" onClick={() => activatePeriod(p.id, groupId)}>
                      Activate
                    </Button>
                  )}
                  {p.isActive && (
                    <Button size="xs" variant="ghost" onClick={() => updatePeriod(p.id, { isActive: false })}>
                      Deactivate
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant={p.countForAllTime ? 'primary' : 'outline'}
                    onClick={() => toggleAllTime(p)}
                    title="Include in All-Time leaderboard"
                  >
                    All-Time
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) deletePeriod(p.id); }}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Prize text */}
              <input
                type="text"
                value={p.prizeText || ''}
                onChange={e => handlePrizeText(p, e.target.value)}
                placeholder="Prize or award text (shown in Hall of Fame)…"
                className="w-full mt-2 bg-bg-card border border-border text-primary rounded-lg px-3 py-1.5 text-xs outline-none focus:border-gold placeholder:text-muted/50"
              />

              {/* Period activities */}
              <PeriodActivityEditor
                period={p}
                onUpdate={acts => updatePeriod(p.id, { activities: acts })}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
