import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Card, Button, Badge, Avatar, SectionHeading, EmptyState,
  Modal, Input, ChecklistItem, Alert,
} from '../../components/ui.jsx';
import { formatDate, todayString } from '../../services/data.js';
import { submissionPoints, getStudentTotalPoints } from '../../services/calculations.js';

export default function StudentsTab({ groupId }) {
  const {
    groups, students,
    approveStudent, deleteStudent, updateStudent, editSubmission, addBonusPoints,
    updateBonusPoints, deleteBonusPoints,
    addPersonalTasbih, deletePersonalTasbih,
    activitiesForGroup, studentsForGroup,
  } = useApp();

  const groupStudents = studentsForGroup(groupId);
  const groupActs     = activitiesForGroup(groupId);
  const today         = todayString();

  const pending = groupStudents.filter(s => s.status === 'pending');
  const active  = groupStudents.filter(s => (s.status || 'active') === 'active');

  // Absent today: active students who haven't submitted today
  const [absentGroupFilter, setAbsentGroupFilter] = useState('current');
  const absentStudents = (() => {
    let pool;
    if (absentGroupFilter === 'all') {
      pool = students.filter(s => (s.status || 'active') === 'active');
    } else {
      pool = active;
    }
    return pool.filter(s => !(s.submissions || []).some(sub => sub.date === today));
  })();

  // Edit submission modal
  const [editModal,   setEditModal]   = useState(null);
  const [editChecked, setEditChecked] = useState({});

  // Edit student info modal
  const [infoModal, setInfoModal] = useState(null);
  const [infoForm,  setInfoForm]  = useState({});
  const [infoErr,   setInfoErr]   = useState('');
  const [pwForm,    setPwForm]    = useState('');
  const [moveGroup, setMoveGroup] = useState('');

  // Password reveal
  const [revealedPw, setRevealedPw] = useState(null); // student id whose password is showing

  // Personal tasbih admin
  const [ptModal,    setPtModal]    = useState(null); // student
  const [ptForm,     setPtForm]     = useState({ title: '', target: '', resetType: 'none' });
  const [ptErr,      setPtErr]      = useState('');

  // Bonus points modal
  const [bonusModal,  setBonusModal]  = useState(null); // student
  const [bonusPts,    setBonusPts]    = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [bonusErr,    setBonusErr]    = useState('');
  const [bonusOk,     setBonusOk]     = useState('');

  // Collapsed/expanded student rows
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // Inline bonus editing
  const [editingBonusId,    setEditingBonusId]    = useState(null);
  const [editBonusFields,   setEditBonusFields]   = useState({ points: '', reason: '' });

  // ── Edit submission ──────────────────────────────────────────────
  function openEdit(st, sub) {
    const checked = {};
    (sub.completedActivities || []).forEach(id => { checked[id] = true; });
    setEditChecked(checked);
    setEditModal({ student: st, sub });
  }
  function saveEdit() {
    const ids = groupActs.filter(a => editChecked[a.id]).map(a => a.id);
    editSubmission(editModal.student.id, editModal.sub.date, ids);
    setEditModal(null);
  }

  // ── Edit student info ────────────────────────────────────────────
  function openInfo(st) {
    setInfoForm({
      fullName:   st.fullName   || '',
      username:   st.username   || '',
      university: st.university || '',
      phone:      st.phone      || '',
    });
    setPwForm('');
    setMoveGroup(st.groupId);
    setInfoErr('');
    setInfoModal(st);
  }
  function saveInfo() {
    setInfoErr('');
    if (!infoForm.fullName.trim())                               { setInfoErr('Full name required.'); return; }
    if (!infoForm.username.trim() || infoForm.username.length < 3) { setInfoErr('Username min 3 chars.'); return; }
    const fields = { ...infoForm, groupId: moveGroup };
    if (pwForm.length > 0) {
      if (pwForm.length < 4) { setInfoErr('Password min 4 chars.'); return; }
      fields.password = pwForm;
    }
    updateStudent(infoModal.id, fields);
    setInfoModal(null);
  }

  // ── Personal tasbihs admin ────────────────────────────────────────
  function openPt(st) {
    setPtForm({ title: '', target: '', resetType: 'none' });
    setPtErr('');
    setPtModal(st);
  }
  function savePt() {
    setPtErr('');
    if (!ptForm.title.trim()) { setPtErr('Title is required.'); return; }
    const target = parseInt(ptForm.target);
    if (isNaN(target) || target < 1) { setPtErr('Target must be a positive number.'); return; }
    addPersonalTasbih(ptModal.id, { title: ptForm.title.trim(), target, resetType: ptForm.resetType });
    setPtForm({ title: '', target: '', resetType: 'none' });
    setPtErr('');
  }

  // ── Bonus points ──────────────────────────────────────────────────
  function openBonus(st) {
    setBonusPts('');
    setBonusReason('');
    setBonusErr('');
    setBonusOk('');
    setBonusModal(st);
  }
  function saveBonus() {
    setBonusErr('');
    const pts = parseInt(bonusPts);
    if (isNaN(pts) || pts === 0) { setBonusErr('Enter a non-zero number of points.'); return; }
    if (!bonusReason.trim())     { setBonusErr('Reason is required.'); return; }
    addBonusPoints(bonusModal.id, pts, bonusReason.trim());
    setBonusOk(`+${pts} points added to ${bonusModal.fullName}.`);
    setBonusPts('');
    setBonusReason('');
  }

  if (!groupId) {
    return <EmptyState icon="👥" title="No group selected" text="Select a group from the dropdown above." />;
  }

  return (
    <div className="space-y-5">
      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card>
          <SectionHeading>Pending Approval ({pending.length})</SectionHeading>
          <div className="space-y-3">
            {pending.map(st => {
              const grp = groups.find(g => g.id === st.groupId);
              return (
                <div key={st.id} className="py-3 border-b border-border last:border-0">
                  <div className="flex items-start gap-3">
                    <Avatar src={st.avatar} name={st.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary">{st.fullName}</p>
                      <p className="text-xs text-muted">@{st.username}</p>
                      {st.university && <p className="text-xs text-muted">🎓 {st.university}</p>}
                      {st.phone      && <p className="text-xs text-muted">📞 {st.phone}</p>}
                      {grp           && <p className="text-xs text-muted">👥 {grp.name}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                      <Badge variant="pending">Pending</Badge>
                      <Button variant="success" size="xs" onClick={() => approveStudent(st.id)}>Approve</Button>
                      <Button variant="danger"  size="xs" onClick={() => { if (window.confirm(`Delete ${st.fullName}?`)) deleteStudent(st.id); }}>Delete</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Active students */}
      <Card>
        <SectionHeading>Active Students ({active.length})</SectionHeading>
        {active.length === 0 && (
          <EmptyState icon="👤" title="No active students yet" text="Students appear here once registered and approved. Share your group code to get started." />
        )}
        {active.map(st => {
          const isExpanded    = expandedStudentId === st.id;
          const totalPts      = getStudentTotalPoints(st, groupActs);
          const subs          = [...(st.submissions || [])].sort((a, b) => b.date.localeCompare(a.date));
          const bonusPtsTotal = (st.bonusPoints || []).reduce((s, b) => s + (b.points || 0), 0);

          return (
            <div key={st.id} className="border-b border-border last:border-0">
              {/* ── Compact header row (always visible) ── */}
              <div
                className="flex items-center gap-3 py-3 cursor-pointer hover:bg-bg-card2 rounded-lg px-2 -mx-2 transition-colors"
                onClick={() => {
                  setEditingBonusId(null);
                  setExpandedStudentId(isExpanded ? null : st.id);
                }}
              >
                <Avatar src={st.avatar} name={st.fullName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{st.fullName}</p>
                  <p className="text-xs text-muted">
                    @{st.username} · {totalPts} pts · {subs.length} days
                    {bonusPtsTotal !== 0 && <span className="text-gold"> · 🎁 {bonusPtsTotal > 0 ? '+' : ''}{bonusPtsTotal}</span>}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={1.75}
                  className="text-muted flex-shrink-0 transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </div>

              {/* ── Expanded details ── */}
              {isExpanded && (
                <div className="pb-4 space-y-3">
                  {/* Profile info */}
                  {(st.university || st.phone || groups.find(g => g.id === st.groupId)) && (
                    <div className="pl-11 space-y-0.5">
                      {st.university && <p className="text-xs text-muted">🎓 {st.university}</p>}
                      {st.phone      && <p className="text-xs text-muted">📞 {st.phone}</p>}
                      {groups.find(g => g.id === st.groupId) && (
                        <p className="text-xs text-muted">👥 {groups.find(g => g.id === st.groupId).name}</p>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="pl-11 flex items-center gap-2 flex-wrap">
                    <Button variant="ghost"   size="xs" onClick={() => openInfo(st)}>Edit</Button>
                    <Button variant="outline" size="xs" onClick={() => openBonus(st)}>Bonus</Button>
                    <Button variant="ghost"   size="xs" onClick={() => openPt(st)}>Tasbihs</Button>
                    <button
                      onClick={() => setRevealedPw(id => id === st.id ? null : st.id)}
                      className="text-xs text-muted hover:text-primary transition-colors px-1"
                    >
                      {revealedPw === st.id ? '🙈' : '👁'}
                    </button>
                    {revealedPw === st.id && (
                      <span className="text-xs font-mono bg-bg-card2 border border-border rounded px-2 py-0.5 text-primary select-all">
                        {st.password}
                      </span>
                    )}
                    <Button variant="danger" size="xs" onClick={() => { if (window.confirm(`Delete ${st.fullName}? This cannot be undone.`)) deleteStudent(st.id); }}>Delete</Button>
                  </div>

                  {/* Bonus points with edit/delete */}
                  {(st.bonusPoints || []).length > 0 && (
                    <div className="pl-11">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Bonus Points</p>
                      <div className="space-y-1.5">
                        {[...(st.bonusPoints || [])].sort((a, b) => b.date.localeCompare(a.date)).map(b => (
                          <div key={b.id}>
                            {editingBonusId === b.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={editBonusFields.points}
                                  onChange={e => setEditBonusFields(f => ({ ...f, points: e.target.value }))}
                                  className="w-16 text-xs bg-bg-card2 border border-border rounded px-2 py-1 text-primary outline-none focus:border-gold min-h-0"
                                />
                                <input
                                  type="text"
                                  value={editBonusFields.reason}
                                  onChange={e => setEditBonusFields(f => ({ ...f, reason: e.target.value }))}
                                  className="flex-1 text-xs bg-bg-card2 border border-border rounded px-2 py-1 text-primary outline-none focus:border-gold min-h-0"
                                />
                                <button
                                  onClick={() => {
                                    const pts = parseInt(editBonusFields.points);
                                    if (isNaN(pts) || pts === 0) return;
                                    updateBonusPoints(st.id, b.id, { points: pts, reason: editBonusFields.reason });
                                    setEditingBonusId(null);
                                  }}
                                  className="text-xs text-gold font-semibold hover:opacity-75 transition-opacity"
                                >Save</button>
                                <button
                                  onClick={() => setEditingBonusId(null)}
                                  className="text-xs text-muted hover:text-primary transition-colors"
                                >✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs">
                                <span className={`font-bold flex-shrink-0 ${b.points >= 0 ? 'text-gold' : 'text-danger'}`}>
                                  {b.points >= 0 ? '+' : ''}{b.points}
                                </span>
                                <span className="text-primary flex-1 min-w-0 truncate">{b.reason}</span>
                                <span className="text-muted flex-shrink-0">{formatDate(b.date)}</span>
                                <button
                                  onClick={() => { setEditingBonusId(b.id); setEditBonusFields({ points: String(b.points), reason: b.reason }); }}
                                  className="text-xs text-muted hover:text-gold transition-colors flex-shrink-0"
                                >Edit</button>
                                <button
                                  onClick={() => { if (window.confirm('Delete this bonus entry?')) deleteBonusPoints(st.id, b.id); }}
                                  className="text-xs text-muted hover:text-danger transition-colors flex-shrink-0"
                                >Del</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All submissions */}
                  <div className="pl-11">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Submissions ({subs.length})</p>
                    {subs.length > 0 ? (
                      <div className="space-y-1">
                        {subs.map(sub => {
                          const pts = submissionPoints(sub, groupActs);
                          return (
                            <div key={sub.date} className="flex items-center gap-2 text-xs text-muted">
                              <span className="w-24 flex-shrink-0 text-primary">{formatDate(sub.date)}</span>
                              <span className="text-gold font-semibold">+{pts}</span>
                              <span>({(sub.completedActivities || []).length} acts)</span>
                              <Button variant="ghost" size="xs" onClick={() => openEdit(st, sub)}>Edit</Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">No submissions yet.</p>
                    )}
                  </div>

                  {/* Personal tasbihs */}
                  {(st.personalTasbihs || []).length > 0 && (
                    <div className="pl-11">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Personal Tasbihs</p>
                      <div className="space-y-1">
                        {(st.personalTasbihs || []).map(pt => {
                          const pct = pt.target > 0 ? Math.min(100, Math.round((pt.current / pt.target) * 100)) : 0;
                          return (
                            <div key={pt.id} className="flex items-center gap-2 text-xs text-muted">
                              <span className="text-primary flex-1 min-w-0 truncate">{pt.title}</span>
                              <span className="text-gold">{pt.current}/{pt.target} ({pct}%)</span>
                              {pt.resetType !== 'none' && <span className="italic">{pt.resetType}</span>}
                              <button
                                onClick={() => { if (window.confirm(`Remove "${pt.title}" from ${st.fullName}?`)) deletePersonalTasbih(st.id, pt.id); }}
                                className="text-danger hover:text-red-400 transition-colors"
                              >✕</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Absent today */}
      <Card>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Absent Today</span>
          <div className="flex items-center gap-2">
            <select
              value={absentGroupFilter}
              onChange={e => setAbsentGroupFilter(e.target.value)}
              className="text-xs bg-bg-card2 border border-border text-primary rounded-lg px-2 py-1 outline-none focus:border-gold"
            >
              <option value="current">This group</option>
              <option value="all">All groups</option>
            </select>
          </div>
        </div>
        {absentStudents.length === 0 ? (
          <EmptyState icon="🎉" title="Everyone has submitted today!" text="All active students in this group have submitted." />
        ) : (
          <div className="space-y-2">
            {absentStudents.map(st => {
              const grp = groups.find(g => g.id === st.groupId);
              return (
                <div key={st.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <Avatar src={st.avatar} name={st.fullName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary">{st.fullName}</p>
                    <p className="text-xs text-muted">@{st.username}{grp && absentGroupFilter === 'all' ? ` · ${grp.name}` : ''}</p>
                  </div>
                  <Badge variant="muted">Not submitted</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Edit submission modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Edit Submission — ${formatDate(editModal?.sub?.date)}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit}>Save</Button>
          </>
        }
      >
        {editModal && (
          <div className="space-y-1">
            {groupActs.length === 0 && (
              <p className="text-sm text-muted">No activities found for this group.</p>
            )}
            {groupActs.map(a => (
              <ChecklistItem
                key={a.id}
                activity={a}
                checked={!!editChecked[a.id]}
                onChange={() => setEditChecked(c => ({ ...c, [a.id]: !c[a.id] }))}
              />
            ))}
          </div>
        )}
      </Modal>

      {/* Edit student info modal */}
      <Modal
        open={!!infoModal}
        onClose={() => setInfoModal(null)}
        title={`Edit Student — ${infoModal?.fullName}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setInfoModal(null)}>Cancel</Button>
            <Button size="sm" onClick={saveInfo}>Save</Button>
          </>
        }
      >
        {infoModal && (
          <div>
            {infoErr && <Alert type="error">{infoErr}</Alert>}
            <Input label="Full Name"   value={infoForm.fullName}   onChange={e => setInfoForm(f => ({ ...f, fullName: e.target.value }))} />
            <Input label="Username"    value={infoForm.username}   onChange={e => setInfoForm(f => ({ ...f, username: e.target.value }))} />
            <Input label="University"  value={infoForm.university} onChange={e => setInfoForm(f => ({ ...f, university: e.target.value }))} />
            <Input label="Phone"       value={infoForm.phone}      onChange={e => setInfoForm(f => ({ ...f, phone: e.target.value }))} />
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Move to Group</label>
              <select
                value={moveGroup}
                onChange={e => setMoveGroup(e.target.value)}
                className="w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="New Password (leave blank to keep)"
              type="password"
              value={pwForm}
              onChange={e => setPwForm(e.target.value)}
              placeholder="Min 4 characters"
            />
          </div>
        )}
      </Modal>

      {/* Bonus points modal */}
      <Modal
        open={!!bonusModal}
        onClose={() => setBonusModal(null)}
        title={`Add Bonus Points — ${bonusModal?.fullName}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setBonusModal(null)}>Close</Button>
            {!bonusOk && <Button size="sm" onClick={saveBonus}>Add Points</Button>}
          </>
        }
      >
        {bonusModal && (
          <div>
            {bonusErr && <Alert type="error">{bonusErr}</Alert>}
            {bonusOk  && <Alert type="success">{bonusOk}</Alert>}
            <Input
              label="Points (use negative for deduction)"
              type="number"
              value={bonusPts}
              onChange={e => { setBonusPts(e.target.value); setBonusErr(''); setBonusOk(''); }}
              placeholder="e.g. 50"
            />
            <Input
              label="Reason"
              value={bonusReason}
              onChange={e => { setBonusReason(e.target.value); setBonusErr(''); }}
              placeholder="e.g. Helped organize an event"
            />

            {/* Existing bonus history */}
            {(bonusModal.bonusPoints || []).length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">History</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {[...(bonusModal.bonusPoints || [])].sort((a,b) => b.date.localeCompare(a.date)).map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-bg-card2">
                      <span className={`font-bold ${b.points >= 0 ? 'text-gold' : 'text-danger'}`}>
                        {b.points >= 0 ? '+' : ''}{b.points}
                      </span>
                      <span className="text-primary flex-1">{b.reason}</span>
                      <span className="text-muted">{formatDate(b.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Personal Tasbih admin modal */}
      <Modal
        open={!!ptModal}
        onClose={() => setPtModal(null)}
        title={`Personal Tasbihs — ${ptModal?.fullName}`}
        footer={
          <Button variant="ghost" size="sm" onClick={() => setPtModal(null)}>Close</Button>
        }
      >
        {ptModal && (
          <div>
            {/* Existing list */}
            {(students.find(s => s.id === ptModal.id)?.personalTasbihs || []).length > 0 ? (
              <div className="mb-4 space-y-2">
                {(students.find(s => s.id === ptModal.id)?.personalTasbihs || []).map(pt => {
                  const pct = pt.target > 0 ? Math.min(100, Math.round((pt.current / pt.target) * 100)) : 0;
                  return (
                    <div key={pt.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-bg-card2 border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary font-medium truncate">{pt.title}</p>
                        <p className="text-xs text-muted">{pt.current}/{pt.target} ({pct}%) · Reset: {pt.resetType}</p>
                      </div>
                      <button
                        onClick={() => { if (window.confirm(`Delete "${pt.title}"?`)) deletePersonalTasbih(ptModal.id, pt.id); }}
                        className="text-xs text-danger hover:text-red-400 flex-shrink-0 transition-colors"
                      >Delete</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted mb-4">No personal tasbihs yet.</p>
            )}

            {/* Add new */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Add Tasbih</p>
              {ptErr && <Alert type="error">{ptErr}</Alert>}
              <Input
                label="Title *"
                value={ptForm.title}
                onChange={e => { setPtForm(f => ({ ...f, title: e.target.value })); setPtErr(''); }}
                placeholder="e.g. Subhanallah"
              />
              <Input
                label="Target *"
                type="number"
                value={ptForm.target}
                onChange={e => { setPtForm(f => ({ ...f, target: e.target.value })); setPtErr(''); }}
                placeholder="e.g. 100"
                min={1}
              />
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">Auto Reset</label>
                <select
                  value={ptForm.resetType}
                  onChange={e => setPtForm(f => ({ ...f, resetType: e.target.value }))}
                  className="w-full bg-bg-card2 border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold"
                >
                  <option value="none">None — never resets</option>
                  <option value="daily">Daily — resets every midnight</option>
                  <option value="weekly">Weekly — resets every Monday</option>
                </select>
              </div>
              <Button size="sm" full onClick={savePt}>Add Tasbih</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
