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

// ─── ENSURE COMMUNITY ─────────────────────────────────────────────
// Checks if communities table has a row. If not, inserts the default.
// Returns the community id (always 'main') or null on failure.
// Call this once on app startup before anything else writes to Supabase.
let _communityId = null; // module-level cache

export async function dbEnsureCommunity() {
  if (_communityId) return _communityId; // already confirmed this session

  console.log('[db] dbEnsureCommunity — checking communities table');
  try {
    const { data, error } = await supabase.from('communities').select('id').eq('id', 'main').maybeSingle();
    if (error) throw error;

    if (data) {
      console.log('[db] ✓ dbEnsureCommunity — community exists:', data.id);
      _communityId = data.id;
      return _communityId;
    }

    // No row — insert default community
    console.log('[db] dbEnsureCommunity — no community found, inserting default');
    const { data: inserted, error: insertError } = await supabase
      .from('communities')
      .insert({ id: 'main', name: 'Kyrgyz Community Center' })
      .select('id')
      .single();
    if (insertError) throw insertError;

    console.log('[db] ✓ dbEnsureCommunity — default community inserted, id:', inserted.id);
    _communityId = inserted.id;
    return _communityId;
  } catch (e) {
    console.error('[db] dbEnsureCommunity — FAILED:', e);
    return null;
  }
}

// ─── COMMUNITY LOAD ───────────────────────────────────────────────
export async function dbLoadCommunity() {
  console.log('[db] dbLoadCommunity — fetching from Supabase');
  try {
    const { data, error } = await supabase.from('communities').select('*').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (data) {
      const community = {
        name:        data.name         || '',
        logo:        data.logo         ?? null,
        banner:      data.banner       ?? null,
        bannerDark:  data.banner_dark  ?? null,
        bannerLight: data.banner_light ?? null,
      };
      console.log('[db] ✓ dbLoadCommunity — loaded from Supabase');
      return community;
    }
    console.log('[db] dbLoadCommunity — no row in Supabase, falling back to localStorage');
  } catch (e) {
    console.error('[db] dbLoadCommunity — Supabase error, falling back to localStorage:', e);
  }
  return lsGet('community', null);
}

// ─── GROUPS LOAD ──────────────────────────────────────────────────
export async function dbLoadGroups() {
  console.log('[db] dbLoadGroups — fetching from Supabase');
  try {
    const { data, error } = await supabase.from('groups').select('*');
    if (error) throw error;
    if (data && data.length > 0) {
      const groups = data.map(r => ({ id: r.id, name: r.name, groupCode: r.group_code, isActive: r.is_active }));
      lsSave('groups', groups); // keep localStorage in sync
      console.log(`[db] ✓ dbLoadGroups — ${groups.length} groups loaded from Supabase`);
      return groups;
    }
    console.log('[db] dbLoadGroups — no rows in Supabase, falling back to localStorage');
  } catch (e) {
    console.error('[db] dbLoadGroups — Supabase error, falling back to localStorage:', e);
  }
  return lsGet('groups', []);
}

// ─── loadAll ──────────────────────────────────────────────────────
export async function loadAll() {
  console.log('[db] loadAll — loading all app data…');

  const [community, groups] = await Promise.all([dbLoadCommunity(), dbLoadGroups()]);

  // ── Students (Supabase first, merged with localStorage nested data) ──
  let students;
  try {
    const { data: rows, error } = await supabase.from('students').select('*');
    if (error) throw error;

    const lsStudents = getStudents();
    const supabaseStudents = (rows || []).map(row => {
      const ls = lsStudents.find(s => s.id === row.id) || {};
      return mergeStudent(row, ls);
    });

    const supabaseIds = new Set((rows || []).map(r => r.id));
    const lsOnly = lsStudents.filter(s => !supabaseIds.has(s.id));

    students = [...supabaseStudents, ...lsOnly];
    console.log(`[db] loadAll — ${students.length} students (${supabaseStudents.length} from Supabase, ${lsOnly.length} local-only)`);
    saveStudents(students);
  } catch (e) {
    console.error('[db] loadAll — students Supabase error, falling back to localStorage:', e);
    students = getStudents();
  }

  const adminSettings = lsGet('adminSettings', {
    adminUsername: 'admin', adminPassword: 'admin1',
    registrationMode: 'open', programsLabel: 'Programs',
  });

  return {
    community,
    adminSettings,
    groups,
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
export async function dbSaveCommunity(fields) {
  console.log('[db] saveCommunity — writing to Supabase');
  const { error } = await supabase.from('communities').upsert({
    id:           'main',
    name:         fields.name        || '',
    logo:         fields.logo        ?? null,
    banner:       fields.banner      ?? null,
    banner_dark:  fields.bannerDark  ?? null,
    banner_light: fields.bannerLight ?? null,
  }, { onConflict: 'id' });
  if (error) {
    console.error('[db] saveCommunity — Supabase write FAILED:', error);
    return false;
  }
  lsSave('community', fields); // backup
  console.log('[db] ✓ saveCommunity — saved to Supabase');
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
export async function dbAddGroup(group) {
  console.log('[db] addGroup — writing to Supabase:', group.name);

  const communityId = await dbEnsureCommunity();
  if (!communityId) {
    console.error('[db] addGroup — cannot insert without a community_id');
    return null;
  }

  const { error } = await supabase.from('groups').insert({
    id:           group.id,
    name:         group.name,
    group_code:   group.groupCode,
    is_active:    group.isActive ?? true,
    community_id: communityId,
  });
  if (error) {
    console.error('[db] addGroup — Supabase write FAILED:', error);
    return null;
  }
  const arr = lsGet('groups', []);
  arr.push(group);
  lsSave('groups', arr); // backup
  console.log('[db] ✓ addGroup — saved to Supabase:', group.name);
  return group;
}

export async function dbUpdateGroup(id, fields) {
  console.log('[db] updateGroup — writing to Supabase:', id);
  const row = {};
  if (fields.name      !== undefined) row.name       = fields.name;
  if (fields.groupCode !== undefined) row.group_code = fields.groupCode;
  if (fields.isActive  !== undefined) row.is_active  = fields.isActive;
  const { error } = await supabase.from('groups').update(row).eq('id', id);
  if (error) {
    console.error('[db] updateGroup — Supabase write FAILED:', error);
    return false;
  }
  lsSave('groups', lsGet('groups', []).map(g => g.id === id ? { ...g, ...fields } : g)); // backup
  console.log('[db] ✓ updateGroup — saved to Supabase:', id);
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
