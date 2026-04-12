import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, Button, Input, SectionHeading, EmptyState, Badge } from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';

export default function PeriodsTab({ groupId }) {
  const { periodsForGroup, addPeriod, updatePeriod, activatePeriod, deletePeriod } = useApp();

  const [name,  setName]  = useState('');
  const [start, setStart] = useState('');
  const [end,   setEnd]   = useState('');
  const [err,   setErr]   = useState('');

  const periods = periodsForGroup(groupId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const activePeriod = periods.find(p => p.isActive);

  function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim())   { setErr('Name is required.'); return; }
    if (!start || !end) { setErr('Start and end dates are required.'); return; }
    if (start > end)    { setErr('Start date must be before end date.'); return; }
    // Check overlap with existing periods
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
                    <Button
                      size="xs"
                      variant="success"
                      onClick={() => activatePeriod(p.id, groupId)}
                    >
                      Activate
                    </Button>
                  )}
                  {p.isActive && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => updatePeriod(p.id, { isActive: false })}
                    >
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
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
