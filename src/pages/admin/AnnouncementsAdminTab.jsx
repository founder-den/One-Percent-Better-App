import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import {
  Card, Button, Input, Textarea, SectionHeading, EmptyState, Alert, Modal, Badge,
} from '../../components/ui.jsx';

const BLANK = { title: '', message: '', isPinned: false, isActive: true };

export default function AnnouncementsAdminTab() {
  const { groups, announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState(BLANK);
  const [scopeMode, setScopeMode] = useState('all');
  const [selGroups, setSelGroups] = useState([]);
  const [err,       setErr]       = useState('');

  function openCreate() {
    setForm(BLANK);
    setScopeMode('all');
    setSelGroups([]);
    setEditId(null);
    setErr('');
    setShowModal(true);
  }

  function openEdit(ann) {
    const isAll = !ann.visibleToGroups || ann.visibleToGroups.length === 0;
    setForm({ title: ann.title, message: ann.message || '', isPinned: ann.isPinned ?? false, isActive: ann.isActive ?? true });
    setScopeMode(isAll ? 'all' : 'specific');
    setSelGroups(isAll ? [] : ann.visibleToGroups);
    setEditId(ann.id);
    setErr('');
    setShowModal(true);
  }

  function save() {
    setErr('');
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    if (scopeMode === 'specific' && selGroups.length === 0) { setErr('Select at least one group.'); return; }
    const visibleToGroups = scopeMode === 'all' ? [] : selGroups;
    const fields = { title: form.title.trim(), message: form.message.trim(), visibleToGroups, isPinned: form.isPinned, isActive: form.isActive };
    if (editId) {
      updateAnnouncement(editId, fields);
    } else {
      addAnnouncement(fields);
    }
    setShowModal(false);
  }

  function toggleGroup(id) {
    setSelGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function scopeLabel(ann) {
    if (!ann.visibleToGroups || ann.visibleToGroups.length === 0) return 'All groups';
    return ann.visibleToGroups.map(id => groups.find(g => g.id === id)?.name || id).join(', ');
  }

  const sorted = [...announcements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <SectionHeading>Announcements</SectionHeading>
        <Button size="sm" onClick={openCreate}>+ Create</Button>
      </div>

      {sorted.length === 0 && (
        <EmptyState icon="📢" title="No announcements yet" text="Create one to show on the student Home page." />
      )}

      {sorted.map(ann => (
        <Card key={ann.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-semibold text-primary">{ann.title}</p>
                {ann.isPinned  && <Badge variant="gold">Pinned</Badge>}
                {ann.isActive  ? <Badge variant="gold">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
              </div>
              {ann.message && <p className="text-xs text-muted whitespace-pre-wrap mb-1">{ann.message}</p>}
              <p className="text-xs text-muted">Visible to: {scopeLabel(ann)}</p>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              <Button size="xs" variant="ghost" onClick={() => openEdit(ann)}>Edit</Button>
              <Button size="xs" variant="ghost" onClick={() => updateAnnouncement(ann.id, { isActive: !ann.isActive })}>
                {ann.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button size="xs" variant="danger"
                onClick={() => { if (window.confirm(`Delete "${ann.title}"?`)) deleteAnnouncement(ann.id); }}>
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Announcement' : 'Create Announcement'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>{editId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        {err && <Alert type="error">{err}</Alert>}
        <Input
          label="Title *"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Announcement title"
        />
        <Textarea
          label="Message (optional)"
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Announcement details…"
          rows={3}
        />

        {/* Visible to groups */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Visible To</label>
          <div className="flex gap-3 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
              <input type="radio" checked={scopeMode === 'all'} onChange={() => setScopeMode('all')} className="accent-gold" />
              All groups
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
              <input type="radio" checked={scopeMode === 'specific'} onChange={() => setScopeMode('specific')} className="accent-gold" />
              Specific groups
            </label>
          </div>
          {scopeMode === 'specific' && (
            <div className="space-y-1.5 pl-1">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                  <input type="checkbox" checked={selGroups.includes(g.id)} onChange={() => toggleGroup(g.id)} className="accent-gold" />
                  {g.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} className="accent-gold" />
          <span className="text-sm text-primary">Pin to top</span>
        </label>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-gold" />
          <span className="text-sm text-primary">Active (visible to students)</span>
        </label>
      </Modal>
    </div>
  );
}
