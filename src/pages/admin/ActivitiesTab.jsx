import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, Button, Input, SectionHeading, EmptyState, Badge } from '../../components/ui.jsx';

export default function ActivitiesTab({ groupId }) {
  const { activitiesForGroup, addActivity, updateActivity } = useApp();

  const [name,   setName]   = useState('');
  const [points, setPoints] = useState('');
  const [err,    setErr]    = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName]   = useState('');
  const [editPts,  setEditPts]    = useState('');
  const [editErr,  setEditErr]    = useState('');

  const activities = activitiesForGroup(groupId);

  function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim())            { setErr('Name is required.'); return; }
    const pts = parseInt(points);
    if (isNaN(pts) || pts <= 0) { setErr('Points must be a positive number.'); return; }
    addActivity(groupId, name.trim(), pts);
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
    if (!editName.trim())              { setEditErr('Name is required.'); return; }
    const pts = parseInt(editPts);
    if (isNaN(pts) || pts <= 0)       { setEditErr('Points must be a positive number.'); return; }
    updateActivity(editId, { name: editName.trim(), points: pts });
    setEditId(null);
  }

  function toggleActive(act) {
    updateActivity(act.id, { isActive: !(act.isActive ?? act.active ?? true) });
  }

  if (!groupId) {
    return <EmptyState icon="📋" title="No group selected" />;
  }

  return (
    <div className="space-y-5">
      {/* Add activity */}
      <Card>
        <SectionHeading>Add Activity</SectionHeading>
        <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-40">
            <Input
              label="Activity Name"
              value={name}
              onChange={e => { setName(e.target.value); setErr(''); }}
              placeholder="e.g. Reading Book"
            />
          </div>
          <div className="w-28">
            <Input
              label="Points"
              type="number"
              value={points}
              onChange={e => { setPoints(e.target.value); setErr(''); }}
              placeholder="10"
              min="1"
            />
          </div>
          <Button type="submit" className="mb-4">Add</Button>
        </form>
        {err && <p className="text-xs text-danger -mt-2">{err}</p>}
      </Card>

      {/* Activities list */}
      <Card>
        <SectionHeading>Activities ({activities.length})</SectionHeading>
        {activities.length === 0 && (
          <EmptyState icon="📋" title="No activities" text="Add activities above." />
        )}
        <div className="space-y-2">
          {activities.map(act => {
            const isActive = act.isActive ?? act.active ?? true;

            if (editId === act.id) {
              return (
                <div key={act.id} className="border border-gold-d rounded-lg p-3 bg-[var(--gold-subtle)]">
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-32">
                      <Input
                        label="Name"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        label="Points"
                        type="number"
                        value={editPts}
                        onChange={e => setEditPts(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div className="flex gap-2 mb-4">
                      <Button size="sm" onClick={saveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  </div>
                  {editErr && <p className="text-xs text-danger -mt-2">{editErr}</p>}
                </div>
              );
            }

            return (
              <div
                key={act.id}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg border transition-all
                  ${isActive ? 'border-border bg-bg-card2' : 'border-border bg-surface opacity-50'}
                `}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-primary">{act.name}</span>
                  <span className="ml-2 text-xs text-gold font-semibold">+{act.points} pts</span>
                </div>
                <Badge variant={isActive ? 'success' : 'muted'}>{isActive ? 'Active' : 'Inactive'}</Badge>
                <Button size="xs" variant="ghost"   onClick={() => startEdit(act)}>Edit</Button>
                <Button size="xs" variant={isActive ? 'ghost' : 'success'} onClick={() => toggleActive(act)}>
                  {isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
