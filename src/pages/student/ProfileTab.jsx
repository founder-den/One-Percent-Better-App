import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, Button, Input, Avatar, ImageUploadButton, SectionHeading, Alert, EmptyState } from '../../components/ui.jsx';
import { formatDate } from '../../services/data.js';

export default function ProfileTab() {
  const { student } = useAuth();
  const { updateStudent, findGroupById } = useApp();

  const group = findGroupById(student.groupId);

  const [form, setForm]   = useState({
    fullName:   student.fullName   || '',
    username:   student.username   || '',
    university: student.university || '',
    phone:      student.phone      || '',
  });
  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '' });
  const [avatar, setAvatar]   = useState(student.avatar || null);
  const [saved,  setSaved]    = useState(false);
  const [err,    setErr]      = useState('');
  const [pwErr,  setPwErr]    = useState('');
  const [pwOk,   setPwOk]    = useState('');

  function set(k) {
    return e => { setForm(f => ({ ...f, [k]: e.target.value })); setSaved(false); setErr(''); };
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setErr(''); setSaved(false);
    if (!form.fullName.trim()) { setErr('Full name is required.'); return; }
    if (!form.username.trim() || form.username.length < 3) { setErr('Username must be at least 3 characters.'); return; }
    const ok = await updateStudent(student.id, {
      fullName:   form.fullName.trim(),
      username:   form.username.trim(),
      university: form.university.trim(),
      phone:      form.phone.trim(),
      avatar,
    });
    if (ok) setSaved(true);
    else setErr('Failed to save. Please try again.');
  }

  async function handleAvatarUpload(dataUrl) {
    setAvatar(dataUrl);
    await updateStudent(student.id, { avatar: dataUrl });
  }

  async function handleRemoveAvatar() {
    setAvatar(null);
    await updateStudent(student.id, { avatar: null });
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwErr(''); setPwOk('');
    if (pwForm.current !== student.password) { setPwErr('Current password is incorrect.'); return; }
    if (pwForm.newPw.length < 4) { setPwErr('New password must be at least 4 characters.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwErr('Passwords do not match.'); return; }
    const ok = await updateStudent(student.id, { password: pwForm.newPw });
    if (ok) { setPwForm({ current: '', newPw: '', confirm: '' }); setPwOk('Password changed successfully.'); }
    else setPwErr('Failed to update password. Please try again.');
  }

  const bonusPoints = [...(student.bonusPoints || [])].sort((a, b) => b.date.localeCompare(a.date));
  const bonusTotal  = bonusPoints.reduce((s, b) => s + (b.points || 0), 0);

  return (
    <div className="mt-6 space-y-5 max-w-lg">
      {/* Avatar */}
      <Card>
        <SectionHeading>Profile Photo</SectionHeading>
        <div className="flex items-center gap-5">
          <Avatar src={avatar} name={form.fullName || student.fullName} size="xl" ring />
          <div className="flex flex-col gap-2">
            <ImageUploadButton onUpload={handleAvatarUpload} label="Upload Photo" />
            {avatar && (
              <Button variant="danger" size="sm" onClick={handleRemoveAvatar}>Remove</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Profile info */}
      <Card>
        <SectionHeading>Personal Info</SectionHeading>
        {saved && <Alert type="success">Profile saved.</Alert>}
        {err   && <Alert type="error">{err}</Alert>}
        <form onSubmit={handleSaveProfile}>
          <Input label="Full Name"   value={form.fullName}   onChange={set('fullName')}   placeholder="Your full name" />
          <Input label="Username"    value={form.username}   onChange={set('username')}   placeholder="Min 3 characters" autoComplete="username" />
          <Input label="University"  value={form.university} onChange={set('university')} placeholder="e.g. Harvard University" />
          <Input label="Phone"       value={form.phone}      onChange={set('phone')}      placeholder="e.g. +1 617 555 0100" type="tel" />
          <div className="text-xs text-muted mb-4">
            Group: <span className="text-primary">{group?.name || '—'}</span>
          </div>
          <Button type="submit" full>Save Profile</Button>
        </form>
      </Card>

      {/* Change password */}
      <Card>
        <SectionHeading>Change Password</SectionHeading>
        {pwErr && <Alert type="error">{pwErr}</Alert>}
        {pwOk  && <Alert type="success">{pwOk}</Alert>}
        <form onSubmit={handleChangePassword}>
          <Input
            label="Current Password"
            type="password"
            value={pwForm.current}
            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
            autoComplete="current-password"
          />
          <Input
            label="New Password"
            type="password"
            value={pwForm.newPw}
            onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
            placeholder="Min 4 characters"
            autoComplete="new-password"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          <Button type="submit" full variant="outline">Change Password</Button>
        </form>
      </Card>

      {/* Bonus Points History (Step 7) */}
      <Card>
        <SectionHeading>Bonus Points</SectionHeading>
        {bonusPoints.length === 0 ? (
          <EmptyState icon="🎁" title="No bonus points yet" text="Bonus points awarded by your admin will appear here." />
        ) : (
          <>
            <p className="text-xs text-muted mb-3">
              Total bonus received:{' '}
              <span className="text-gold font-semibold">+{bonusTotal} pts</span>
            </p>
            <div className="space-y-2">
              {bonusPoints.map(b => (
                <div key={b.id} className="flex items-start justify-between gap-3 py-2.5 px-3 rounded-lg bg-bg-card2 border border-border">
                  <div className="min-w-0">
                    <p className="text-sm text-primary font-medium">{b.reason || 'Bonus points'}</p>
                    <p className="text-xs text-muted">{formatDate(b.date)}</p>
                  </div>
                  <span className="text-gold font-bold text-sm flex-shrink-0">+{b.points}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
