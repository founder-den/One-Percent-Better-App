import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Button, Input, Textarea, SectionHeading, EmptyState, Alert, Modal, confirm,
} from '../../components/ui.jsx';
import ChallengeDetailView from './ChallengeDetailView.jsx';

// ─── Activity row editor (challenge-specific activities) ──────────
function ActivityRow({ act, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={act.name}
        onChange={e => onChange({ ...act, name: e.target.value })}
        placeholder="Activity name"
        className="flex-1 bg-bg-card2 border border-border rounded-lg px-3 py-1.5 text-sm text-primary outline-none focus:border-gold"
      />
      <input
        type="number"
        min="1"
        value={act.points}
        onChange={e => onChange({ ...act, points: Number(e.target.value) })}
        placeholder="Pts"
        className="w-20 bg-bg-card2 border border-border rounded-lg px-3 py-1.5 text-sm text-primary outline-none focus:border-gold"
      />
      <button
        onClick={onDelete}
        className="text-danger text-sm px-2 hover:opacity-70 transition-opacity"
      >✕</button>
    </div>
  );
}

// ─── Challenge form (create / edit) ──────────────────────────────
function ChallengeForm({ initial, groups, onSave, onCancel, saving, saveErr }) {
  const [name,           setName]          = useState(initial?.name           || '');
  const [description,    setDescription]   = useState(initial?.description    || '');
  const [startDate,      setStartDate]     = useState(initial?.startDate      || '');
  const [endDate,        setEndDate]       = useState(initial?.endDate        || '');
  const [isPrivate,      setIsPrivate]     = useState(initial?.isPrivate      ?? false);
  const [code,           setCode]          = useState(initial?.code           || '');
  const [isVisible,      setIsVisible]     = useState(initial?.isVisible      ?? false);
  const [visGroups,      setVisGroups]     = useState(initial?.visibleToGroups || []);
  const [activities,     setActivities]    = useState(initial?.activities     || []);

  function toggleVisGroup(gid) {
    setVisGroups(v => v.includes(gid) ? v.filter(x => x !== gid) : [...v, gid]);
  }

  function addActivity() {
    setActivities(a => [...a, { id: `act_${Date.now()}`, name: '', points: 10 }]);
  }

  function submit() {
    if (!name.trim()) return;
    onSave({
      name:            name.trim(),
      description:     description.trim(),
      startDate,
      endDate,
      isPrivate,
      code:            isPrivate ? code.trim() || null : null,
      isVisible,
      visibleToGroups: isVisible ? visGroups : [],
      activities,
    });
  }

  return (
    <div className="space-y-4">
      <Alert type="error">{saveErr}</Alert>

      <Input
        label="Challenge Name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="e.g. Ramadan Sprint"
      />

      <Textarea
        label="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Optional description…"
        rows={2}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <Input label="End Date"   type="date" value={endDate}   onChange={e => setEndDate(e.target.value)} />
      </div>

      {/* Private toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-primary">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="accent-gold"
          />
          Code required to join (private)
        </label>
        {isPrivate && (
          <div className="mt-2">
            <Input
              label="Join Code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. RAMADAN2025"
            />
          </div>
        )}
      </div>

      {/* Visibility toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-primary">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={e => setIsVisible(e.target.checked)}
            className="accent-gold"
          />
          Visible in announcements
        </label>
        {isVisible && groups.length > 0 && (
          <div className="mt-2 space-y-1.5 pl-1">
            <p className="text-xs text-muted mb-1">Visible to these groups:</p>
            {groups.map(g => (
              <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                <input
                  type="checkbox"
                  checked={visGroups.includes(g.id)}
                  onChange={() => toggleVisGroup(g.id)}
                  className="accent-gold"
                />
                {g.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Activities */}
      <div>
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
          Challenge Activities
        </p>
        <div className="space-y-2 mb-2">
          {activities.map((act, i) => (
            <ActivityRow
              key={act.id || i}
              act={act}
              onChange={updated => setActivities(a => a.map((x, j) => j === i ? updated : x))}
              onDelete={() => setActivities(a => a.filter((_, j) => j !== i))}
            />
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={addActivity}>+ Add Activity</Button>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={submit} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save Challenge'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Members modal ────────────────────────────────────────────────
function MembersModal({ open, onClose, challenge, students, memberships }) {
  const members = memberships
    .filter(m => m.challengeId === challenge?.id)
    .map(m => students.find(s => s.id === m.studentId))
    .filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title={`Members — ${challenge?.name || ''}`}>
      {members.length === 0 ? (
        <p className="text-muted text-sm">No one has joined yet.</p>
      ) : (
        <ul className="space-y-2">
          {members.map(s => (
            <li key={s.id} className="flex items-center gap-2 text-sm text-primary">
              <span className="w-7 h-7 rounded-full bg-bg-card2 border border-border flex items-center justify-center text-xs font-bold text-muted">
                {(s.fullName || s.username || '?')[0].toUpperCase()}
              </span>
              <span>{s.fullName || s.username}</span>
              <span className="text-muted text-xs">@{s.username}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────
export default function AdminChallengeMgmtTab() {
  const {
    challenges, challengeMemberships,
    addChallenge, updateChallenge, deleteChallenge,
    groups, students,
  } = useApp();

  const [creating,     setCreating]     = useState(false);
  const [editing,      setEditing]      = useState(null); // challenge object
  const [viewMembers,  setViewMembers]  = useState(null); // challenge object
  const [detailId,     setDetailId]     = useState(null); // challenge id for detail view
  const [saving,       setSaving]       = useState(false);
  const [saveErr,      setSaveErr]      = useState('');

  async function handleCreate(fields) {
    setSaving(true); setSaveErr('');
    const ok = await addChallenge(fields);
    setSaving(false);
    if (!ok) { setSaveErr('Failed to create challenge. Please try again.'); return; }
    setCreating(false);
  }

  async function handleEdit(fields) {
    setSaving(true); setSaveErr('');
    await updateChallenge(editing.id, fields);
    setSaving(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this challenge? Members will be removed.')) return;
    await deleteChallenge(id);
  }

  async function handleToggleActive(c) {
    await updateChallenge(c.id, { isActive: !c.isActive });
  }

  // ── Detail view ──
  if (detailId) {
    return (
      <ChallengeDetailView
        challengeId={detailId}
        onBack={() => setDetailId(null)}
      />
    );
  }

  // ── Create form ──
  if (creating) {
    return (
      <div className="mt-6 max-w-lg">
        <SectionHeading>Create Challenge</SectionHeading>
        <ChallengeForm
          groups={groups}
          onSave={handleCreate}
          onCancel={() => { setCreating(false); setSaveErr(''); }}
          saving={saving}
          saveErr={saveErr}
        />
      </div>
    );
  }

  // ── Edit form ──
  if (editing) {
    return (
      <div className="mt-6 max-w-lg">
        <SectionHeading>Edit Challenge</SectionHeading>
        <ChallengeForm
          initial={editing}
          groups={groups}
          onSave={handleEdit}
          onCancel={() => { setEditing(null); setSaveErr(''); }}
          saving={saving}
          saveErr={saveErr}
        />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <SectionHeading>Challenges</SectionHeading>
        <Button size="sm" onClick={() => setCreating(true)}>+ Create Challenge</Button>
      </div>

      {challenges.length === 0 ? (
        <EmptyState icon="🏆" title="No challenges yet" text="Create your first challenge above." />
      ) : (
        <div className="space-y-3">
          {challenges.map(c => {
            const memberCount = challengeMemberships.filter(m => m.challengeId === c.id).length;
            return (
              <div key={c.id} className="bg-bg-card border border-border rounded-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setDetailId(c.id)}
                        className="font-medium text-primary text-sm hover:text-gold transition-colors text-left"
                      >{c.name}</button>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-green-500/15 text-green-400' : 'bg-border text-muted'}`}>
                        {c.isActive ? 'Active' : 'Ended'}
                      </span>
                      {c.isPrivate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-card2 text-muted">Private</span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-muted text-xs mt-0.5 line-clamp-1">{c.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      {c.startDate && <span>From {c.startDate}</span>}
                      {c.endDate   && <span>To {c.endDate}</span>}
                      {c.code      && <span>Code: <span className="font-mono text-primary">{c.code}</span></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setDetailId(c.id)}
                      className="text-xs text-gold font-medium hover:opacity-70 transition-opacity"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => setViewMembers(c)}
                      className="text-xs text-muted hover:text-primary transition-colors"
                    >
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={() => handleToggleActive(c)}
                      className="text-xs text-muted hover:text-primary transition-colors"
                    >
                      {c.isActive ? 'End' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => setEditing(c)}
                      className="text-xs text-muted hover:text-primary transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-danger hover:opacity-70 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MembersModal
        open={!!viewMembers}
        onClose={() => setViewMembers(null)}
        challenge={viewMembers}
        students={students}
        memberships={challengeMemberships}
      />
    </div>
  );
}
