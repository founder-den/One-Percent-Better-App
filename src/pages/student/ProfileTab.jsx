import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import {
  Card, Button, Input, SectionHeading, Alert, PasswordInput,
} from '../../components/ui.jsx';
import { Camera, Check, X, Info } from 'lucide-react';

// ─── Avatar upload with camera overlay ────────────────────────────
function AvatarUpload({ avatar, name, onChange }) {
  const inputRef = useRef(null);
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div
      className="relative flex-shrink-0 group cursor-pointer"
      style={{ width: 80, height: 80 }}
      onClick={() => inputRef.current?.click()}
      title="Click to change photo"
    >
      <div
        className="w-full h-full rounded-full overflow-hidden bg-surface flex items-center justify-center font-bold font-serif text-2xl text-gold"
        style={{ boxShadow: '0 0 0 2.5px var(--gold)' }}
      >
        {avatar
          ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
          : <span>{initials}</span>}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera size={20} className="text-white" />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function ProfileTab() {
  const { student } = useAuth();
  const { updateStudent } = useApp();

  // Edit form state
  const [form, setForm] = useState({
    fullName:         student.fullName         || '',
    university:       student.university       || '',
    phone:            student.phone            || '',
    telegramUsername: student.telegramUsername || '',
    preferredLanguage: student.preferredLanguage || 'en',
  });
  const [avatar, setAvatar] = useState(student.avatar || null);
  const [saved,  setSaved]  = useState(false);
  const [err,    setErr]    = useState('');

  // Password state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwErr,  setPwErr]  = useState('');
  const [pwOk,   setPwOk]   = useState('');

  function set(k) {
    return e => { setForm(f => ({ ...f, [k]: e.target.value })); setSaved(false); setErr(''); };
  }

  async function handleSave(e) {
    e.preventDefault();
    setErr(''); setSaved(false);
    if (!form.fullName.trim()) { setErr('Full name is required.'); return; }
    const ok = await updateStudent(student.id, {
      fullName:         form.fullName.trim(),
      university:       form.university.trim(),
      phone:            form.phone.trim(),
      telegramUsername: form.telegramUsername.trim(),
      preferredLanguage: form.preferredLanguage,
      avatar,
    });
    if (ok) setSaved(true);
    else setErr('Failed to save. Please try again.');
  }

  function handleCancel() {
    setForm({ fullName: student.fullName || '', university: student.university || '', phone: student.phone || '', telegramUsername: student.telegramUsername || '', preferredLanguage: student.preferredLanguage || 'en' });
    setAvatar(student.avatar || null);
    setSaved(false); setErr('');
  }

  async function handleAvatarChange(dataUrl) {
    setAvatar(dataUrl);
    await updateStudent(student.id, { avatar: dataUrl });
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

  return (
    <div className="mt-6 max-w-2xl space-y-4">

      {/* ── Edit Profile ──────────────────────────────────────── */}
      <Card>
        <SectionHeading>Edit Profile</SectionHeading>
        {saved && <Alert type="success">Profile saved.</Alert>}
        {err   && <Alert type="error">{err}</Alert>}

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-bg-card2 border border-border">
          <AvatarUpload avatar={avatar} name={form.fullName || student.fullName} onChange={handleAvatarChange} />
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted text-xs font-medium cursor-pointer hover:border-gold hover:text-gold transition-all">
              <Camera size={12} />
              Upload Photo
              <input
                type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => handleAvatarChange(ev.target.result);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </label>
            {avatar && (
              <Button variant="danger" size="sm" onClick={() => { setAvatar(null); updateStudent(student.id, { avatar: null }); }}>
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Form fields */}
        <form onSubmit={handleSave}>
          <Input
            label="Full Name"
            value={form.fullName}
            onChange={set('fullName')}
            placeholder="Your full name"
          />
          <div className="mb-4">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-muted select-none">
              @{student.username}
            </div>
            <p className="text-xs text-muted mt-1 opacity-70">Username cannot be changed.</p>
          </div>
          <Input
            label="University"
            value={form.university}
            onChange={set('university')}
            placeholder="e.g. Harvard University"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={set('phone')}
            placeholder="e.g. +1 617 555 0100"
            type="tel"
          />
          <Input
            label="Telegram Username"
            value={form.telegramUsername}
            onChange={set('telegramUsername')}
            placeholder="@yourusername"
          />
          <p className="text-xs text-muted -mt-3 mb-4 opacity-70">
            Add your Telegram username so we can send you daily reminders
          </p>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Preferred Language
            </label>
            <select
              value={form.preferredLanguage}
              onChange={e => { setForm(f => ({ ...f, preferredLanguage: e.target.value })); setSaved(false); }}
              className="w-full bg-surface border border-border text-primary rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            >
              <option value="en">English 🇬🇧</option>
              <option value="ru">Русский 🇷🇺</option>
              <option value="ky">Кыргызча 🇰🇬</option>
            </select>
          </div>

          {/* Telegram setup instructions */}
          <div
            className="rounded-xl p-3.5 mb-4 flex gap-3"
            style={{ background: 'var(--gold-subtle)', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' }}
          >
            <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
            <div className="space-y-1 text-xs" style={{ color: 'var(--text)' }}>
              <p className="font-semibold" style={{ color: 'var(--gold)' }}>How to enable Telegram reminders:</p>
              <p>1. Search <span className="font-mono font-semibold">@KCC_students_Bot</span> in Telegram</p>
              <p>2. Press <strong>Start</strong> to activate the bot</p>
              <p>3. Enter your Telegram username above (e.g. @yourname)</p>
              <p>4. Save your profile</p>
              <p className="text-muted mt-1 italic">You must start the bot before reminders can be sent to you</p>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Button type="submit" className="flex-1 gap-1.5">
              <Check size={14} /> Save Changes
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} className="gap-1.5">
              <X size={14} /> Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Change Password ──────────────────────────────────── */}
      <Card>
        <SectionHeading>Change Password</SectionHeading>
        {pwErr && <Alert type="error">{pwErr}</Alert>}
        {pwOk  && <Alert type="success">{pwOk}</Alert>}
        <form onSubmit={handleChangePassword}>
          <PasswordInput
            label="Current Password"
            value={pwForm.current}
            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
            autoComplete="current-password"
          />
          <PasswordInput
            label="New Password"
            value={pwForm.newPw}
            onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
            placeholder="Min 4 characters"
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm Password"
            value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          <Button type="submit" full variant="outline">Change Password</Button>
        </form>
      </Card>

    </div>
  );
}
