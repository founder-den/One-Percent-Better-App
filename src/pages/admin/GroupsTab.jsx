import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, Button, Input, SectionHeading, EmptyState, Badge } from '../../components/ui.jsx';

export default function GroupsTab({ onGroupCreated }) {
  const { groups, addGroup, updateGroup } = useApp();

  const [name,      setName]      = useState('');
  const [code,      setCode]      = useState('');
  const [err,       setErr]       = useState('');
  const [editId,    setEditId]    = useState(null);
  const [editName,  setEditName]  = useState('');
  const [editCode,  setEditCode]  = useState('');
  const [editErr,   setEditErr]   = useState('');

  function handleAdd(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('Group name is required.'); return; }
    if (!code.trim()) { setErr('Group code is required.'); return; }
    // Check for duplicate code
    const dup = groups.find(g => g.groupCode.toLowerCase() === code.trim().toLowerCase());
    if (dup) { setErr('That group code is already in use.'); return; }
    const newGroup = addGroup(name.trim(), code.trim().toUpperCase());
    setName(''); setCode('');
    onGroupCreated?.(newGroup.id);
  }

  function startEdit(g) {
    setEditId(g.id);
    setEditName(g.name);
    setEditCode(g.groupCode);
    setEditErr('');
  }

  function saveEdit() {
    setEditErr('');
    if (!editName.trim()) { setEditErr('Name required.'); return; }
    if (!editCode.trim()) { setEditErr('Code required.'); return; }
    const dup = groups.find(g => g.id !== editId && g.groupCode.toLowerCase() === editCode.trim().toLowerCase());
    if (dup) { setEditErr('Code already in use.'); return; }
    updateGroup(editId, { name: editName.trim(), groupCode: editCode.trim().toUpperCase() });
    setEditId(null);
  }

  function toggleActive(g) {
    updateGroup(g.id, { isActive: !g.isActive });
  }

  return (
    <div className="space-y-5">
      {/* Add group */}
      <Card>
        <SectionHeading>Add Group</SectionHeading>
        <form onSubmit={handleAdd}>
          <Input
            label="Group Name"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
            placeholder="e.g. College Students Boys"
          />
          <Input
            label="Group Code"
            value={code}
            onChange={e => { setCode(e.target.value); setErr(''); }}
            placeholder="e.g. BOYS2025"
          />
          {err && <p className="text-xs text-danger -mt-2 mb-3">{err}</p>}
          <Button type="submit" full>Create Group</Button>
        </form>
      </Card>

      {/* Groups list */}
      <Card>
        <SectionHeading>Groups ({groups.length})</SectionHeading>
        {groups.length === 0 && (
          <EmptyState icon="👥" title="No groups yet" text="Create a group above." />
        )}
        <div className="space-y-3">
          {groups.map(g => {
            if (editId === g.id) {
              return (
                <div key={g.id} className="border border-gold-d rounded-lg p-3 bg-[var(--gold-subtle)]">
                  <Input label="Name" value={editName} onChange={e => setEditName(e.target.value)} />
                  <Input label="Code" value={editCode} onChange={e => setEditCode(e.target.value)} />
                  {editErr && <p className="text-xs text-danger -mt-2 mb-2">{editErr}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={g.id} className="flex items-center gap-3 py-3 px-4 rounded-lg border border-border bg-bg-card2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{g.name}</p>
                  <p className="text-xs text-muted font-mono">Code: {g.groupCode}</p>
                </div>
                <Badge variant={g.isActive ? 'success' : 'muted'}>{g.isActive ? 'Active' : 'Inactive'}</Badge>
                <Button size="xs" variant="ghost" onClick={() => startEdit(g)}>Edit</Button>
                <Button size="xs" variant={g.isActive ? 'ghost' : 'success'} onClick={() => toggleActive(g)}>
                  {g.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
