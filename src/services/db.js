// ─────────────────────────────────────────────────────────────────
//  db.js — Supabase is the SINGLE source of truth.
//
//  Return contract:
//    INSERT functions → return the confirmed row (camelCase) or null on failure
//    UPDATE / DELETE functions → return true on success, false on failure
//    loadAll → returns assembled state object or throws
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js';
import { generateId } from './data.js';

// ─── Logging helpers ──────────────────────────────────────────────
function logSuccess(label, detail) {
  console.log(`[db] ✓ ${label}`, detail ?? '');
}

// Logs full error object; returns true if there was an error.
function logErr(label, error) {
  if (!error) return false;
  console.error(`[db] ✗ ${label} — code: ${error.code}, message: ${error.message}`, error);
  return true;
}

// ─── Shape converters (DB row → app camelCase) ────────────────────
function rowToGroup(r) {
  return { id: r.id, name: r.name, groupCode: r.group_code, isActive: r.is_active };
}

function rowToActivity(r) {
  return { id: r.id, groupId: r.group_id, name: r.name, points: r.points, isActive: r.is_active };
}

function rowToPeriod(r) {
  return {
    id: r.id, groupId: r.group_id, name: r.name,
    startDate: r.start_date, endDate: r.end_date,
    isActive: r.is_active, countForAllTime: r.count_for_all_time, prizeText: r.prize_text,
  };
}

// rowToStudent does NOT attach submissions/bonusPoints/books/programCompletions —
// those are joined in loadAll. When returning a freshly-inserted student, the
// caller attaches empty arrays.
function rowToStudent(r) {
  return {
    id: r.id,
    fullName: r.full_name,
    username: r.username,
    password: r.password,
    groupId: r.group_id,
    secondaryGroupIds: r.secondary_group_ids || [],
    status: r.status,
    university: r.university || '',
    phone: r.phone || '',
    avatar: r.avatar || null,
    tasbih: r.tasbih || { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false },
    personalTasbihProgress: r.personal_tasbih_progress || {},
  };
}

function rowToBook(r) {
  return {
    id: r.id, title: r.title, author: r.author || '',
    startDate: r.start_date || '', totalPages: r.total_pages || 0,
    currentPage: r.current_page || 0, status: r.status || 'Reading',
    lastUpdated: r.last_updated || '',
  };
}

function rowToCompletion(r) {
  return { id: r.id, programId: r.program_id, taskId: r.task_id, isDone: r.is_done, count: r.count };
}

function rowToGlobalTasbih(r) {
  return {
    id: r.id, title: r.title, description: r.description,
    target: r.target, current: r.current, completedTimes: r.completed_times,
    isActive: r.is_active, groupScope: r.group_scope,
  };
}

function rowToPersonalTemplate(r) {
  return {
    id: r.id, title: r.title, description: r.description,
    target: r.target, groupScope: r.group_scope, isActive: r.is_active,
  };
}

function rowToProgram(r, tasksMap) {
  const tasks = (tasksMap[r.id] || []).map(t => ({
    id: t.id, type: t.type, description: t.description,
    target: t.target, order: t.task_order, mode: t.mode || 'individual',
    collectiveCount: t.collective_count || 0,
    collectiveCompletedTimes: t.collective_completed_times || 0,
  }));
  tasks.sort((a, b) => a.order - b.order);
  return {
    id: r.id, name: r.name, description: r.description,
    date: r.date, groupScope: r.group_scope, isActive: r.is_active, tasks,
  };
}

// ─── LOAD ALL ─────────────────────────────────────────────────────
// Fetches everything from Supabase and assembles the full app state.
// Throws on critical failures (missing tables, permission denied).
export async function loadAll() {
  console.log('[db] loadAll: fetching all data from Supabase…');

  const [
    { data: communityRow,   error: e1  },
    { data: adminRow,       error: e2  },
    { data: groupRows,      error: e3  },
    { data: studentRows,    error: e4  },
    { data: activityRows,   error: e5  },
    { data: periodRows,     error: e6  },
    { data: subRows,        error: e7  },
    { data: quoteRows,      error: e8  },
    { data: likeRows,       error: e9  },
    { data: bonusRows,      error: e10 },
    { data: globalRows,     error: e11 },
    { data: personalRows,   error: e12 },
    { data: bookRows,       error: e13 },
    { data: programRows,    error: e14 },
    { data: taskRows,       error: e15 },
    { data: completionRows, error: e16 },
  ] = await Promise.all([
    supabase.from('communities').select('*').eq('id', 'main').maybeSingle(),
    supabase.from('admin_settings').select('*').eq('id', 'main').maybeSingle(),
    supabase.from('groups').select('*'),
    supabase.from('students').select('*'),
    supabase.from('activities').select('*'),
    supabase.from('periods').select('*'),
    supabase.from('submissions').select('*'),
    supabase.from('quotes').select('*'),
    supabase.from('quote_likes').select('*'),
    supabase.from('bonus_points').select('*'),
    supabase.from('tasbih_global').select('*'),
    supabase.from('tasbih_personal').select('*'),
    supabase.from('reading_books').select('*'),
    supabase.from('programs').select('*'),
    supabase.from('program_tasks').select('*'),
    supabase.from('program_completions').select('*'),
  ]);

  // Critical tables: groups, students, activities — if these fail the app cannot run
  for (const err of [e3, e4, e5].filter(Boolean)) {
    if (err.code === '42P01') {
      throw new Error(
        'Database tables not found. Run the SQL setup script in your Supabase SQL editor.'
      );
    }
    if (err.code === '42501' || err.message?.includes('row-level security')) {
      throw new Error(
        'Permission denied. In Supabase SQL editor run:\n' +
        'ALTER TABLE students DISABLE ROW LEVEL SECURITY;\n' +
        '(and the same for all other tables)'
      );
    }
    throw new Error(`Database error loading data: ${err.message}`);
  }

  // Log non-critical errors (singleton rows may simply not exist yet)
  [e1, e2, e6, e7, e8, e9, e10, e11, e12, e13, e14, e15, e16].forEach((e, i) => {
    if (e) console.warn(`[db] loadAll non-critical error index ${i + 1}:`, e.message);
  });

  // Build lookup maps for O(1) assembly
  const quotesMap = {};
  (quoteRows || []).forEach(q => { quotesMap[`${q.student_id}|${q.date}`] = q; });

  const likesMap = {};
  (likeRows || []).forEach(l => {
    if (!likesMap[l.quote_id]) likesMap[l.quote_id] = [];
    likesMap[l.quote_id].push(l.liker_id);
  });

  const tasksMap = {};
  (taskRows || []).forEach(t => {
    if (!tasksMap[t.program_id]) tasksMap[t.program_id] = [];
    tasksMap[t.program_id].push(t);
  });

  // Assemble students with their related rows
  const students = (studentRows || []).map(r => ({
    ...rowToStudent(r),
    submissions: [], bonusPoints: [], books: [], programCompletions: [],
  }));
  const studentById = {};
  students.forEach(s => { studentById[s.id] = s; });

  (subRows || []).forEach(r => {
    if (!studentById[r.student_id]) return;
    const quote = quotesMap[`${r.student_id}|${r.date}`] || null;
    const quoteLikes = quote ? (likesMap[quote.id] || []) : [];
    studentById[r.student_id].submissions.push({
      _id: r.id, date: r.date,
      completedActivities: r.completed_activities || [],
      quote: quote ? quote.text : '',
      quoteId: quote ? quote.id : null,
      quoteLikes,
    });
  });
  (bonusRows || []).forEach(r => {
    if (studentById[r.student_id]) {
      studentById[r.student_id].bonusPoints.push({
        id: r.id, date: r.date, points: r.points, reason: r.reason,
      });
    }
  });
  (bookRows || []).forEach(r => {
    if (studentById[r.student_id]) {
      studentById[r.student_id].books.push(rowToBook(r));
    }
  });
  (completionRows || []).forEach(r => {
    if (studentById[r.student_id]) {
      studentById[r.student_id].programCompletions.push(rowToCompletion(r));
    }
  });

  // Collective task counts from program_tasks rows
  const collectiveTaskCounts = {};
  (taskRows || []).forEach(t => {
    collectiveTaskCounts[t.id] = {
      count: t.collective_count || 0,
      completedTimes: t.collective_completed_times || 0,
    };
  });

  console.log(
    `[db] loadAll: success — ${students.length} students, ${(groupRows||[]).length} groups, ` +
    `${(activityRows||[]).length} activities, ${(programRows||[]).length} programs`
  );

  return {
    // community is null if no row exists — no mock data
    community: communityRow ? {
      name:        communityRow.name,
      logo:        communityRow.logo         || null,
      banner:      communityRow.banner       || null,
      bannerDark:  communityRow.banner_dark  || null,
      bannerLight: communityRow.banner_light || null,
    } : null,

    // adminSettings falls back to defaults so the app stays functional
    adminSettings: adminRow ? {
      adminUsername:    adminRow.admin_username,
      adminPassword:    adminRow.admin_password,
      registrationMode: adminRow.registration_mode,
      programsLabel:    adminRow.programs_label,
    } : { adminUsername: 'admin', adminPassword: 'admin1', registrationMode: 'open', programsLabel: 'Programs' },

    groups:                  (groupRows    || []).map(rowToGroup),
    students,
    activities:              (activityRows || []).map(rowToActivity),
    periods:                 (periodRows   || []).map(rowToPeriod),
    globalTasbihs:           (globalRows   || []).map(rowToGlobalTasbih),
    personalTasbihTemplates: (personalRows || []).map(rowToPersonalTemplate),
    programs:                (programRows  || []).map(r => rowToProgram(r, tasksMap)),
    collectiveTaskCounts,
  };
}

// ─── COMMUNITY ────────────────────────────────────────────────────
export async function dbSaveCommunity(fields) {
  console.log('[db] saveCommunity:', fields);
  const { error } = await supabase.from('communities').upsert({
    id:           'main',
    name:         fields.name         || '',
    logo:         fields.logo         ?? null,
    banner:       fields.banner       ?? null,
    banner_dark:  fields.bannerDark   ?? null,
    banner_light: fields.bannerLight  ?? null,
  }, { onConflict: 'id' });
  if (logErr('saveCommunity', error)) return false;
  logSuccess('saveCommunity');
  return true;
}

// ─── ADMIN SETTINGS ───────────────────────────────────────────────
export async function dbSaveAdminSettings(fields) {
  console.log('[db] saveAdminSettings:', Object.keys(fields));
  const row = { id: 'main' };
  if (fields.adminUsername    !== undefined) row.admin_username    = fields.adminUsername;
  if (fields.adminPassword    !== undefined) row.admin_password    = fields.adminPassword;
  if (fields.registrationMode !== undefined) row.registration_mode = fields.registrationMode;
  if (fields.programsLabel    !== undefined) row.programs_label    = fields.programsLabel;
  const { error } = await supabase.from('admin_settings').upsert(row, { onConflict: 'id' });
  if (logErr('saveAdminSettings', error)) return false;
  logSuccess('saveAdminSettings', Object.keys(fields));
  return true;
}

// ─── GROUPS ───────────────────────────────────────────────────────
export async function dbAddGroup(group) {
  console.log('[db] addGroup:', group.name);
  const { data, error } = await supabase.from('groups').insert({
    id: group.id, name: group.name, group_code: group.groupCode, is_active: group.isActive ?? true,
  }).select().single();
  if (logErr('addGroup', error)) return null;
  logSuccess('addGroup', data.id);
  return rowToGroup(data);
}

export async function dbUpdateGroup(id, fields) {
  console.log('[db] updateGroup:', id, fields);
  const update = {};
  if (fields.name      !== undefined) update.name       = fields.name;
  if (fields.groupCode !== undefined) update.group_code = fields.groupCode;
  if (fields.isActive  !== undefined) update.is_active  = fields.isActive;
  const { error } = await supabase.from('groups').update(update).eq('id', id);
  if (logErr('updateGroup', error)) return false;
  logSuccess('updateGroup', id);
  return true;
}

// ─── ACTIVITIES ───────────────────────────────────────────────────
export async function dbAddActivity(activity) {
  console.log('[db] addActivity:', activity.name);
  const { data, error } = await supabase.from('activities').insert({
    id: activity.id, group_id: activity.groupId,
    name: activity.name, points: activity.points, is_active: activity.isActive ?? true,
  }).select().single();
  if (logErr('addActivity', error)) return null;
  logSuccess('addActivity', data.id);
  return rowToActivity(data);
}

export async function dbAddActivities(activities) {
  if (!activities.length) return [];
  console.log('[db] addActivities:', activities.length, 'rows');
  const { data, error } = await supabase.from('activities').insert(
    activities.map(a => ({
      id: a.id, group_id: a.groupId, name: a.name,
      points: a.points, is_active: a.isActive ?? true,
    }))
  ).select();
  if (logErr('addActivities', error)) return null;
  logSuccess('addActivities', `${(data||[]).length} inserted`);
  return (data || []).map(rowToActivity);
}

export async function dbUpdateActivity(id, fields) {
  console.log('[db] updateActivity:', id, fields);
  const update = {};
  if (fields.name     !== undefined) update.name      = fields.name;
  if (fields.points   !== undefined) update.points    = fields.points;
  if (fields.isActive !== undefined) update.is_active = fields.isActive;
  const { error } = await supabase.from('activities').update(update).eq('id', id);
  if (logErr('updateActivity', error)) return false;
  logSuccess('updateActivity', id);
  return true;
}

// ─── PERIODS ──────────────────────────────────────────────────────
export async function dbAddPeriod(period) {
  console.log('[db] addPeriod:', period.name);
  const { data, error } = await supabase.from('periods').insert({
    id: period.id, group_id: period.groupId, name: period.name,
    start_date: period.startDate, end_date: period.endDate,
    is_active: period.isActive ?? false,
    count_for_all_time: period.countForAllTime ?? false,
    prize_text: period.prizeText ?? '',
  }).select().single();
  if (logErr('addPeriod', error)) return null;
  logSuccess('addPeriod', data.id);
  return rowToPeriod(data);
}

export async function dbUpdatePeriod(id, fields) {
  console.log('[db] updatePeriod:', id, fields);
  const update = {};
  if (fields.name            !== undefined) update.name               = fields.name;
  if (fields.startDate       !== undefined) update.start_date         = fields.startDate;
  if (fields.endDate         !== undefined) update.end_date           = fields.endDate;
  if (fields.isActive        !== undefined) update.is_active          = fields.isActive;
  if (fields.countForAllTime !== undefined) update.count_for_all_time = fields.countForAllTime;
  if (fields.prizeText       !== undefined) update.prize_text         = fields.prizeText;
  const { error } = await supabase.from('periods').update(update).eq('id', id);
  if (logErr('updatePeriod', error)) return false;
  logSuccess('updatePeriod', id);
  return true;
}

export async function dbDeletePeriod(id) {
  console.log('[db] deletePeriod:', id);
  const { error } = await supabase.from('periods').delete().eq('id', id);
  if (logErr('deletePeriod', error)) return false;
  logSuccess('deletePeriod', id);
  return true;
}

export async function dbActivatePeriod(id, groupId) {
  console.log('[db] activatePeriod:', id, 'for group', groupId);
  const { error: e1 } = await supabase.from('periods')
    .update({ is_active: false }).eq('group_id', groupId);
  if (logErr('activatePeriod/deactivate-all', e1)) return false;
  const { error: e2 } = await supabase.from('periods')
    .update({ is_active: true }).eq('id', id);
  if (logErr('activatePeriod/activate', e2)) return false;
  logSuccess('activatePeriod', id);
  return true;
}

// ─── STUDENTS ─────────────────────────────────────────────────────
// Returns the confirmed student row (without relation arrays) or null on failure.
export async function dbRegisterStudent(student) {
  console.log('[db] registerStudent:', student.username, '— groupId:', student.groupId);
  const { data, error } = await supabase.from('students').insert({
    id:                       student.id,
    full_name:                student.fullName,
    username:                 student.username,
    password:                 student.password,
    group_id:                 student.groupId,
    secondary_group_ids:      student.secondaryGroupIds || [],
    status:                   student.status,
    university:               student.university || '',
    phone:                    student.phone || '',
    avatar:                   student.avatar || null,
    tasbih:                   student.tasbih,
    personal_tasbih_progress: student.personalTasbihProgress || {},
  }).select().single();
  if (logErr('registerStudent', error)) return null;
  logSuccess('registerStudent', data.username);
  return rowToStudent(data);
}

export async function dbUpdateStudent(id, fields) {
  console.log('[db] updateStudent:', id, Object.keys(fields));
  const update = {};
  if (fields.fullName               !== undefined) update.full_name                = fields.fullName;
  if (fields.username               !== undefined) update.username                 = fields.username;
  if (fields.password               !== undefined) update.password                 = fields.password;
  if (fields.groupId                !== undefined) update.group_id                 = fields.groupId;
  if (fields.secondaryGroupIds      !== undefined) update.secondary_group_ids      = fields.secondaryGroupIds;
  if (fields.status                 !== undefined) update.status                   = fields.status;
  if (fields.university             !== undefined) update.university               = fields.university;
  if (fields.phone                  !== undefined) update.phone                    = fields.phone;
  if (fields.avatar                 !== undefined) update.avatar                   = fields.avatar;
  if (fields.tasbih                 !== undefined) update.tasbih                   = fields.tasbih;
  if (fields.personalTasbihProgress !== undefined) update.personal_tasbih_progress = fields.personalTasbihProgress;
  if (!Object.keys(update).length) return true;
  const { error } = await supabase.from('students').update(update).eq('id', id);
  if (logErr('updateStudent', error)) return false;
  logSuccess('updateStudent', id);
  return true;
}

export async function dbDeleteStudent(id) {
  console.log('[db] deleteStudent:', id);
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (logErr('deleteStudent', error)) return false;
  logSuccess('deleteStudent', id);
  return true;
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────
// Uses explicit check-then-insert/update to avoid upsert PK mutation.
export async function dbSubmitDay(studentId, dateStr, completedActivities, quoteText) {
  console.log('[db] submitDay:', studentId, dateStr);

  const { data: existing, error: ce } = await supabase.from('submissions')
    .select('id').eq('student_id', studentId).eq('date', dateStr).maybeSingle();
  if (ce) { logErr('submitDay/check', ce); return false; }

  if (existing) {
    const { error } = await supabase.from('submissions')
      .update({ completed_activities: completedActivities }).eq('id', existing.id);
    if (logErr('submitDay/update-submission', error)) return false;
  } else {
    const { error } = await supabase.from('submissions').insert({
      id: generateId(), student_id: studentId, date: dateStr,
      completed_activities: completedActivities,
    });
    if (logErr('submitDay/insert-submission', error)) return false;
  }

  if (quoteText) {
    const { data: existingQ, error: qe } = await supabase.from('quotes')
      .select('id').eq('student_id', studentId).eq('date', dateStr).maybeSingle();
    if (qe) { logErr('submitDay/check-quote', qe); }

    if (existingQ) {
      const { error } = await supabase.from('quotes').update({ text: quoteText }).eq('id', existingQ.id);
      logErr('submitDay/update-quote', error);
    } else {
      const { error } = await supabase.from('quotes').insert({
        id: generateId(), student_id: studentId, date: dateStr, text: quoteText,
      });
      logErr('submitDay/insert-quote', error);
    }
  }

  logSuccess('submitDay', `${studentId} on ${dateStr}`);
  return true;
}

export async function dbEditSubmission(studentId, dateStr, completedActivities) {
  console.log('[db] editSubmission:', studentId, dateStr);
  const { data: existing, error: ce } = await supabase.from('submissions')
    .select('id').eq('student_id', studentId).eq('date', dateStr).maybeSingle();
  if (ce) { logErr('editSubmission/check', ce); return false; }

  if (existing) {
    const { error } = await supabase.from('submissions')
      .update({ completed_activities: completedActivities }).eq('id', existing.id);
    if (logErr('editSubmission/update', error)) return false;
  } else {
    const { error } = await supabase.from('submissions').insert({
      id: generateId(), student_id: studentId, date: dateStr,
      completed_activities: completedActivities,
    });
    if (logErr('editSubmission/insert', error)) return false;
  }
  logSuccess('editSubmission', `${studentId} on ${dateStr}`);
  return true;
}

// ─── QUOTE LIKES ──────────────────────────────────────────────────
export async function dbToggleQuoteLike(studentId, dateStr, likerId) {
  console.log('[db] toggleQuoteLike: owner', studentId, 'date', dateStr, 'liker', likerId);
  const { data: quote, error: qe } = await supabase.from('quotes')
    .select('id').eq('student_id', studentId).eq('date', dateStr).maybeSingle();
  if (qe || !quote) { logErr('toggleQuoteLike/find-quote', qe); return false; }

  const { data: existing, error: le } = await supabase.from('quote_likes')
    .select('id').eq('quote_id', quote.id).eq('liker_id', likerId).maybeSingle();
  if (le) { logErr('toggleQuoteLike/check', le); return false; }

  if (existing) {
    const { error } = await supabase.from('quote_likes').delete().eq('id', existing.id);
    if (logErr('toggleQuoteLike/delete', error)) return false;
  } else {
    const { error } = await supabase.from('quote_likes')
      .insert({ id: generateId(), quote_id: quote.id, liker_id: likerId });
    if (logErr('toggleQuoteLike/insert', error)) return false;
  }
  logSuccess('toggleQuoteLike');
  return true;
}

// ─── BONUS POINTS ─────────────────────────────────────────────────
export async function dbAddBonusPoints(studentId, date, points, reason) {
  console.log('[db] addBonusPoints:', studentId, points, reason);
  const { data, error } = await supabase.from('bonus_points').insert({
    id: generateId(), student_id: studentId, date, points: Number(points), reason,
  }).select().single();
  if (logErr('addBonusPoints', error)) return null;
  logSuccess('addBonusPoints', `${points} pts to ${studentId}`);
  return { id: data.id, date: data.date, points: data.points, reason: data.reason };
}

// ─── STUDENT TASBIH ───────────────────────────────────────────────
export async function dbUpdateTasbih(studentId, tasbih) {
  const { error } = await supabase.from('students').update({ tasbih }).eq('id', studentId);
  if (logErr('updateTasbih', error)) return false;
  return true;
}

// ─── GLOBAL TASBIH ────────────────────────────────────────────────
export async function dbAddGlobalTasbih(t) {
  console.log('[db] addGlobalTasbih:', t.title);
  const { data, error } = await supabase.from('tasbih_global').insert({
    id: t.id, title: t.title, description: t.description,
    target: t.target, current: 0, completed_times: 0,
    is_active: t.isActive ?? true, group_scope: t.groupScope,
  }).select().single();
  if (logErr('addGlobalTasbih', error)) return null;
  logSuccess('addGlobalTasbih', data.id);
  return rowToGlobalTasbih(data);
}

export async function dbUpdateGlobalTasbih(id, fields) {
  const update = {};
  if (fields.title          !== undefined) update.title           = fields.title;
  if (fields.description    !== undefined) update.description     = fields.description;
  if (fields.target         !== undefined) update.target          = fields.target;
  if (fields.current        !== undefined) update.current         = fields.current;
  if (fields.completedTimes !== undefined) update.completed_times = fields.completedTimes;
  if (fields.isActive       !== undefined) update.is_active       = fields.isActive;
  if (fields.groupScope     !== undefined) update.group_scope     = fields.groupScope;
  const { error } = await supabase.from('tasbih_global').update(update).eq('id', id);
  if (logErr('updateGlobalTasbih', error)) return false;
  return true;
}

// ─── PERSONAL TASBIH TEMPLATES ────────────────────────────────────
export async function dbAddPersonalTemplate(t) {
  console.log('[db] addPersonalTemplate:', t.title);
  const { data, error } = await supabase.from('tasbih_personal').insert({
    id: t.id, title: t.title, description: t.description,
    target: t.target, group_scope: t.groupScope, is_active: t.isActive ?? true,
  }).select().single();
  if (logErr('addPersonalTemplate', error)) return null;
  logSuccess('addPersonalTemplate', data.id);
  return rowToPersonalTemplate(data);
}

export async function dbUpdatePersonalTemplate(id, fields) {
  console.log('[db] updatePersonalTemplate:', id);
  const update = {};
  if (fields.title       !== undefined) update.title       = fields.title;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.target      !== undefined) update.target      = fields.target;
  if (fields.groupScope  !== undefined) update.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) update.is_active   = fields.isActive;
  const { error } = await supabase.from('tasbih_personal').update(update).eq('id', id);
  if (logErr('updatePersonalTemplate', error)) return false;
  logSuccess('updatePersonalTemplate', id);
  return true;
}

export async function dbDeletePersonalTemplate(id) {
  console.log('[db] deletePersonalTemplate:', id);
  const { error } = await supabase.from('tasbih_personal').delete().eq('id', id);
  if (logErr('deletePersonalTemplate', error)) return false;
  logSuccess('deletePersonalTemplate', id);
  return true;
}

// Accept the full merged progress object from AppContext state — no pre-read needed.
export async function dbSavePersonalTplProgress(studentId, fullProgress) {
  console.log('[db] savePersonalTplProgress:', studentId, fullProgress);
  const { error } = await supabase.from('students')
    .update({ personal_tasbih_progress: fullProgress })
    .eq('id', studentId);
  if (logErr('savePersonalTplProgress', error)) return false;
  logSuccess('savePersonalTplProgress', studentId);
  return true;
}

// ─── READING BOOKS ────────────────────────────────────────────────
export async function dbAddBook(studentId, book) {
  console.log('[db] addBook:', book.title, 'for student', studentId);
  const { data, error } = await supabase.from('reading_books').insert({
    id: book.id, student_id: studentId,
    title: book.title, author: book.author || '',
    start_date: book.startDate || '', total_pages: book.totalPages || 0,
    current_page: book.currentPage || 0, status: book.status || 'Reading',
    last_updated: book.lastUpdated || '',
  }).select().single();
  if (logErr('addBook', error)) return null;
  logSuccess('addBook', data.id);
  return rowToBook(data);
}

export async function dbUpdateBook(bookId, fields) {
  console.log('[db] updateBook:', bookId, fields);
  const update = {};
  if (fields.title       !== undefined) update.title        = fields.title;
  if (fields.author      !== undefined) update.author       = fields.author;
  if (fields.startDate   !== undefined) update.start_date   = fields.startDate;
  if (fields.totalPages  !== undefined) update.total_pages  = fields.totalPages;
  if (fields.currentPage !== undefined) update.current_page = fields.currentPage;
  if (fields.status      !== undefined) update.status       = fields.status;
  if (fields.lastUpdated !== undefined) update.last_updated = fields.lastUpdated;
  const { error } = await supabase.from('reading_books').update(update).eq('id', bookId);
  if (logErr('updateBook', error)) return false;
  logSuccess('updateBook', bookId);
  return true;
}

export async function dbDeleteBook(bookId) {
  console.log('[db] deleteBook:', bookId);
  const { error } = await supabase.from('reading_books').delete().eq('id', bookId);
  if (logErr('deleteBook', error)) return false;
  logSuccess('deleteBook', bookId);
  return true;
}

// ─── PROGRAMS ─────────────────────────────────────────────────────
export async function dbAddProgram(program) {
  console.log('[db] addProgram:', program.name);
  const { data, error } = await supabase.from('programs').insert({
    id: program.id, name: program.name, description: program.description || '',
    date: program.date || '', group_scope: program.groupScope, is_active: program.isActive ?? true,
  }).select().single();
  if (logErr('addProgram', error)) return null;
  logSuccess('addProgram', data.id);
  return rowToProgram(data, {});  // new program has no tasks yet
}

export async function dbUpdateProgram(id, fields) {
  console.log('[db] updateProgram:', id);
  const update = {};
  if (fields.name        !== undefined) update.name        = fields.name;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.date        !== undefined) update.date        = fields.date;
  if (fields.groupScope  !== undefined) update.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) update.is_active   = fields.isActive;
  if (fields.tasks !== undefined) {
    const { error: de } = await supabase.from('program_tasks').delete().eq('program_id', id);
    if (logErr('updateProgram/delete-tasks', de)) return false;
    if (fields.tasks.length) {
      const { error: ie } = await supabase.from('program_tasks').insert(
        fields.tasks.map((t, i) => ({
          id: t.id || generateId(),
          program_id: id, type: t.type, description: t.description,
          target: t.target || 100, task_order: t.order ?? i, mode: t.mode || 'individual',
          collective_count: t.collectiveCount || 0,
          collective_completed_times: t.collectiveCompletedTimes || 0,
        }))
      );
      if (logErr('updateProgram/insert-tasks', ie)) return false;
    }
  }
  if (Object.keys(update).length) {
    const { error } = await supabase.from('programs').update(update).eq('id', id);
    if (logErr('updateProgram', error)) return false;
  }
  logSuccess('updateProgram', id);
  return true;
}

export async function dbDeleteProgram(id) {
  console.log('[db] deleteProgram:', id);
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (logErr('deleteProgram', error)) return false;
  logSuccess('deleteProgram', id);
  return true;
}

// ─── PROGRAM COMPLETIONS ──────────────────────────────────────────
export async function dbSaveProgramCompletion(studentId, programId, taskId, isDone, count) {
  console.log('[db] saveProgramCompletion:', taskId, { isDone, count });
  const { data: existing, error: ce } = await supabase.from('program_completions')
    .select('id').eq('student_id', studentId).eq('task_id', taskId).maybeSingle();
  if (ce) { logErr('saveProgramCompletion/check', ce); return false; }

  if (existing) {
    const { error } = await supabase.from('program_completions')
      .update({ is_done: isDone, count }).eq('id', existing.id);
    if (logErr('saveProgramCompletion/update', error)) return false;
  } else {
    const { error } = await supabase.from('program_completions').insert({
      id: generateId(), student_id: studentId, program_id: programId,
      task_id: taskId, is_done: isDone, count,
    });
    if (logErr('saveProgramCompletion/insert', error)) return false;
  }
  logSuccess('saveProgramCompletion', taskId);
  return true;
}

// ─── COLLECTIVE TASK COUNTS ───────────────────────────────────────
export async function dbUpdateCollectiveTask(taskId, count, completedTimes) {
  const { error } = await supabase.from('program_tasks')
    .update({ collective_count: count, collective_completed_times: completedTimes })
    .eq('id', taskId);
  if (logErr('updateCollectiveTask', error)) return false;
  return true;
}

// ─── REALTIME SUBSCRIPTIONS ───────────────────────────────────────
export function subscribeToGlobalTasbihs(onUpdate) {
  const channel = supabase
    .channel('global-tasbihs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasbih_global' }, onUpdate)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToStudents(onUpdate) {
  const channel = supabase
    .channel('students-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, onUpdate)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToSubmissions(onUpdate) {
  const channel = supabase
    .channel('submissions-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, onUpdate)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
