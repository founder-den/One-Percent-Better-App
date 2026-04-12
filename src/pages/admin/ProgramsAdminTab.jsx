import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Card, Button, Input, Textarea, SectionHeading, EmptyState, Alert, Modal, Badge,
} from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';

// ─── Progress bar (local) ─────────────────────────────────────────
function ProgressBar({ value, max, className = '' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`w-full bg-surface rounded-full h-2 overflow-hidden ${className}`}>
      <div className="h-2 rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Task type badge ──────────────────────────────────────────────
function TypeBadge({ type }) {
  return type === 'tasbih'
    ? <Badge variant="gold">📿 Tasbih</Badge>
    : <Badge variant="muted">☑ To-do</Badge>;
}

// ─── Scope selector (reusable) ───────────────────────────────────
function ScopeSelector({ groups, scopeMode, selGroups, onScopeMode, onToggleGroup }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Visible To</label>
      <div className="flex gap-3 mb-2">
        <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
          <input type="radio" checked={scopeMode === 'all'} onChange={() => onScopeMode('all')} className="accent-gold" />
          All groups
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
          <input type="radio" checked={scopeMode === 'specific'} onChange={() => onScopeMode('specific')} className="accent-gold" />
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
                onChange={() => onToggleGroup(g.id)}
                className="accent-gold"
              />
              {g.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task editor row ──────────────────────────────────────────────
function TaskRow({ task, onEdit, onDelete, onMove, isFirst, isLast }) {
  const isCollective = task.type === 'tasbih' && task.mode === 'collective';
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-0">
      <TypeBadge type={task.type} />
      {isCollective && <Badge variant="muted">Shared</Badge>}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary truncate">{task.description}</p>
        {task.type === 'tasbih' && (
          <p className="text-xs text-muted">Target: {task.target}{isCollective ? ' (collective)' : ' (individual)'}</p>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {!isFirst && <Button size="xs" variant="ghost" onClick={() => onMove(task.id, -1)}>↑</Button>}
        {!isLast  && <Button size="xs" variant="ghost" onClick={() => onMove(task.id, 1)}>↓</Button>}
        <Button size="xs" variant="ghost" onClick={() => onEdit(task)}>Edit</Button>
        <Button size="xs" variant="danger" onClick={() => onDelete(task.id)}>✕</Button>
      </div>
    </div>
  );
}

// ─── Completion view per program ──────────────────────────────────
function CompletionView({ program, groups, students }) {
  const { getCollectiveTaskCount } = useApp();
  const [filterGroupId, setFilterGroupId] = useState('all');

  const relevantStudents = students
    .filter(s => (s.status || 'active') === 'active')
    .filter(s => {
      if (program.groupScope === 'all') return true;
      return Array.isArray(program.groupScope) && program.groupScope.includes(s.groupId);
    })
    .filter(s => filterGroupId === 'all' || s.groupId === filterGroupId);

  const sortedTasks = [...(program.tasks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (sortedTasks.length === 0) {
    return <p className="text-xs text-muted py-2">No tasks in this program.</p>;
  }
  if (relevantStudents.length === 0) {
    return <p className="text-xs text-muted py-2">No students match this filter.</p>;
  }

  return (
    <div>
      {/* Group filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted">Filter:</span>
        <select
          value={filterGroupId}
          onChange={e => setFilterGroupId(e.target.value)}
          className="bg-bg-card2 border border-border text-primary rounded-lg px-2 py-1 text-xs outline-none focus:border-gold"
        >
          <option value="all">All groups</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Per-task breakdown */}
      <div className="space-y-5">
        {sortedTasks.map(task => {
          const isCollective = task.type === 'tasbih' && task.mode === 'collective';
          const collectiveData = isCollective ? getCollectiveTaskCount(task.id) : null;
          const target = task.target || 100;

          return (
            <div key={task.id}>
              {/* Task header */}
              <div className="flex items-center gap-2 mb-2">
                <TypeBadge type={task.type} />
                {isCollective && <Badge variant="muted">Shared</Badge>}
                <p className="text-xs text-muted flex-1 truncate">{task.description}</p>
              </div>

              {isCollective ? (
                /* Collective task: show shared progress */
                <div className="pl-2">
                  <ProgressBar value={collectiveData.count} max={target} className="mb-1" />
                  <p className="text-xs text-muted">
                    {collectiveData.count.toLocaleString()} / {target.toLocaleString()}
                    {collectiveData.completedTimes > 0 && (
                      <span className="text-gold font-semibold ml-1">
                        · Completed {collectiveData.completedTimes}×
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                /* Individual task: show per-student status */
                <div className="space-y-1 pl-2">
                  {relevantStudents.map(s => {
                    const comp = (s.programCompletions || []).find(
                      c => c.programId === program.id && c.taskId === task.id
                    );
                    const group = groups.find(g => g.id === s.groupId);

                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-primary truncate">{s.fullName}</span>
                          {group && (
                            <span className="text-muted/60 flex-shrink-0">· {group.name}</span>
                          )}
                        </div>
                        {task.type === 'todo' ? (
                          <span className={comp?.isDone ? 'text-ok font-semibold' : 'text-muted'}>
                            {comp?.isDone ? '✓ Done' : '–'}
                          </span>
                        ) : (
                          <span className={comp?.isDone ? 'text-ok font-semibold' : 'text-muted'}>
                            {comp?.count || 0}/{target}
                            {comp?.isDone ? ' ✓' : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BLANK_PROG = { name: '', description: '', date: '', isActive: true };
const BLANK_TASK = { description: '', type: 'todo', target: '100', mode: 'individual' };

export default function ProgramsAdminTab() {
  const {
    groups, students, programs, programsLabel,
    addProgram, updateProgram, deleteProgram, setProgramsLabel,
  } = useApp();

  // Programs label
  const [labelEdit, setLabelEdit] = useState(programsLabel);
  const [labelSaved, setLabelSaved] = useState(false);

  function saveLabel() {
    if (!labelEdit.trim()) return;
    setProgramsLabel(labelEdit.trim());
    setLabelSaved(true);
    setTimeout(() => setLabelSaved(false), 2000);
  }

  // Program form modal
  const [showProgModal, setShowProgModal] = useState(false);
  const [editProgId, setEditProgId]       = useState(null);
  const [progForm, setProgForm]           = useState(BLANK_PROG);
  const [progScopeMode, setProgScopeMode] = useState('all');
  const [progSelGroups, setProgSelGroups] = useState([]);
  const [progErr, setProgErr]             = useState('');

  // Task form modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForProg, setTaskForProg]     = useState(null);
  const [editTaskId, setEditTaskId]       = useState(null);
  const [taskForm, setTaskForm]           = useState(BLANK_TASK);
  const [taskErr, setTaskErr]             = useState('');

  // Completion view toggle per program
  const [expandedComps, setExpandedComps] = useState({});
  function toggleComp(progId) {
    setExpandedComps(prev => ({ ...prev, [progId]: !prev[progId] }));
  }

  // ── Program CRUD ─────────────────────────────────────────────────
  function openCreateProg() {
    setProgForm(BLANK_PROG);
    setProgScopeMode('all');
    setProgSelGroups([]);
    setEditProgId(null);
    setProgErr('');
    setShowProgModal(true);
  }

  function openEditProg(prog) {
    const isAll = prog.groupScope === 'all';
    setProgForm({
      name:        prog.name,
      description: prog.description || '',
      date:        prog.date || '',
      isActive:    prog.isActive !== false,
    });
    setProgScopeMode(isAll ? 'all' : 'specific');
    setProgSelGroups(isAll ? [] : (Array.isArray(prog.groupScope) ? prog.groupScope : []));
    setEditProgId(prog.id);
    setProgErr('');
    setShowProgModal(true);
  }

  function saveProg() {
    setProgErr('');
    if (!progForm.name.trim()) { setProgErr('Name is required.'); return; }
    if (progScopeMode === 'specific' && progSelGroups.length === 0) {
      setProgErr('Select at least one group.'); return;
    }
    const groupScope = progScopeMode === 'all' ? 'all' : progSelGroups;
    if (editProgId) {
      updateProgram(editProgId, {
        name:        progForm.name.trim(),
        description: progForm.description.trim(),
        date:        progForm.date,
        isActive:    progForm.isActive,
        groupScope,
      });
    } else {
      addProgram({
        name:        progForm.name.trim(),
        description: progForm.description.trim(),
        date:        progForm.date,
        isActive:    progForm.isActive,
        groupScope,
      });
    }
    setShowProgModal(false);
  }

  function toggleProgScope(id) {
    setProgSelGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // ── Task CRUD ────────────────────────────────────────────────────
  function openAddTask(progId) {
    setTaskForProg(progId);
    setEditTaskId(null);
    setTaskForm(BLANK_TASK);
    setTaskErr('');
    setShowTaskModal(true);
  }

  function openEditTask(progId, task) {
    setTaskForProg(progId);
    setEditTaskId(task.id);
    setTaskForm({
      description: task.description,
      type:        task.type,
      target:      String(task.target || 100),
      mode:        task.mode || 'individual',
    });
    setTaskErr('');
    setShowTaskModal(true);
  }

  function saveTask() {
    setTaskErr('');
    if (!taskForm.description.trim()) { setTaskErr('Description is required.'); return; }
    const target = parseInt(taskForm.target);
    if (taskForm.type === 'tasbih' && (isNaN(target) || target < 1)) {
      setTaskErr('Target must be a positive number.'); return;
    }

    const prog = programs.find(p => p.id === taskForProg);
    if (!prog) return;

    const taskMode = taskForm.type === 'tasbih' ? taskForm.mode : 'individual';

    let newTasks;
    if (editTaskId) {
      newTasks = (prog.tasks || []).map(t =>
        t.id === editTaskId
          ? {
              ...t,
              description: taskForm.description.trim(),
              type:        taskForm.type,
              target:      taskForm.type === 'tasbih' ? target : undefined,
              mode:        taskMode,
            }
          : t
      );
    } else {
      const newTask = {
        id:          `task_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        type:        taskForm.type,
        description: taskForm.description.trim(),
        target:      taskForm.type === 'tasbih' ? target : undefined,
        mode:        taskMode,
        order:       (prog.tasks || []).length,
      };
      newTasks = [...(prog.tasks || []), newTask];
    }

    updateProgram(taskForProg, { tasks: newTasks });
    setShowTaskModal(false);
  }

  function deleteTask(progId, taskId) {
    if (!window.confirm('Remove this task? Student completions for it will be orphaned but not deleted.')) return;
    const prog = programs.find(p => p.id === progId);
    if (!prog) return;
    updateProgram(progId, { tasks: (prog.tasks || []).filter(t => t.id !== taskId) });
  }

  function moveTask(progId, taskId, dir) {
    const prog = programs.find(p => p.id === progId);
    if (!prog) return;
    const tasks = [...(prog.tasks || [])];
    const idx = tasks.findIndex(t => t.id === taskId);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= tasks.length) return;
    [tasks[idx], tasks[swapIdx]] = [tasks[swapIdx], tasks[idx]];
    tasks.forEach((t, i) => { t.order = i; });
    updateProgram(progId, { tasks });
  }

  function scopeLabel(prog) {
    if (prog.groupScope === 'all') return 'All groups';
    if (Array.isArray(prog.groupScope)) {
      return prog.groupScope.map(id => groups.find(g => g.id === id)?.name || id).join(', ');
    }
    return String(prog.groupScope);
  }

  const active   = programs.filter(p => p.isActive !== false);
  const inactive = programs.filter(p => p.isActive === false);

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Programs label */}
      <Card>
        <SectionHeading>Section Label</SectionHeading>
        <p className="text-xs text-muted mb-3">
          Rename the "Programs" section for students (currently: <em>{programsLabel}</em>).
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="Label"
              value={labelEdit}
              onChange={e => { setLabelEdit(e.target.value); setLabelSaved(false); }}
              placeholder="Programs"
            />
          </div>
          <Button size="sm" onClick={saveLabel} className="mb-4">
            {labelSaved ? 'Saved ✓' : 'Save'}
          </Button>
        </div>
      </Card>

      {/* Programs list */}
      <div className="flex items-center justify-between">
        <SectionHeading>{programsLabel}</SectionHeading>
        <Button size="sm" onClick={openCreateProg}>+ Create</Button>
      </div>

      {active.length === 0 && inactive.length === 0 && (
        <EmptyState icon="📋" title={`No ${programsLabel.toLowerCase()} yet`} text="Create one to share with students." />
      )}

      {active.map(prog => {
        const sortedTasks = [...(prog.tasks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const showComp    = !!expandedComps[prog.id];
        return (
          <Card key={prog.id}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-primary">{prog.name}</p>
                  <Badge variant="gold">Active</Badge>
                </div>
                {prog.description && <p className="text-xs text-muted whitespace-pre-wrap">{prog.description}</p>}
                {prog.date        && <p className="text-xs text-muted">{formatDate(prog.date)}</p>}
                <p className="text-xs text-muted mt-1">Scope: {scopeLabel(prog)}</p>
              </div>
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                <Button size="xs" variant="ghost" onClick={() => openEditProg(prog)}>Edit</Button>
                <Button size="xs" variant="danger"
                  onClick={() => updateProgram(prog.id, { isActive: false })}>
                  Deactivate
                </Button>
                <Button size="xs" variant="danger"
                  onClick={() => { if (window.confirm(`Delete "${prog.name}"?`)) deleteProgram(prog.id); }}>
                  Delete
                </Button>
              </div>
            </div>

            {/* Tasks */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                  Tasks ({sortedTasks.length})
                </p>
                <Button size="xs" variant="outline" onClick={() => openAddTask(prog.id)}>+ Task</Button>
              </div>
              {sortedTasks.length === 0 && (
                <p className="text-xs text-muted py-1">No tasks yet.</p>
              )}
              {sortedTasks.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={t => openEditTask(prog.id, t)}
                  onDelete={tid => deleteTask(prog.id, tid)}
                  onMove={(tid, dir) => moveTask(prog.id, tid, dir)}
                  isFirst={idx === 0}
                  isLast={idx === sortedTasks.length - 1}
                />
              ))}
            </div>

            {/* Completion view */}
            <div className="border-t border-border pt-3 mt-3">
              <button
                onClick={() => toggleComp(prog.id)}
                className="text-xs font-semibold text-muted hover:text-primary transition-colors flex items-center gap-1"
              >
                {showComp ? '▾' : '▸'} Who Completed What
              </button>
              {showComp && (
                <div className="mt-3">
                  <CompletionView
                    program={prog}
                    groups={groups}
                    students={students}
                  />
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {/* Inactive programs */}
      {inactive.length > 0 && (
        <Card>
          <SectionHeading>Inactive</SectionHeading>
          <div className="space-y-2">
            {inactive.map(prog => (
              <div key={prog.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted line-through">{prog.name}</p>
                  <p className="text-xs text-muted">{(prog.tasks || []).length} tasks</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="xs" variant="ghost" onClick={() => openEditProg(prog)}>Edit</Button>
                  <Button size="xs" variant="success" onClick={() => updateProgram(prog.id, { isActive: true })}>
                    Activate
                  </Button>
                  <Button size="xs" variant="danger"
                    onClick={() => { if (window.confirm(`Delete "${prog.name}"?`)) deleteProgram(prog.id); }}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Program create/edit modal */}
      <Modal
        open={showProgModal}
        onClose={() => setShowProgModal(false)}
        title={editProgId ? 'Edit Program' : 'Create Program'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowProgModal(false)}>Cancel</Button>
            <Button size="sm" onClick={saveProg}>{editProgId ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        {progErr && <Alert type="error">{progErr}</Alert>}
        <Input
          label="Name *"
          value={progForm.name}
          onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Program name"
        />
        <Textarea
          label="Description (optional)"
          value={progForm.description}
          onChange={e => setProgForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief description (supports multiple lines)"
          rows={3}
        />
        <Input
          label="Date (optional)"
          type="date"
          value={progForm.date}
          onChange={e => setProgForm(f => ({ ...f, date: e.target.value }))}
        />
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={progForm.isActive}
            onChange={e => setProgForm(f => ({ ...f, isActive: e.target.checked }))}
            className="accent-gold"
          />
          <span className="text-sm text-primary">Active (visible to students)</span>
        </label>
        <ScopeSelector
          groups={groups}
          scopeMode={progScopeMode}
          selGroups={progSelGroups}
          onScopeMode={setProgScopeMode}
          onToggleGroup={toggleProgScope}
        />
      </Modal>

      {/* Task create/edit modal */}
      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editTaskId ? 'Edit Task' : 'Add Task'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowTaskModal(false)}>Cancel</Button>
            <Button size="sm" onClick={saveTask}>{editTaskId ? 'Save' : 'Add'}</Button>
          </>
        }
      >
        {taskErr && <Alert type="error">{taskErr}</Alert>}

        {/* Task type */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Task Type</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
              <input
                type="radio"
                checked={taskForm.type === 'todo'}
                onChange={() => setTaskForm(f => ({ ...f, type: 'todo', mode: 'individual' }))}
                className="accent-gold"
              />
              To-do (checkbox)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
              <input
                type="radio"
                checked={taskForm.type === 'tasbih'}
                onChange={() => setTaskForm(f => ({ ...f, type: 'tasbih' }))}
                className="accent-gold"
              />
              Tasbih (counter)
            </label>
          </div>
        </div>

        {/* Task mode — only for tasbih */}
        {taskForm.type === 'tasbih' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Mode</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
                <input
                  type="radio"
                  checked={taskForm.mode === 'individual'}
                  onChange={() => setTaskForm(f => ({ ...f, mode: 'individual' }))}
                  className="accent-gold"
                />
                Individual (each student their own)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-sm text-primary">
                <input
                  type="radio"
                  checked={taskForm.mode === 'collective'}
                  onChange={() => setTaskForm(f => ({ ...f, mode: 'collective' }))}
                  className="accent-gold"
                />
                Collective (shared counter)
              </label>
            </div>
            {taskForm.mode === 'collective' && (
              <p className="text-xs text-muted mt-1.5">
                All students contribute to one shared counter, like Global Tasbih.
              </p>
            )}
          </div>
        )}

        <Textarea
          label="Description *"
          value={taskForm.description}
          onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Read 30 pages (supports multiple lines)"
          rows={3}
        />

        {taskForm.type === 'tasbih' && (
          <Input
            label="Target count *"
            type="number"
            value={taskForm.target}
            onChange={e => setTaskForm(f => ({ ...f, target: e.target.value }))}
            placeholder="e.g. 100"
            min={1}
          />
        )}
      </Modal>
    </div>
  );
}
