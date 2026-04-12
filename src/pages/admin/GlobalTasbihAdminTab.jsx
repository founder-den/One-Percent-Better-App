import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Card, Button, Input, Textarea, SectionHeading, EmptyState, Alert, Modal, Badge,
} from '../../components/ui.jsx';

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

const BLANK_FORM = { title: '', description: '', target: '', groupScope: 'all' };

export default function GlobalTasbihAdminTab() {
  const { groups, globalTasbihs, addGlobalTasbih, updateGlobalTasbih, resetGlobalTasbih } = useApp();

  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null); // null = create, id = edit
  const [form,      setForm]      = useState(BLANK_FORM);
  const [formErr,   setFormErr]   = useState('');
  const [scopeMode, setScopeMode] = useState('all'); // 'all' | 'specific'
  const [selGroups, setSelGroups] = useState([]);

  // ── Open create ──────────────────────────────────────────────────
  function openCreate() {
    setForm(BLANK_FORM);
    setScopeMode('all');
    setSelGroups([]);
    setEditId(null);
    setFormErr('');
    setShowForm(true);
  }

  // ── Open edit ────────────────────────────────────────────────────
  function openEdit(t) {
    const isAll = t.groupScope === 'all';
    setForm({
      title:       t.title,
      description: t.description || '',
      target:      String(t.target),
      groupScope:  isAll ? 'all' : 'specific',
    });
    setScopeMode(isAll ? 'all' : 'specific');
    setSelGroups(isAll ? [] : (Array.isArray(t.groupScope) ? t.groupScope : []));
    setEditId(t.id);
    setFormErr('');
    setShowForm(true);
  }

  // ── Save ─────────────────────────────────────────────────────────
  function save() {
    setFormErr('');
    if (!form.title.trim())             { setFormErr('Title is required.'); return; }
    const target = parseInt(form.target);
    if (isNaN(target) || target < 1)   { setFormErr('Target must be a positive number.'); return; }
    if (scopeMode === 'specific' && selGroups.length === 0) {
      setFormErr('Select at least one group.'); return;
    }
    const groupScope = scopeMode === 'all' ? 'all' : selGroups;

    if (editId) {
      updateGlobalTasbih(editId, {
        title:       form.title.trim(),
        description: form.description.trim(),
        target,
        groupScope,
      });
    } else {
      addGlobalTasbih({
        title:       form.title.trim(),
        description: form.description.trim(),
        target,
        groupScope,
      });
    }
    setShowForm(false);
  }

  function toggleGroup(id) {
    setSelGroups(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // Partition: active first, then inactive
  const active   = globalTasbihs.filter(t => t.isActive);
  const inactive = globalTasbihs.filter(t => !t.isActive);

  function scopeLabel(t) {
    if (t.groupScope === 'all') return 'All groups';
    if (Array.isArray(t.groupScope)) {
      return t.groupScope
        .map(id => groups.find(g => g.id === id)?.name || id)
        .join(', ');
    }
    return String(t.groupScope);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <SectionHeading>Global Tasbihs</SectionHeading>
        <Button size="sm" onClick={openCreate}>+ Create</Button>
      </div>

      {/* Active tasbihs */}
      {active.length === 0 && inactive.length === 0 && (
        <EmptyState icon="📿" title="No global tasbihs yet" text="Create one to share with students." />
      )}

      {active.map(t => {
        const pct = t.target > 0 ? Math.min(100, Math.round((t.current / t.target) * 100)) : 0;
        return (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-primary">{t.title}</p>
                  <Badge variant="gold">Active</Badge>
                </div>
                {t.description && <p className="text-xs text-muted whitespace-pre-wrap">{t.description}</p>}
                <p className="text-xs text-muted mt-1">Scope: {scopeLabel(t)}</p>
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <Button size="xs" variant="ghost" onClick={() => openEdit(t)}>Edit</Button>
                <Button size="xs" variant="ghost" onClick={() => resetGlobalTasbih(t.id)}>Reset</Button>
                <Button size="xs" variant="danger" onClick={() => updateGlobalTasbih(t.id, { isActive: false })}>Deactivate</Button>
              </div>
            </div>

            <ProgressBar value={t.current} max={t.target} />
            <div className="flex items-center justify-between text-xs text-muted mt-1">
              <span>{t.current.toLocaleString()} / {t.target.toLocaleString()} ({pct}%)</span>
              {t.completedTimes > 0 && (
                <span className="text-gold font-semibold">Completed {t.completedTimes}×</span>
              )}
            </div>
          </Card>
        );
      })}

      {/* Inactive tasbihs */}
      {inactive.length > 0 && (
        <Card>
          <SectionHeading>Inactive</SectionHeading>
          <div className="space-y-3">
            {inactive.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted line-through">{t.title}</p>
                  <p className="text-xs text-muted">
                    Completed {t.completedTimes}× · {t.current}/{t.target} remaining
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="xs" variant="ghost" onClick={() => openEdit(t)}>Edit</Button>
                  <Button size="xs" variant="success" onClick={() => updateGlobalTasbih(t.id, { isActive: true })}>
                    Activate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Edit Global Tasbih' : 'Create Global Tasbih'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        {formErr && <Alert type="error">{formErr}</Alert>}
        <Input
          label="Title *"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Ramadan Tasbih"
        />
        <Textarea
          label="Description (optional)"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief description (supports multiple lines)"
          rows={3}
        />
        <Input
          label="Target (total count) *"
          type="number"
          value={form.target}
          onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
          placeholder="e.g. 1000"
          min={1}
        />

        {/* Group scope */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Visible To</label>
          <div className="flex gap-3 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
              <input
                type="radio"
                checked={scopeMode === 'all'}
                onChange={() => setScopeMode('all')}
                className="accent-gold"
              />
              All groups
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
              <input
                type="radio"
                checked={scopeMode === 'specific'}
                onChange={() => setScopeMode('specific')}
                className="accent-gold"
              />
              Specific groups
            </label>
          </div>
          {scopeMode === 'specific' && (
            <div className="space-y-1.5 pl-1">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                  <input
                    type="checkbox"
                    checked={selGroups.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="accent-gold"
                  />
                  {g.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
