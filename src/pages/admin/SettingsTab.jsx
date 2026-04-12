import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Card, Button, Input, SectionHeading, Alert,
  ImageUploadButton, Avatar,
} from '../../components/ui.jsx';

export default function SettingsTab() {
  const {
    community, updateCommunity,
    registrationMode, setRegMode,
    adminPassword, changeAdminPassword,
    resetAll,
  } = useApp();

  const [commName,   setCommName]  = useState(community?.name || '');
  const [commSaved,  setCommSaved] = useState(false);
  const [commErr,    setCommErr]   = useState('');

  const [pw,    setPw]    = useState({ current: '', newPw: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwOk,  setPwOk]  = useState('');

  // Community info
  function saveComm(e) {
    e.preventDefault();
    setCommErr(''); setCommSaved(false);
    if (!commName.trim()) { setCommErr('Name is required.'); return; }
    updateCommunity({ name: commName.trim() });
    setCommSaved(true);
  }

  function handleLogoUpload(dataUrl) {
    updateCommunity({ logo: dataUrl });
  }

  function handleBannerUpload(dataUrl) {
    updateCommunity({ banner: dataUrl });
  }

  function handleBannerDarkUpload(dataUrl) {
    updateCommunity({ bannerDark: dataUrl });
  }

  function handleBannerLightUpload(dataUrl) {
    updateCommunity({ bannerLight: dataUrl });
  }

  function removeLogo() {
    updateCommunity({ logo: null });
  }

  function removeBanner() {
    updateCommunity({ banner: null });
  }

  function removeBannerDark() {
    updateCommunity({ bannerDark: null });
  }

  function removeBannerLight() {
    updateCommunity({ bannerLight: null });
  }

  // Admin password
  function savePw(e) {
    e.preventDefault();
    setPwErr(''); setPwOk('');
    if (pw.current !== adminPassword)       { setPwErr('Current password is incorrect.'); return; }
    if (pw.newPw.length < 4)               { setPwErr('New password must be at least 4 characters.'); return; }
    if (pw.newPw !== pw.confirm)           { setPwErr('Passwords do not match.'); return; }
    changeAdminPassword(pw.newPw);
    setPw({ current: '', newPw: '', confirm: '' });
    setPwOk('Password updated.');
  }

  // Full reset
  function handleReset() {
    const confirmed = window.confirm(
      '⚠️ This will permanently delete ALL students, submissions, activities, periods, and groups. The app will return to defaults. Are you absolutely sure?'
    );
    if (!confirmed) return;
    const double = window.confirm('Last chance — delete everything?');
    if (double) resetAll();
  }

  return (
    <div className="space-y-5 max-w-lg">
      {/* Community */}
      <Card>
        <SectionHeading>Community Settings</SectionHeading>
        {commSaved && <Alert type="success">Saved.</Alert>}
        {commErr   && <Alert type="error">{commErr}</Alert>}
        <form onSubmit={saveComm}>
          <Input
            label="Community Name"
            value={commName}
            onChange={e => { setCommName(e.target.value); setCommSaved(false); setCommErr(''); }}
            placeholder="e.g. Kyrgyz Community"
          />
          <Button type="submit" full className="mb-4">Save Name</Button>
        </form>

        {/* Logo */}
        <div className="mb-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Community Logo</p>
          <div className="flex items-center gap-4">
            <Avatar src={community?.logo} name={commName || 'Logo'} size="lg" ring />
            <div className="flex gap-2 flex-wrap">
              <ImageUploadButton onUpload={handleLogoUpload} label="Upload Logo" />
              {community?.logo && (
                <Button variant="danger" size="sm" onClick={removeLogo}>Remove</Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted mt-2">Displayed in the navbar and home page.</p>
        </div>

        {/* Banners */}
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Community Banners</p>
          <p className="text-xs text-muted -mt-2">Upload separate versions for dark and light mode. Wide/landscape format recommended (1200×400).</p>

          {/* Dark mode banner */}
          <div>
            <p className="text-xs font-semibold text-muted mb-2">Dark Mode Banner</p>
            {community?.bannerDark ? (
              <div className="mb-2 rounded-lg overflow-hidden border border-border" style={{ height: '120px', background: '#0c0c12' }}>
                <img src={community.bannerDark} alt="Dark banner" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mb-2 rounded-lg border border-dashed border-border bg-[#0c0c12] flex flex-col items-center justify-center gap-1 text-muted" style={{ height: '120px' }}>
                <span className="text-2xl opacity-30">🌙</span>
                <span className="text-xs opacity-60">No dark banner</span>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <ImageUploadButton onUpload={handleBannerDarkUpload} label={community?.bannerDark ? 'Change' : 'Upload Dark Banner'} accept="image/*" />
              {community?.bannerDark && (
                <Button variant="danger" size="sm" onClick={removeBannerDark}>Remove</Button>
              )}
            </div>
          </div>

          {/* Light mode banner */}
          <div>
            <p className="text-xs font-semibold text-muted mb-2">Light Mode Banner</p>
            {community?.bannerLight ? (
              <div className="mb-2 rounded-lg overflow-hidden border border-border" style={{ height: '120px', background: '#f5f4f0' }}>
                <img src={community.bannerLight} alt="Light banner" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mb-2 rounded-lg border border-dashed border-border bg-[#f5f4f0] flex flex-col items-center justify-center gap-1 text-muted" style={{ height: '120px' }}>
                <span className="text-2xl opacity-30">☀️</span>
                <span className="text-xs opacity-60">No light banner</span>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <ImageUploadButton onUpload={handleBannerLightUpload} label={community?.bannerLight ? 'Change' : 'Upload Light Banner'} accept="image/*" />
              {community?.bannerLight && (
                <Button variant="danger" size="sm" onClick={removeBannerLight}>Remove</Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Registration mode */}
      <Card>
        <SectionHeading>Registration Mode</SectionHeading>
        <p className="text-sm text-muted mb-3">
          Current: <span className="text-primary font-medium">
            {registrationMode === 'approval' ? 'Approval Required' : 'Open Registration'}
          </span>
        </p>
        <div className="flex gap-2">
          <Button
            variant={registrationMode === 'open' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setRegMode('open')}
          >
            Open
          </Button>
          <Button
            variant={registrationMode === 'approval' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setRegMode('approval')}
          >
            Approval Required
          </Button>
        </div>
        <p className="text-xs text-muted mt-2">
          {registrationMode === 'approval'
            ? 'New accounts start as Pending and must be approved by an admin.'
            : 'New accounts are activated immediately upon registration.'}
        </p>
      </Card>

      {/* Admin password */}
      <Card>
        <SectionHeading>Admin Password</SectionHeading>
        {pwErr && <Alert type="error">{pwErr}</Alert>}
        {pwOk  && <Alert type="success">{pwOk}</Alert>}
        <form onSubmit={savePw}>
          <Input
            label="Current Password"
            type="password"
            value={pw.current}
            onChange={e => setPw(f => ({ ...f, current: e.target.value }))}
            autoComplete="current-password"
          />
          <Input
            label="New Password"
            type="password"
            value={pw.newPw}
            onChange={e => setPw(f => ({ ...f, newPw: e.target.value }))}
            placeholder="Min 4 characters"
            autoComplete="new-password"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={pw.confirm}
            onChange={e => setPw(f => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          <Button type="submit" full variant="outline">Change Password</Button>
        </form>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/30">
        <SectionHeading>Danger Zone</SectionHeading>
        <p className="text-sm text-muted mb-3">
          Permanently delete all data and reset the app to defaults. This cannot be undone.
        </p>
        <Button variant="danger" onClick={handleReset}>Reset All Data</Button>
      </Card>
    </div>
  );
}
