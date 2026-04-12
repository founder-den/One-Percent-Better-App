import { useState } from 'react';
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

  // Bonus points modal
  const [bonusModal,  setBonusModal]  = useState(null); // student
  const [bonusPts,    setBonusPts]    = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [bonusErr,    setBonusErr]    = useState('');
  const [bonusOk,     setBonusOk]     = useState('');

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
          const totalPts  = getStudentTotalPoints(st, groupActs);
          const subs      = [...(st.submissions || [])].sort((a, b) => b.date.localeCompare(a.date));
          const bonusPtsTotal = (st.bonusPoints || []).reduce((s, b) => s + (b.points || 0), 0);

          return (
            <div key={st.id} className="mb-6 pb-5 border-b border-border last:border-0 last:pb-0 last:mb-0">
              <div className="flex items-start gap-3 mb-2">
                <Avatar src={st.avatar} name={st.fullName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{st.fullName}</p>
                  <p className="text-xs text-muted">@{st.username} · {totalPts} pts total · {subs.length} days</p>
                  {st.university && <p className="text-xs text-muted">🎓 {st.university}</p>}
                  {st.phone      && <p className="text-xs text-muted">📞 {st.phone}</p>}
                  {bonusPtsTotal > 0 && (
                    <p className="text-xs text-gold">🎁 {bonusPtsTotal} bonus pts</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end flex-shrink-0">
                  <Button variant="ghost" size="xs" onClick={() => openInfo(st)}>Edit</Button>
                  <Button variant="outline" size="xs" onClick={() => openBonus(st)}>Bonus</Button>
                  <Button variant="danger" size="xs" onClick={() => { if (window.confirm(`Delete ${st.fullName}? This cannot be undone.`)) deleteStudent(st.id); }}>Delete</Button>
                </div>
              </div>

              {/* Bonus points history */}
              {(st.bonusPoints || []).length > 0 && (
                <div className="pl-11 mb-2">
                  {[...(st.bonusPoints || [])].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3).map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-xs text-muted mb-0.5">
                      <span className="text-gold font-semibold">+{b.points}</span>
                      <span className="text-primary">{b.reason}</span>
                      <span className="ml-auto">{formatDate(b.date)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent submissions */}
              {subs.length > 0 ? (
                <div className="pl-11 space-y-1">
                  {subs.slice(0, 5).map(sub => {
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
                  {subs.length > 5 && (
                    <p className="text-xs text-muted">… and {subs.length - 5} more</p>
                  )}
                </div>
              ) : (
                <p className="pl-11 text-xs text-muted">No submissions yet.</p>
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
    </div>
  );
}
