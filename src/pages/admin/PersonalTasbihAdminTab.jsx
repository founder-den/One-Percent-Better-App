import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Card, Button, Input, Textarea, SectionHeading, EmptyState, Alert, Modal, Badge,
} from '../../components/ui.jsx';

const BLANK_FORM = { title: '', description: '', target: '', groupScope: 'all', resetType: 'none' };

export default function PersonalTasbihAdminTab() {
  const {
    groups,
    personalTasbihTemplates,
    addPersonalTasbihTemplate,
    updatePersonalTasbihTemplate,
    deletePersonalTasbihTemplate,
  } = useApp();

  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(BLANK_FORM);
  const [formErr,   setFormErr]   = useState('');
  const [scopeMode, setScopeMode] = useState('all');
  const [selGroups, setSelGroups] = useState([]);

  function openCreate() {
    setForm(BLANK_FORM);
    setScopeMode('all');
    setSelGroups([]);
    setEditId(null);
    setFormErr('');
    setShowForm(true);
  }

  function openEdit(t) {
    const isAll = t.groupScope === 'all';
    setForm({
      title:       t.title,
      description: t.description || '',
      target:      String(t.target),
      resetType:   t.resetType   || 'none',
    });
    setScopeMode(isAll ? 'all' : 'specific');
    setSelGroups(isAll ? [] : (Array.isArray(t.groupScope) ? t.groupScope : []));
    setEditId(t.id);
    setFormErr('');
    setShowForm(true);
  }

  function save() {
    setFormErr('');
    if (!form.title.trim())           { setFormErr('Title is required.'); return; }
    const target = parseInt(form.target);
    if (isNaN(target) || target < 1)  { setFormErr('Target must be a positive number.'); return; }
    if (scopeMode === 'specific' && selGroups.length === 0) {
      setFormErr('Select at least one group.'); return;
    }
    const groupScope = scopeMode === 'all' ? 'all' : selGroups;

    if (editId) {
      updatePersonalTasbihTemplate(editId, {
        title:       form.title.trim(),
        description: form.description.trim(),
        target,
        groupScope,
        resetType:   form.resetType,
      });
    } else {
      addPersonalTasbihTemplate({
        title:       form.title.trim(),
        description: form.description.trim(),
        target,
        groupScope,
        resetType:   form.resetType,
      });
    }
    setShowForm(false);
  }

  function toggleGroup(id) {
    setSelGroups(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function scopeLabel(t) {
    if (t.groupScope === 'all') return 'All groups';
    if (Array.isArray(t.groupScope)) {
      return t.groupScope
        .map(id => groups.find(g => g.id === id)?.name || id)
        .join(', ');
    }
    return String(t.groupScope);
  }

  const active   = personalTasbihTemplates.filter(t => t.isActive);
  const inactive = personalTasbihTemplates.filter(t => !t.isActive);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <SectionHeading>Personal Tasbih Goals</SectionHeading>
        <Button size="sm" onClick={openCreate}>+ Create</Button>
      </div>

      <p className="text-xs text-muted -mt-3">
        Create named tasbih goals that students see as personal targets on their Tasbih tab. Each student tracks their own count toward the goal.
      </p>

      {active.length === 0 && inactive.length === 0 && (
        <EmptyState icon="📿" title="No personal tasbih goals yet" text="Create one to give students a personal tasbih target." />
      )}

      {active.map(t => (
        <Card key={t.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-primary">{t.title}</p>
                <Badge variant="gold">Active</Badge>
              </div>
              {t.description && <p className="text-xs text-muted whitespace-pre-wrap">{t.description}</p>}
              <p className="text-xs text-muted mt-1">
                Target: {t.target.toLocaleString()} · Scope: {scopeLabel(t)}
                {t.resetType && t.resetType !== 'none' && (
                  <span className="ml-2 text-gold">· Resets {t.resetType}</span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              <Button size="xs" variant="ghost"  onClick={() => openEdit(t)}>Edit</Button>
              <Button size="xs" variant="danger"  onClick={() => updatePersonalTasbihTemplate(t.id, { isActive: false })}>Deactivate</Button>
              <Button size="xs" variant="ghost"   onClick={() => { if (window.confirm('Delete this template?')) deletePersonalTasbihTemplate(t.id); }}>Delete</Button>
            </div>
          </div>
        </Card>
      ))}

      {inactive.length > 0 && (
        <Card>
          <SectionHeading>Inactive</SectionHeading>
          <div className="space-y-3">
            {inactive.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted line-through">{t.title}</p>
                  <p className="text-xs text-muted">Target: {t.target}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="xs" variant="ghost"   onClick={() => openEdit(t)}>Edit</Button>
                  <Button size="xs" variant="success"  onClick={() => updatePersonalTasbihTemplate(t.id, { isActive: true })}>Activate</Button>
                  <Button size="xs" variant="danger"   onClick={() => { if (window.confirm('Delete this template?')) deletePersonalTasbihTemplate(t.id); }}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Edit Personal Tasbih Goal' : 'Create Personal Tasbih Goal'}
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
          placeholder="e.g. Say Subhanallah 200 times"
        />
        <Textarea
          label="Description (optional)"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief description"
          rows={2}
        />
        <Input
          label="Target count *"
          type="number"
          value={form.target}
          onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
          placeholder="e.g. 200"
          min={1}
        />

        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Auto Reset</label>
          <select
            value={form.resetType}
            onChange={e => setForm(f => ({ ...f, resetType: e.target.value }))}
            className="w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold"
          >
            <option value="none">None — never resets</option>
            <option value="daily">Daily — resets every midnight</option>
            <option value="weekly">Weekly — resets every Monday</option>
          </select>
        </div>

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
