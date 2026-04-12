// ─────────────────────────────────────────────────────────────────
//  data.js — localStorage service (migrated + extended from data.js v2)
//  All existing keys and shapes are preserved.
//  New fields are added with migration-safe defaults.
// ─────────────────────────────────────────────────────────────────

export const KEYS = {
  COMMUNITY:         'community',
  GROUPS:            'groups',
  STUDENTS:          'students',
  ACTIVITIES:        'activities',
  PERIODS:           'periods',
  REGISTRATION_MODE: 'registrationMode',
  ADMIN_PASSWORD:    'adminPassword',
  ADMIN_SESSION:     'adminSession',
  CURRENT_STUDENT:   'currentStudent',
  THEME:             'theme',
  LEGACY_START:      'challengeStartDate', // migration only
};

// ─── Default seeds ────────────────────────────────────────────────
const DEFAULT_COMMUNITY = { name: 'Kyrgyz Community', logo: null, banner: null, bannerDark: null, bannerLight: null };

const DEFAULT_GROUPS = [
  { id: 'grp_boys',  name: 'College Students Boys',  groupCode: 'BOYS2024',  isActive: true },
  { id: 'grp_girls', name: 'College Students Girls', groupCode: 'GIRLS2024', isActive: true },
];

const DEFAULT_ACTIVITIES_TEMPLATE = [
  { name: 'Reading Book',      points: 10 },
  { name: 'Awwabin Namaz',     points: 20 },
  { name: 'Kaza Namaz',        points: 10 },
  { name: 'Quran Reading',     points: 30 },
  { name: 'Learning New Ayat', points: 20 },
  { name: 'Tahajjud',          points: 25 },
];

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

// ─── Safe storage ─────────────────────────────────────────────────
export function safeGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}

export function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('localStorage write error:', e); }
}

// ─── ID generator ─────────────────────────────────────────────────
export function generateId() {
  return 'id_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
}

// ─── Theme ────────────────────────────────────────────────────────
export function getTheme()       { return safeGet(KEYS.THEME, 'dark'); }
export function saveTheme(t)     { safeSet(KEYS.THEME, t); }

// ─── Community ────────────────────────────────────────────────────
export function getCommunity()   { return safeGet(KEYS.COMMUNITY, DEFAULT_COMMUNITY); }
export function saveCommunity(c) { safeSet(KEYS.COMMUNITY, c); }

// ─── Groups ───────────────────────────────────────────────────────
export function getGroups()          { return safeGet(KEYS.GROUPS, []); }
export function saveGroups(g)        { safeSet(KEYS.GROUPS, g); }
export function findGroupByCode(code) {
  const norm = String(code).trim().toLowerCase();
  return getGroups().find(g => String(g.groupCode || '').trim().toLowerCase() === norm) || null;
}
export function findGroupById(id) {
  return getGroups().find(g => g.id === id) || null;
}

// ─── Students ─────────────────────────────────────────────────────
export function getStudents()    { return safeGet(KEYS.STUDENTS, []); }
export function saveStudents(s)  { safeSet(KEYS.STUDENTS, s); }

// ─── Activities ───────────────────────────────────────────────────
export function getActivities()       { return safeGet(KEYS.ACTIVITIES, []); }
export function saveActivities(a)     { safeSet(KEYS.ACTIVITIES, a); }
export function getActivitiesForGroup(groupId) {
  return getActivities().filter(a => a.groupId === groupId);
}
// Handles both legacy 'active' and new 'isActive'
export function isActActive(act) {
  if (act.isActive !== undefined) return !!act.isActive;
  if (act.active   !== undefined) return !!act.active;
  return true;
}

// ─── Periods ──────────────────────────────────────────────────────
export function getPeriods()              { return safeGet(KEYS.PERIODS, []); }
export function savePeriods(p)            { safeSet(KEYS.PERIODS, p); }
export function getPeriodsForGroup(gid)   { return getPeriods().filter(p => p.groupId === gid); }
export function getActivePeriod(gid) {
  return getPeriodsForGroup(gid).find(p => !!p.isActive) || null;
}
export function periodsOverlap(s1, e1, s2, e2) { return !(e1 < s2 || e2 < s1); }

// ─── Registration mode ────────────────────────────────────────────
export function getRegistrationMode()    { return safeGet(KEYS.REGISTRATION_MODE, 'open'); }
export function saveRegistrationMode(m)  { safeSet(KEYS.REGISTRATION_MODE, m); }

// ─── Admin ────────────────────────────────────────────────────────
export function getAdminPassword()       { return safeGet(KEYS.ADMIN_PASSWORD, 'admin1'); }
export function saveAdminPassword(p)     { safeSet(KEYS.ADMIN_PASSWORD, p); }
export function getAdminSession()        { return safeGet(KEYS.ADMIN_SESSION, false); }
export function setAdminSession(v)       { safeSet(KEYS.ADMIN_SESSION, v); }
export function clearAdminSession()      { localStorage.removeItem(KEYS.ADMIN_SESSION); }

// ─── Student session ──────────────────────────────────────────────
export function getCurrentStudent() {
  const uname = safeGet(KEYS.CURRENT_STUDENT, null);
  if (!uname) return null;
  return getStudents().find(s => s.username === uname) || null;
}
export function setCurrentStudent(s)   { safeSet(KEYS.CURRENT_STUDENT, s.username); }
export function clearCurrentStudent()  { localStorage.removeItem(KEYS.CURRENT_STUDENT); }

// ─── Migration: ensure all new fields exist on old records ────────
function migrateStudent(s, firstGroupId) {
  let dirty = false;
  if (!s.groupId)     { s.groupId     = firstGroupId; dirty = true; }
  if (!s.status)      { s.status      = 'active';     dirty = true; }
  if (!s.submissions) { s.submissions = [];            dirty = true; }
  if (!s.university)  { s.university  = '';            dirty = true; }
  if (!s.phone)       { s.phone       = '';            dirty = true; }
  if (s.avatar === undefined)  { s.avatar = null;      dirty = true; }
  if (!s.tasbih) {
    s.tasbih = { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false };
    dirty = true;
  }
  // Migrate submissions — add quoteLikes if missing
  s.submissions.forEach(sub => {
    if (!sub.quoteLikes) { sub.quoteLikes = []; dirty = true; }
  });
  if (!s.bonusPoints) { s.bonusPoints = []; dirty = true; }
  if (!s.secondaryGroupIds) { s.secondaryGroupIds = []; dirty = true; }
  return dirty;
}

function migrateActivity(a, firstGroupId) {
  let dirty = false;
  if (!a.groupId)          { a.groupId  = firstGroupId; dirty = true; }
  if (a.isActive === undefined) {
    a.isActive = (a.active !== undefined ? !!a.active : true); dirty = true;
  }
  return dirty;
}

function migratePeriod(p) {
  let dirty = false;
  if (p.countForAllTime === undefined) { p.countForAllTime = false; dirty = true; }
  if (p.prizeText === undefined)       { p.prizeText = '';          dirty = true; }
  return dirty;
}

function migrateCommunity(c) {
  let dirty = false;
  if (c.logo        === undefined) { c.logo        = null; dirty = true; }
  if (c.banner      === undefined) { c.banner      = null; dirty = true; }
  if (c.bannerDark  === undefined) { c.bannerDark  = null; dirty = true; }
  if (c.bannerLight === undefined) { c.bannerLight = null; dirty = true; }
  return dirty;
}

// ─── initApp: run on every app start ─────────────────────────────
export function initApp() {
  // Theme
  if (localStorage.getItem(KEYS.THEME) === null) saveTheme('dark');

  // Community
  if (localStorage.getItem(KEYS.COMMUNITY) === null) {
    saveCommunity(DEFAULT_COMMUNITY);
  } else {
    const c = getCommunity();
    if (migrateCommunity(c)) saveCommunity(c);
  }

  // Admin password
  if (localStorage.getItem(KEYS.ADMIN_PASSWORD) === null) saveAdminPassword('admin1');

  // Registration mode
  if (localStorage.getItem(KEYS.REGISTRATION_MODE) === null) saveRegistrationMode('open');

  // Groups
  let groups = getGroups();
  if (!groups.length) {
    groups = DEFAULT_GROUPS.map(g => ({ ...g }));
    saveGroups(groups);
  }
  const firstGroupId = groups[0].id;

  // Students
  if (localStorage.getItem(KEYS.STUDENTS) === null) {
    saveStudents([]);
  } else {
    const students = getStudents();
    let dirty = false;
    students.forEach(s => { if (migrateStudent(s, firstGroupId)) dirty = true; });
    if (dirty) saveStudents(students);
  }

  // Activities
  const actRaw = localStorage.getItem(KEYS.ACTIVITIES);
  if (actRaw === null) {
    const freshActs = [];
    groups.forEach(g => {
      DEFAULT_ACTIVITIES_TEMPLATE.forEach(t => {
        freshActs.push({ id: generateId(), groupId: g.id, name: t.name, points: t.points, isActive: true });
      });
    });
    saveActivities(freshActs);
  } else {
    let acts = getActivities();
    let dirty = false;
    acts.forEach(a => { if (migrateActivity(a, firstGroupId)) dirty = true; });
    if (dirty) saveActivities(acts);
    // Seed for any group missing activities
    groups.forEach(g => {
      const has = getActivities().some(a => a.groupId === g.id);
      if (!has) {
        const all = getActivities();
        DEFAULT_ACTIVITIES_TEMPLATE.forEach(t => {
          all.push({ id: generateId(), groupId: g.id, name: t.name, points: t.points, isActive: true });
        });
        saveActivities(all);
      }
    });
  }

  // Periods
  if (localStorage.getItem(KEYS.PERIODS) === null) {
    const periods = [];
    const legacyRaw = localStorage.getItem(KEYS.LEGACY_START);
    if (legacyRaw) {
      try {
        const legacyStart = JSON.parse(legacyRaw);
        if (legacyStart && /^\d{4}-\d{2}-\d{2}$/.test(legacyStart)) {
          const sD = parseLocalDate(legacyStart);
          const eD = new Date(sD);
          eD.setDate(eD.getDate() + 9);
          periods.push({
            id: generateId(), groupId: firstGroupId, name: 'Period 1',
            startDate: legacyStart, endDate: dateToStr(eD),
            isActive: true, countForAllTime: false, prizeText: '',
          });
        }
      } catch { /* ignore */ }
    }
    savePeriods(periods);
  } else {
    const periods = getPeriods();
    let dirty = false;
    periods.forEach(p => { if (migratePeriod(p)) dirty = true; });
    if (dirty) savePeriods(periods);
  }
}

// ─── Tasbih helpers ───────────────────────────────────────────────
export function getTasbih(student) {
  return student.tasbih || { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false };
}

export function updateTasbih(student, tasbih) {
  const students = getStudents();
  const idx = students.findIndex(s => s.id === student.id);
  if (idx === -1) return;
  students[idx].tasbih = tasbih;
  saveStudents(students);
  return students[idx];
}

// ─── Quote like toggle ────────────────────────────────────────────
// Toggles the currentStudentId's like on a specific submission
export function toggleQuoteLike(ownerId, submissionDate, likerId) {
  const students = getStudents();
  const ownerIdx = students.findIndex(s => s.id === ownerId);
  if (ownerIdx === -1) return;
  const sub = (students[ownerIdx].submissions || []).find(s => s.date === submissionDate);
  if (!sub) return;
  if (!sub.quoteLikes) sub.quoteLikes = [];
  const likerIdx = sub.quoteLikes.indexOf(likerId);
  if (likerIdx === -1) {
    sub.quoteLikes.push(likerId);
  } else {
    sub.quoteLikes.splice(likerIdx, 1);
  }
  saveStudents(students);
}

// ─── Group activity seeder (for new groups added at runtime) ──────
export function seedActivitiesForGroup(groupId) {
  const all = getActivities();
  DEFAULT_ACTIVITIES_TEMPLATE.forEach(t => {
    all.push({ id: generateId(), groupId, name: t.name, points: t.points, isActive: true });
  });
  saveActivities(all);
}

// ─── Global Tasbih ────────────────────────────────────────────────
// Shape: { id, title, description, target, current, completedTimes, isActive, groupScope }
// groupScope: "all" | string[]  (array of group ids)
export function getGlobalTasbihs()     { return safeGet('opb_global_tasbihs', []); }
export function saveGlobalTasbihs(arr) { safeSet('opb_global_tasbihs', arr); }

// ─── Reading Tracker ──────────────────────────────────────────────
// Shape per book: { id, title, author, startDate, totalPages, currentPage, status }
// status: "Reading" | "Finished"
export function getReadingBooks(username)        { return safeGet(`opb_reading_${username}`, []); }
export function saveReadingBooks(username, arr)  { safeSet(`opb_reading_${username}`, arr); }

// ─── Programs ─────────────────────────────────────────────────────
// Shape: { id, name, description, date, groupScope, isActive, tasks: [{ id, type, description, target, order }] }
// type: "todo" | "tasbih"
export function getPrograms()             { return safeGet('opb_programs', []); }
export function savePrograms(arr)         { safeSet('opb_programs', arr); }
export function getProgramsLabel()        { return safeGet('opb_programs_label', 'Programs'); }
export function saveProgramsLabel(label)  { safeSet('opb_programs_label', label); }

// ─── Program Completions (per student) ───────────────────────────
// Shape: [{ programId, taskId, isDone, count }]
export function getProgramCompletions(username)        { return safeGet(`opb_program_completions_${username}`, []); }
export function saveProgramCompletions(username, arr)  { safeSet(`opb_program_completions_${username}`, arr); }

// ─── Collective Program Task Counts ──────────────────────────────
// Shared counter for tasks with mode === 'collective'
// Shape: { count: number, completedTimes: number }
export function getCollectiveTaskCount(taskId)        { return safeGet(`opb_prog_collective_${taskId}`, { count: 0, completedTimes: 0 }); }
export function saveCollectiveTaskCount(taskId, data) { safeSet(`opb_prog_collective_${taskId}`, data); }

// ─── Personal Tasbih Templates (admin-created goals) ─────────────
// Shape: [{ id, title, description, target, groupScope, isActive }]
// groupScope: "all" | string[]
export function getPersonalTasbihTemplates()     { return safeGet('opb_personal_tasbih_templates', []); }
export function savePersonalTasbihTemplates(arr) { safeSet('opb_personal_tasbih_templates', arr); }

// ─── Per-student personal template progress ───────────────────────
// Shape: { count: number }
export function getPersonalTplProgress(username, templateId)         { return safeGet(`opb_personal_tpl_${username}_${templateId}`, { count: 0 }); }
export function savePersonalTplProgress(username, templateId, data)  { safeSet(`opb_personal_tpl_${username}_${templateId}`, data); }
