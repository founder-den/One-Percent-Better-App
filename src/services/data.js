// ─────────────────────────────────────────────────────────────────
//  data.js — pure utility functions (no localStorage, no Supabase)
//  Date helpers, ID generation, and theme persistence only.
// ─────────────────────────────────────────────────────────────────

// ─── ID generator ─────────────────────────────────────────────────
export function generateId() {
  return 'id_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
}

// ─── Date helpers (always local time) ────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function parseLocalDate(str) {
  if (!str) return new Date(NaN);
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateToStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function diffDays(fromStr, toStr) {
  return Math.round((parseLocalDate(toStr) - parseLocalDate(fromStr)) / 86400000);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Theme (still localStorage — UI preference, not app data) ────
const THEME_KEY = 'theme';

export function getTheme()   { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch { return 'light'; } }
export function saveTheme(t) { try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ } }

// ─── Session (still localStorage — persists across page reloads) ──
const SESSION_STUDENT_KEY = 'currentStudent';
const ADMIN_TOKEN_KEY     = 'adminToken';

export function getSessionUsername()   { try { return localStorage.getItem(SESSION_STUDENT_KEY) || null; } catch { return null; } }
export function setSessionUsername(u)  { try { localStorage.setItem(SESSION_STUDENT_KEY, u); } catch { /* ignore */ } }
export function clearSessionUsername() { try { localStorage.removeItem(SESSION_STUDENT_KEY); } catch { /* ignore */ } }

export function setAdminSession() {
  const token   = crypto.randomUUID();
  const expires = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  try { localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify({ token, expires })); } catch { /* ignore */ }
  return token;
}

export function getAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!raw) return false;
    const { token, expires } = JSON.parse(raw);
    if (Date.now() > expires) { clearAdminSession(); return false; }
    return !!token;
  } catch { return false; }
}

export function clearAdminSession() {
  try { localStorage.removeItem(ADMIN_TOKEN_KEY); } catch { /* ignore */ }
}
