import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import {
  Card, Button, Input, SectionHeading, Alert,
  ImageUploadButton, Avatar,
} from '../../components/ui.jsx';

// ─── Banner Crop Tool ─────────────────────────────────────────────
// Pure CSS-transform approach, no external libraries.
// Renders final crop to a 1200×220 canvas before saving.
function BannerCropTool({ imageSrc, onSave, onCancel, mode }) {
  const containerRef = useRef(null);
  const [zoom,    setZoom]    = useState(1);
  const [offset,  setOffset]  = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [drag,    setDrag]    = useState(null); // { startX, startY, startOffX, startOffY }
  const [saving,  setSaving]  = useState(false);

  // Load image to get natural dimensions, then auto-fit zoom
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Once image size is known, set initial cover-fit zoom
  useEffect(() => {
    if (!imgSize.w || !containerRef.current) return;
    const cW = containerRef.current.offsetWidth;
    const cH = cW * 220 / 1200;
    const fitZoom = Math.max(cW / imgSize.w, cH / imgSize.h);
    setZoom(fitZoom);
    setOffset({ x: 0, y: 0 });
  }, [imgSize]);

  function getContainerDims() {
    if (!containerRef.current) return { cW: 1, cH: 1 };
    const cW = containerRef.current.offsetWidth;
    const cH = cW * 220 / 1200;
    return { cW, cH };
  }

  function clampOffset(x, y, z) {
    if (!imgSize.w) return { x, y };
    const { cW, cH } = getContainerDims();
    const imgW = imgSize.w * z;
    const imgH = imgSize.h * z;
    const maxX = Math.max(0, (imgW - cW) / 2);
    const maxY = Math.max(0, (imgH - cH) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }

  function handleZoomChange(newZoom) {
    const z = Number(newZoom);
    setZoom(z);
    setOffset(prev => clampOffset(prev.x, prev.y, z));
  }

  // Drag: attach to window while dragging for smooth tracking
  useEffect(() => {
    if (!drag) return;
    function onMove(e) {
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      setOffset(clampOffset(drag.startOffX + dx, drag.startOffY + dy, zoom));
    }
    function onUp() { setDrag(null); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',  onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, zoom]);

  function startDrag(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDrag({ startX: clientX, startY: clientY, startOffX: offset.x, startOffY: offset.y });
  }

  function handleSave() {
    setSaving(true);
    const { cW, cH } = getContainerDims();
    const canvas = document.createElement('canvas');
    canvas.width  = 1200;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');
    const scaleX = 1200 / cW;
    const scaleY = 220  / cH;
    const imgW = imgSize.w * zoom;
    const imgH = imgSize.h * zoom;
    const imgX = (cW - imgW) / 2 + offset.x;
    const imgY = (cH - imgH) / 2 + offset.y;
    const origImg = new Image();
    origImg.onload = () => {
      ctx.drawImage(origImg, imgX * scaleX, imgY * scaleY, imgW * scaleX, imgH * scaleY);
      onSave(canvas.toDataURL('image/jpeg', 0.88));
      setSaving(false);
    };
    origImg.src = imageSrc;
  }

  // Zoom bounds: cover-fit at min, 4× that at max
  const { cW, cH } = getContainerDims();
  const fitZoom = imgSize.w
    ? Math.max(cW / imgSize.w, cH / imgSize.h)
    : 1;
  const minZoom = fitZoom;
  const maxZoom = fitZoom * 4;

  const modeLabel = mode === 'dark' ? 'Dark Mode' : 'Light Mode';
  const bgHint    = mode === 'dark' ? '#0c0c12' : '#f5f4f0';

  return (
    <div className="border border-gold-d rounded-xl p-4 bg-[var(--gold-subtle)] space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">Crop {modeLabel} Banner</p>
        <p className="text-xs text-muted">Banner displays as 1200 × 220 px on the Home page</p>
      </div>

      {/* Preview container — fixed aspect ratio 1200:220 */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border-2 border-gold/40 select-none"
        style={{
          aspectRatio: '1200 / 220',
          background: bgHint,
          cursor: drag ? 'grabbing' : 'grab',
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        {imgSize.w > 0 && (
          <img
            src={imageSrc}
            alt="Banner preview"
            draggable={false}
            style={{
              position:       'absolute',
              width:          `${imgSize.w * zoom}px`,
              height:         `${imgSize.h * zoom}px`,
              left:           `calc(50% - ${(imgSize.w * zoom) / 2}px + ${offset.x}px)`,
              top:            `calc(50% - ${(imgSize.h * zoom) / 2}px + ${offset.y}px)`,
              pointerEvents:  'none',
              userSelect:     'none',
            }}
          />
        )}
        {/* Corner label */}
        <div className="absolute bottom-1 right-2 text-[10px] text-white/60 font-mono pointer-events-none">
          1200 × 220
        </div>
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted w-10 flex-shrink-0">Zoom</span>
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={0.01}
          value={zoom}
          onChange={e => handleZoomChange(e.target.value)}
          className="flex-1 accent-gold"
        />
        <span className="text-xs text-muted w-12 text-right flex-shrink-0">
          {(zoom / fitZoom).toFixed(1)}×
        </span>
      </div>

      <p className="text-xs text-muted">Drag to reposition · Scroll the slider to zoom</p>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !imgSize.w}>
          {saving ? 'Saving…' : 'Save Banner'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Settings Tab ────────────────────────────────────────────
export default function SettingsTab() {
  const {
    community, updateCommunity,
    registrationMode, setRegMode,
    allowPastSubmissions, setAllowPastSubmissions,
    adminPassword, changeAdminPassword,
    resetAll,
  } = useApp();

  const [commName,   setCommName]  = useState(community?.name || '');
  const [commSaved,  setCommSaved] = useState(false);
  const [commErr,    setCommErr]   = useState('');

  const [pw,    setPw]    = useState({ current: '', newPw: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwOk,  setPwOk]  = useState('');

  // Pending crop state: { mode: 'dark' | 'light', src: rawBase64 }
  const [pendingCrop, setPendingCrop] = useState(null);

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

  function removeLogo() {
    updateCommunity({ logo: null });
  }

  // Banner upload → open crop tool instead of saving directly
  function handleBannerSelect(mode, dataUrl) {
    setPendingCrop({ mode, src: dataUrl });
  }

  function handleCropSave(croppedDataUrl) {
    if (pendingCrop.mode === 'dark') {
      updateCommunity({ bannerDark: croppedDataUrl });
    } else {
      updateCommunity({ bannerLight: croppedDataUrl });
    }
    setPendingCrop(null);
  }

  function removeBannerDark()  { updateCommunity({ bannerDark:  null }); }
  function removeBannerLight() { updateCommunity({ bannerLight: null }); }

  // Admin password
  function savePw(e) {
    e.preventDefault();
    setPwErr(''); setPwOk('');
    if (pw.current !== adminPassword)  { setPwErr('Current password is incorrect.'); return; }
    if (pw.newPw.length < 4)           { setPwErr('New password must be at least 4 characters.'); return; }
    if (pw.newPw !== pw.confirm)       { setPwErr('Passwords do not match.'); return; }
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
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-0.5">Community Banners</p>
            <p className="text-xs text-muted">Upload separate versions for dark and light mode. After selecting an image you can crop and position it.</p>
          </div>

          {/* Dark mode banner */}
          <div>
            <p className="text-xs font-semibold text-muted mb-2">Dark Mode Banner</p>

            {pendingCrop?.mode === 'dark' ? (
              <BannerCropTool
                imageSrc={pendingCrop.src}
                mode="dark"
                onSave={handleCropSave}
                onCancel={() => setPendingCrop(null)}
              />
            ) : (
              <>
                {community?.bannerDark ? (
                  <div className="mb-2 rounded-lg overflow-hidden border border-border" style={{ background: '#0c0c12' }}>
                    <img
                      src={community.bannerDark}
                      alt="Dark banner"
                      className="w-full"
                      style={{ display: 'block', aspectRatio: '1200/220', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div className="mb-2 rounded-lg border border-dashed border-border bg-[#0c0c12] flex flex-col items-center justify-center gap-1 text-muted" style={{ height: '80px' }}>
                    <span className="text-2xl opacity-30">🌙</span>
                    <span className="text-xs opacity-60">No dark banner</span>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <ImageUploadButton
                    onUpload={url => handleBannerSelect('dark', url)}
                    label={community?.bannerDark ? 'Change' : 'Upload Dark Banner'}
                    accept="image/*"
                  />
                  {community?.bannerDark && (
                    <Button variant="danger" size="sm" onClick={removeBannerDark}>Remove</Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Light mode banner */}
          <div>
            <p className="text-xs font-semibold text-muted mb-2">Light Mode Banner</p>

            {pendingCrop?.mode === 'light' ? (
              <BannerCropTool
                imageSrc={pendingCrop.src}
                mode="light"
                onSave={handleCropSave}
                onCancel={() => setPendingCrop(null)}
              />
            ) : (
              <>
                {community?.bannerLight ? (
                  <div className="mb-2 rounded-lg overflow-hidden border border-border" style={{ background: '#f5f4f0' }}>
                    <img
                      src={community.bannerLight}
                      alt="Light banner"
                      className="w-full"
                      style={{ display: 'block', aspectRatio: '1200/220', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div className="mb-2 rounded-lg border border-dashed border-border bg-[#f5f4f0] flex flex-col items-center justify-center gap-1 text-muted" style={{ height: '80px' }}>
                    <span className="text-2xl opacity-30">☀️</span>
                    <span className="text-xs opacity-60">No light banner</span>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <ImageUploadButton
                    onUpload={url => handleBannerSelect('light', url)}
                    label={community?.bannerLight ? 'Change' : 'Upload Light Banner'}
                    accept="image/*"
                  />
                  {community?.bannerLight && (
                    <Button variant="danger" size="sm" onClick={removeBannerLight}>Remove</Button>
                  )}
                </div>
              </>
            )}
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

      {/* Submission settings */}
      <Card>
        <SectionHeading>Submission Settings</SectionHeading>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Allow Past Submissions</p>
            <p className="text-xs text-muted mt-0.5">
              When enabled, students can submit or edit activities for any past date in their challenge history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAllowPastSubmissions(!allowPastSubmissions)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold/30 ${
              allowPastSubmissions ? 'bg-gold' : 'bg-border'
            }`}
            aria-checked={allowPastSubmissions}
            role="switch"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              allowPastSubmissions ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
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
