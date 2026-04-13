// ─────────────────────────────────────────────────────────────────
//  db.js — localStorage for everything.
//
//  EXCEPTIONS (Supabase):
//    loadAll       — students are fetched from Supabase (enables login validation)
//    dbRegisterStudent — INSERTs into Supabase students table
//
//  All other reads/writes go to localStorage.
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js';
import { generateId } from './data.js';

// ─── localStorage helpers ─────────────────────────────────────────
function lsGet(key, def = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch { return def; }
}
function lsSave(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.error('[db] localStorage write error:', key, e); }
}

// ─── Student helpers ──────────────────────────────────────────────
function getStudents() { return lsGet('students', []); }
function saveStudents(arr) { lsSave('students', arr); }

// Merge a Supabase student row with its localStorage counterpart.
// localStorage takes precedence for all mutable fields; Supabase
// provides username/password as the auth source of truth.
function mergeStudent(row, ls = {}) {
  return {
    id:                     row.id,
    fullName:               ls.fullName               || row.full_name                || '',
    username:               row.username,                      // auth — from Supabase
    password:               row.password,                      // auth — from Supabase
    groupId:                ls.groupId                ?? row.group_id,
    secondaryGroupIds:      ls.secondaryGroupIds       || row.secondary_group_ids      || [],
    status:                 ls.status                 ?? row.status,
    university:             ls.university              || row.university               || '',
    phone:                  ls.phone                  || row.phone                    || '',
    avatar:                 ls.avatar                 ?? row.avatar                   ?? null,
    tasbih:                 ls.tasbih                 || { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false },
    personalTasbihProgress: ls.personalTasbihProgress || {},
    submissions:            ls.submissions            || [],
    bonusPoints:            ls.bonusPoints            || [],
    books:                  ls.books                  || [],
    programCompletions:     ls.programCompletions     || [],
  };
}

// ─── loadAll ──────────────────────────────────────────────────────
// Students come from Supabase (merged with localStorage nested data).
// Everything else comes from localStorage.
export async function loadAll() {
  console.log('[db] loadAll — fetching students from Supabase, rest from localStorage');

  let students;
  try {
    const { data: rows, error } = await supabase.from('students').select('*');
    if (error) throw error;

    const lsStudents = getStudents();
    const supabaseStudents = (rows || []).map(row => {
      const ls = lsStudents.find(s => s.id === row.id) || {};
      return mergeStudent(row, ls);
    });

    // Include any localStorage-only students (in case Supabase INSERT failed during registration)
    const supabaseIds = new Set((rows || []).map(r => r.id));
    const lsOnly = lsStudents.filter(s => !supabaseIds.has(s.id));

    students = [...supabaseStudents, ...lsOnly];
    console.log(`[db] loadAll — ${students.length} students (${supabaseStudents.length} from Supabase, ${lsOnly.length} local-only)`);

    // Persist the merged list so mutations can update it
    saveStudents(students);
  } catch (e) {
    console.error('[db] Could not load students from Supabase — falling back to localStorage:', e);
    students = getStudents();
  }

  const adminSettings = lsGet('adminSettings', {
    adminUsername: 'admin', adminPassword: 'admin1',
    registrationMode: 'open', programsLabel: 'Programs',
  });

  console.log('[db] loadAll — loaded from localStorage:', {
    community: !!lsGet('community'),
    groups: lsGet('groups', []).length,
    students: students.length,
    activities: lsGet('activities', []).length,
    periods: lsGet('periods', []).length,
  });

  return {
    community:               lsGet('community', null),
    adminSettings,
    groups:                  lsGet('groups', []),
    students,
    activities:              lsGet('activities', []),
    periods:                 lsGet('periods', []),
    globalTasbihs:           lsGet('globalTasbihs', []),
    personalTasbihTemplates: lsGet('personalTasbihTemplates', []),
    programs:                lsGet('programs', []),
    collectiveTaskCounts:    lsGet('collectiveTaskCounts', {}),
  };
}

// ─── COMMUNITY ────────────────────────────────────────────────────
export function dbSaveCommunity(fields) {
  console.log('[db] saveCommunity');
  lsSave('community', fields);
  return true;
}

// ─── ADMIN SETTINGS ───────────────────────────────────────────────
export function dbSaveAdminSettings(fields) {
  console.log('[db] saveAdminSettings:', Object.keys(fields));
  const current = lsGet('adminSettings', {
    adminUsername: 'admin', adminPassword: 'admin1',
    registrationMode: 'open', programsLabel: 'Programs',
  });
  lsSave('adminSettings', { ...current, ...fields });
  return true;
}

// ─── GROUPS ───────────────────────────────────────────────────────
export function dbAddGroup(group) {
  console.log('[db] addGroup:', group.name);
  const groups = lsGet('groups', []);
  groups.push(group);
  lsSave('groups', groups);
  return group;
}

export function dbUpdateGroup(id, fields) {
  console.log('[db] updateGroup:', id);
  lsSave('groups', lsGet('groups', []).map(g => g.id === id ? { ...g, ...fields } : g));
  return true;
}

// ─── ACTIVITIES ───────────────────────────────────────────────────
export function dbAddActivity(act) {
  console.log('[db] addActivity:', act.name);
  const acts = lsGet('activities', []);
  acts.push(act);
  lsSave('activities', acts);
  return act;
}

export function dbAddActivities(acts) {
  console.log('[db] addActivities:', acts.length);
  lsSave('activities', [...lsGet('activities', []), ...acts]);
  return acts;
}

export function dbUpdateActivity(id, fields) {
  console.log('[db] updateActivity:', id);
  lsSave('activities', lsGet('activities', []).map(a => a.id === id ? { ...a, ...fields } : a));
  return true;
}

// ─── PERIODS ──────────────────────────────────────────────────────
export function dbAddPeriod(period) {
  console.log('[db] addPeriod:', period.name);
  const periods = lsGet('periods', []);
  periods.push(period);
  lsSave('periods', periods);
  return period;
}

export function dbUpdatePeriod(id, fields) {
  console.log('[db] updatePeriod:', id);
  lsSave('periods', lsGet('periods', []).map(p => p.id === id ? { ...p, ...fields } : p));
  return true;
}

export function dbDeletePeriod(id) {
  console.log('[db] deletePeriod:', id);
  lsSave('periods', lsGet('periods', []).filter(p => p.id !== id));
  return true;
}

export function dbActivatePeriod(id, groupId) {
  console.log('[db] activatePeriod:', id, groupId);
  lsSave('periods', lsGet('periods', []).map(p =>
    p.groupId === groupId ? { ...p, isActive: p.id === id } : p
  ));
  return true;
}

// ─── STUDENTS ─────────────────────────────────────────────────────
// registerStudent — INSERT into Supabase, then save to localStorage.
export async function dbRegisterStudent(student) {
  console.log('[db] registerStudent:', student.username, '— inserting into Supabase');

  const { error } = await supabase.from('students').insert({
    id:                      student.id,
    full_name:               student.fullName,
    username:                student.username,
    password:                student.password,
    group_id:                student.groupId,
    secondary_group_ids:     student.secondaryGroupIds || [],
    status:                  student.status,
    university:              student.university || '',
    phone:                   student.phone || '',
    avatar:                  student.avatar || null,
    tasbih:                  student.tasbih || { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false },
    personal_tasbih_progress: student.personalTasbihProgress || {},
  });

  if (error) {
    console.error('[db] registerStudent Supabase error — saving to localStorage only:', error);
  } else {
    console.log('[db] ✓ registerStudent — inserted into Supabase:', student.username);
  }

  // Always save to localStorage so the app works even if Supabase INSERT failed
  const students = getStudents();
  const full = { ...student, submissions: [], bonusPoints: [], books: [], programCompletions: [] };
  students.push(full);
  saveStudents(students);

  return full;
}

export function dbUpdateStudent(id, fields) {
  console.log('[db] updateStudent:', id, Object.keys(fields));
  saveStudents(getStudents().map(s => s.id === id ? { ...s, ...fields } : s));
  return true;
}

export function dbDeleteStudent(id) {
  console.log('[db] deleteStudent:', id);
  saveStudents(getStudents().filter(s => s.id !== id));
  return true;
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────
export function dbSubmitDay(studentId, dateStr, completedActivities, quote) {
  console.log('[db] submitDay:', studentId, dateStr);
  saveStudents(getStudents().map(s => {
    if (s.id !== studentId) return s;
    const already = (s.submissions || []).some(x => x.date === dateStr);
    if (already) return s;
    return { ...s, submissions: [...(s.submissions || []), { date: dateStr, completedActivities, quote: quote || '', quoteLikes: [] }] };
  }));
  return true;
}

export function dbEditSubmission(studentId, dateStr, completedActivities) {
  console.log('[db] editSubmission:', studentId, dateStr);
  saveStudents(getStudents().map(s => {
    if (s.id !== studentId) return s;
    const subs = (s.submissions || []).map(sub =>
      sub.date === dateStr ? { ...sub, completedActivities } : sub
    );
    const exists = subs.some(sub => sub.date === dateStr);
    return { ...s, submissions: exists ? subs : [...subs, { date: dateStr, completedActivities, quote: '', quoteLikes: [] }] };
  }));
  return true;
}

export function dbToggleQuoteLike(ownerId, dateStr, likerId) {
  console.log('[db] toggleQuoteLike:', ownerId, dateStr, likerId);
  saveStudents(getStudents().map(s => {
    if (s.id !== ownerId) return s;
    const subs = (s.submissions || []).map(sub => {
      if (sub.date !== dateStr) return sub;
      const likes = sub.quoteLikes || [];
      const already = likes.includes(likerId);
      return { ...sub, quoteLikes: already ? likes.filter(l => l !== likerId) : [...likes, likerId] };
    });
    return { ...s, submissions: subs };
  }));
  return true;
}

// ─── BONUS POINTS ─────────────────────────────────────────────────
export function dbAddBonusPoints(studentId, date, points, reason) {
  console.log('[db] addBonusPoints:', studentId, points);
  const bp = { id: generateId(), date, points: Number(points), reason };
  saveStudents(getStudents().map(s => {
    if (s.id !== studentId) return s;
    return { ...s, bonusPoints: [...(s.bonusPoints || []), bp] };
  }));
  return bp;
}

// ─── STUDENT TASBIH ───────────────────────────────────────────────
export function dbUpdateTasbih(studentId, tasbih) {
  console.log('[db] updateTasbih:', studentId);
  saveStudents(getStudents().map(s => s.id === studentId ? { ...s, tasbih } : s));
  return true;
}

// ─── GLOBAL TASBIH ────────────────────────────────────────────────
export function dbAddGlobalTasbih(t) {
  console.log('[db] addGlobalTasbih:', t.title);
  const arr = lsGet('globalTasbihs', []);
  arr.push(t);
  lsSave('globalTasbihs', arr);
  return t;
}

export function dbUpdateGlobalTasbih(id, fields) {
  console.log('[db] updateGlobalTasbih:', id);
  lsSave('globalTasbihs', lsGet('globalTasbihs', []).map(t => t.id === id ? { ...t, ...fields } : t));
  return true;
}

// ─── PERSONAL TASBIH TEMPLATES ────────────────────────────────────
export function dbAddPersonalTemplate(t) {
  console.log('[db] addPersonalTemplate:', t.title);
  const arr = lsGet('personalTasbihTemplates', []);
  arr.push(t);
  lsSave('personalTasbihTemplates', arr);
  return t;
}

export function dbUpdatePersonalTemplate(id, fields) {
  console.log('[db] updatePersonalTemplate:', id);
  lsSave('personalTasbihTemplates', lsGet('personalTasbihTemplates', []).map(t => t.id === id ? { ...t, ...fields } : t));
  return true;
}

export function dbDeletePersonalTemplate(id) {
  console.log('[db] deletePersonalTemplate:', id);
  lsSave('personalTasbihTemplates', lsGet('personalTasbihTemplates', []).filter(t => t.id !== id));
  return true;
}

// ─── PERSONAL TASBIH PROGRESS ─────────────────────────────────────
export function dbSavePersonalTplProgress(studentId, fullProgress) {
  console.log('[db] savePersonalTplProgress:', studentId);
  saveStudents(getStudents().map(s =>
    s.id === studentId ? { ...s, personalTasbihProgress: fullProgress } : s
  ));
  return true;
}

// ─── READING BOOKS ────────────────────────────────────────────────
export function dbAddBook(studentId, book) {
  console.log('[db] addBook:', studentId, book.title);
  saveStudents(getStudents().map(s => {
    if (s.id !== studentId) return s;
    return { ...s, books: [...(s.books || []), book] };
  }));
  return book;
}

export function dbUpdateBook(bookId, fields) {
  console.log('[db] updateBook:', bookId);
  saveStudents(getStudents().map(s => ({
    ...s, books: (s.books || []).map(b => b.id === bookId ? { ...b, ...fields } : b),
  })));
  return true;
}

export function dbDeleteBook(bookId) {
  console.log('[db] deleteBook:', bookId);
  saveStudents(getStudents().map(s => ({
    ...s, books: (s.books || []).filter(b => b.id !== bookId),
  })));
  return true;
}

// ─── PROGRAMS ─────────────────────────────────────────────────────
export function dbAddProgram(program) {
  console.log('[db] addProgram:', program.name);
  const arr = lsGet('programs', []);
  arr.push(program);
  lsSave('programs', arr);
  return program;
}

export function dbUpdateProgram(id, fields) {
  console.log('[db] updateProgram:', id);
  lsSave('programs', lsGet('programs', []).map(p => p.id === id ? { ...p, ...fields } : p));
  return true;
}

export function dbDeleteProgram(id) {
  console.log('[db] deleteProgram:', id);
  lsSave('programs', lsGet('programs', []).filter(p => p.id !== id));
  return true;
}

// ─── PROGRAM COMPLETIONS ──────────────────────────────────────────
export function dbSaveProgramCompletion(studentId, programId, taskId, isDone, count) {
  console.log('[db] saveProgramCompletion:', studentId, taskId);
  saveStudents(getStudents().map(s => {
    if (s.id !== studentId) return s;
    const comps = s.programCompletions || [];
    const existing = comps.find(c => c.taskId === taskId);
    const updated = existing
      ? comps.map(c => c.taskId === taskId ? { ...c, isDone, count } : c)
      : [...comps, { id: generateId(), programId, taskId, isDone, count }];
    return { ...s, programCompletions: updated };
  }));
  return true;
}

// ─── COLLECTIVE TASK COUNTS ───────────────────────────────────────
export function dbUpdateCollectiveTask(taskId, count, completedTimes) {
  console.log('[db] updateCollectiveTask:', taskId, count);
  const counts = lsGet('collectiveTaskCounts', {});
  counts[taskId] = { count, completedTimes };
  lsSave('collectiveTaskCounts', counts);
  return true;
}

// ─── Realtime subscriptions (no-ops for localStorage version) ─────
export function subscribeToGlobalTasbihs(_cb) { return () => {}; }
export function subscribeToStudents(_cb)      { return () => {}; }
export function subscribeToSubmissions(_cb)   { return () => {}; }
