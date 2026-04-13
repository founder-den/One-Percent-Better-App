// ─────────────────────────────────────────────────────────────────
//  db.js — all async Supabase operations
//  Returns data in the same shapes the app already expects (camelCase).
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js';
import { generateId } from './data.js';

// ─── Error helper ─────────────────────────────────────────────────
// Logs full error details and returns whether the operation succeeded.
function logErr(label, error) {
  if (!error) return false;
  console.error(`[db] ${label} — code: ${error.code}, message: ${error.message}`, error);
  return true;
}

// ─── Shape converters ─────────────────────────────────────────────
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
    // Populated after join:
    submissions: [],
    bonusPoints: [],
    books: [],
    programCompletions: [],
  };
}

function rowToSubmission(r, quotesMap, likesMap) {
  const quote = quotesMap[`${r.student_id}|${r.date}`] || null;
  const quoteLikes = quote ? (likesMap[quote.id] || []) : [];
  return {
    _id: r.id,
    date: r.date,
    completedActivities: r.completed_activities || [],
    quote: quote ? quote.text : '',
    quoteId: quote ? quote.id : null,
    quoteLikes,
  };
}

function rowToBook(r) {
  return {
    id: r.id,
    title: r.title,
    author: r.author || '',
    startDate: r.start_date || '',
    totalPages: r.total_pages || 0,
    currentPage: r.current_page || 0,
    status: r.status || 'Reading',
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
    date: r.date, groupScope: r.group_scope, isActive: r.is_active,
    tasks,
  };
}

// ─── LOAD ALL ─────────────────────────────────────────────────────
export async function loadAll() {
  const [
    { data: communityRow,   error: e1 },
    { data: adminRow,       error: e2 },
    { data: groupRows,      error: e3 },
    { data: studentRows,    error: e4 },
    { data: activityRows,   error: e5 },
    { data: periodRows,     error: e6 },
    { data: subRows,        error: e7 },
    { data: quoteRows,      error: e8 },
    { data: likeRows,       error: e9 },
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

  // Detect critical failures — table missing (42P01) or auth failure (42501)
  const criticalErrors = [e3, e4, e5].filter(Boolean);
  for (const err of criticalErrors) {
    if (err.code === '42P01') {
      throw new Error(
        'Database tables not found. Please run the SQL setup script in your Supabase SQL editor.'
      );
    }
    if (err.code === '42501' || err.message?.includes('row-level security')) {
      throw new Error(
        'Database permission denied. Run: ALTER TABLE groups DISABLE ROW LEVEL SECURITY; (and the same for all other tables).'
      );
    }
    // Generic critical error
    throw new Error(`Database error: ${err.message}`);
  }

  // Log non-critical errors (missing singleton rows are OK)
  [e1, e2, e6, e7, e8, e9, e10, e11, e12, e13, e14, e15, e16].forEach((e, i) => {
    if (e) console.warn(`[db] loadAll non-critical error at index ${i}:`, e.message);
  });

  // Build lookup maps
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

  // Assemble students with related data
  const students = (studentRows || []).map(r => rowToStudent(r));
  const studentById = {};
  students.forEach(s => { studentById[s.id] = s; });

  (subRows || []).forEach(r => {
    if (studentById[r.student_id]) {
      studentById[r.student_id].submissions.push(rowToSubmission(r, quotesMap, likesMap));
    }
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

  // Collective task counts from task rows
  const collectiveTaskCounts = {};
  (taskRows || []).forEach(t => {
    collectiveTaskCounts[t.id] = {
      count: t.collective_count || 0,
      completedTimes: t.collective_completed_times || 0,
    };
  });

  return {
    community: communityRow ? {
      name:        communityRow.name,
      logo:        communityRow.logo         || null,
      banner:      communityRow.banner       || null,
      bannerDark:  communityRow.banner_dark  || null,
      bannerLight: communityRow.banner_light || null,
    } : { name: 'My Community', logo: null, banner: null, bannerDark: null, bannerLight: null },

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
  const { error } = await supabase.from('communities').upsert({
    id:          'main',
    name:        fields.name,
    logo:        fields.logo        ?? null,
    banner:      fields.banner      ?? null,
    banner_dark:  fields.bannerDark  ?? null,
    banner_light: fields.bannerLight ?? null,
  }, { onConflict: 'id' });
  logErr('saveCommunity', error);
}

// ─── ADMIN SETTINGS ───────────────────────────────────────────────
export async function dbSaveAdminSettings(fields) {
  const update = {};
  if (fields.adminUsername    !== undefined) update.admin_username    = fields.adminUsername;
  if (fields.adminPassword    !== undefined) update.admin_password    = fields.adminPassword;
  if (fields.registrationMode !== undefined) update.registration_mode = fields.registrationMode;
  if (fields.programsLabel    !== undefined) update.programs_label    = fields.programsLabel;
  const { error } = await supabase.from('admin_settings').upsert(
    { id: 'main', ...update }, { onConflict: 'id' }
  );
  logErr('saveAdminSettings', error);
}

// ─── GROUPS ───────────────────────────────────────────────────────
export async function dbAddGroup(group) {
  const { error } = await supabase.from('groups').insert({
    id: group.id, name: group.name, group_code: group.groupCode, is_active: group.isActive ?? true,
  });
  logErr('addGroup', error);
}

export async function dbUpdateGroup(id, fields) {
  const update = {};
  if (fields.name      !== undefined) update.name       = fields.name;
  if (fields.groupCode !== undefined) update.group_code = fields.groupCode;
  if (fields.isActive  !== undefined) update.is_active  = fields.isActive;
  const { error } = await supabase.from('groups').update(update).eq('id', id);
  logErr('updateGroup', error);
}

// ─── ACTIVITIES ───────────────────────────────────────────────────
export async function dbAddActivity(activity) {
  const { error } = await supabase.from('activities').insert({
    id: activity.id, group_id: activity.groupId,
    name: activity.name, points: activity.points, is_active: activity.isActive ?? true,
  });
  logErr('addActivity', error);
}

export async function dbAddActivities(activities) {
  if (!activities.length) return;
  const { error } = await supabase.from('activities').insert(
    activities.map(a => ({
      id: a.id, group_id: a.groupId, name: a.name,
      points: a.points, is_active: a.isActive ?? true,
    }))
  );
  logErr('addActivities', error);
}

export async function dbUpdateActivity(id, fields) {
  const update = {};
  if (fields.name     !== undefined) update.name      = fields.name;
  if (fields.points   !== undefined) update.points    = fields.points;
  if (fields.isActive !== undefined) update.is_active = fields.isActive;
  const { error } = await supabase.from('activities').update(update).eq('id', id);
  logErr('updateActivity', error);
}

// ─── PERIODS ──────────────────────────────────────────────────────
export async function dbAddPeriod(period) {
  const { error } = await supabase.from('periods').insert({
    id: period.id, group_id: period.groupId, name: period.name,
    start_date: period.startDate, end_date: period.endDate,
    is_active: period.isActive ?? false,
    count_for_all_time: period.countForAllTime ?? false,
    prize_text: period.prizeText ?? '',
  });
  logErr('addPeriod', error);
}

export async function dbUpdatePeriod(id, fields) {
  const update = {};
  if (fields.name            !== undefined) update.name               = fields.name;
  if (fields.startDate       !== undefined) update.start_date         = fields.startDate;
  if (fields.endDate         !== undefined) update.end_date           = fields.endDate;
  if (fields.isActive        !== undefined) update.is_active          = fields.isActive;
  if (fields.countForAllTime !== undefined) update.count_for_all_time = fields.countForAllTime;
  if (fields.prizeText       !== undefined) update.prize_text         = fields.prizeText;
  const { error } = await supabase.from('periods').update(update).eq('id', id);
  logErr('updatePeriod', error);
}

export async function dbDeletePeriod(id) {
  const { error } = await supabase.from('periods').delete().eq('id', id);
  logErr('deletePeriod', error);
}

export async function dbActivatePeriod(id, groupId) {
  const { error: e1 } = await supabase.from('periods')
    .update({ is_active: false }).eq('group_id', groupId);
  logErr('activatePeriod/deactivate', e1);

  const { error: e2 } = await supabase.from('periods')
    .update({ is_active: true }).eq('id', id);
  logErr('activatePeriod/activate', e2);
}

// ─── STUDENTS ─────────────────────────────────────────────────────
export async function dbRegisterStudent(student) {
  const { error } = await supabase.from('students').insert({
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
  });
  logErr('registerStudent', error);
  return !error;
}

export async function dbUpdateStudent(id, fields) {
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
  if (!Object.keys(update).length) return;
  const { error } = await supabase.from('students').update(update).eq('id', id);
  logErr('updateStudent', error);
}

export async function dbDeleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  logErr('deleteStudent', error);
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────
// FIX: use insert/update instead of upsert+new-id to avoid PK mutation.
export async function dbSubmitDay(studentId, dateStr, completedActivities, quoteText) {
  // Check if submission already exists for this student+date
  const { data: existing, error: se } = await supabase.from('submissions')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', dateStr)
    .maybeSingle();
  if (se) { logErr('submitDay/check', se); }

  if (existing) {
    const { error } = await supabase.from('submissions')
      .update({ completed_activities: completedActivities })
      .eq('id', existing.id);
    logErr('submitDay/update-submission', error);
  } else {
    const { error } = await supabase.from('submissions').insert({
      id: generateId(), student_id: studentId, date: dateStr,
      completed_activities: completedActivities,
    });
    logErr('submitDay/insert-submission', error);
  }

  if (quoteText) {
    const { data: existingQuote, error: qe } = await supabase.from('quotes')
      .select('id')
      .eq('student_id', studentId)
      .eq('date', dateStr)
      .maybeSingle();
    if (qe) { logErr('submitDay/check-quote', qe); }

    if (existingQuote) {
      const { error } = await supabase.from('quotes')
        .update({ text: quoteText })
        .eq('id', existingQuote.id);
      logErr('submitDay/update-quote', error);
    } else {
      const { error } = await supabase.from('quotes').insert({
        id: generateId(), student_id: studentId, date: dateStr, text: quoteText,
      });
      logErr('submitDay/insert-quote', error);
    }
  }
}

export async function dbEditSubmission(studentId, dateStr, completedActivities) {
  // Try update first; if no rows exist, insert instead
  const { data: existing, error: ce } = await supabase.from('submissions')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', dateStr)
    .maybeSingle();
  if (ce) { logErr('editSubmission/check', ce); }

  if (existing) {
    const { error } = await supabase.from('submissions')
      .update({ completed_activities: completedActivities })
      .eq('id', existing.id);
    logErr('editSubmission/update', error);
  } else {
    const { error } = await supabase.from('submissions').insert({
      id: generateId(), student_id: studentId, date: dateStr,
      completed_activities: completedActivities,
    });
    logErr('editSubmission/insert', error);
  }
}

// ─── QUOTE LIKES ──────────────────────────────────────────────────
export async function dbToggleQuoteLike(studentId, dateStr, likerId) {
  const { data: quote, error: qe } = await supabase.from('quotes')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', dateStr)
    .maybeSingle();
  if (qe || !quote) { logErr('toggleQuoteLike/find-quote', qe); return; }

  const { data: existing, error: le } = await supabase.from('quote_likes')
    .select('id')
    .eq('quote_id', quote.id)
    .eq('liker_id', likerId)
    .maybeSingle();
  if (le) { logErr('toggleQuoteLike/check', le); }

  if (existing) {
    const { error } = await supabase.from('quote_likes').delete().eq('id', existing.id);
    logErr('toggleQuoteLike/delete', error);
  } else {
    const { error } = await supabase.from('quote_likes').insert({
      id: generateId(), quote_id: quote.id, liker_id: likerId,
    });
    logErr('toggleQuoteLike/insert', error);
  }
}

// ─── BONUS POINTS ─────────────────────────────────────────────────
export async function dbAddBonusPoints(studentId, date, points, reason) {
  const { error } = await supabase.from('bonus_points').insert({
    id: generateId(), student_id: studentId, date, points: Number(points), reason,
  });
  logErr('addBonusPoints', error);
}

// ─── STUDENT TASBIH ───────────────────────────────────────────────
export async function dbUpdateTasbih(studentId, tasbih) {
  const { error } = await supabase.from('students')
    .update({ tasbih })
    .eq('id', studentId);
  logErr('updateTasbih', error);
}

// ─── GLOBAL TASBIH ────────────────────────────────────────────────
export async function dbAddGlobalTasbih(t) {
  const { error } = await supabase.from('tasbih_global').insert({
    id: t.id, title: t.title, description: t.description,
    target: t.target, current: 0, completed_times: 0,
    is_active: t.isActive ?? true, group_scope: t.groupScope,
  });
  logErr('addGlobalTasbih', error);
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
  logErr('updateGlobalTasbih', error);
}

// ─── PERSONAL TASBIH TEMPLATES ────────────────────────────────────
export async function dbAddPersonalTemplate(t) {
  const { error } = await supabase.from('tasbih_personal').insert({
    id: t.id, title: t.title, description: t.description,
    target: t.target, group_scope: t.groupScope, is_active: t.isActive ?? true,
  });
  logErr('addPersonalTemplate', error);
}

export async function dbUpdatePersonalTemplate(id, fields) {
  const update = {};
  if (fields.title       !== undefined) update.title       = fields.title;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.target      !== undefined) update.target      = fields.target;
  if (fields.groupScope  !== undefined) update.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) update.is_active   = fields.isActive;
  const { error } = await supabase.from('tasbih_personal').update(update).eq('id', id);
  logErr('updatePersonalTemplate', error);
}

export async function dbDeletePersonalTemplate(id) {
  const { error } = await supabase.from('tasbih_personal').delete().eq('id', id);
  logErr('deletePersonalTemplate', error);
}

// FIX: accept the full progress object from AppContext state — no pre-read needed.
export async function dbSavePersonalTplProgress(studentId, fullProgress) {
  const { error } = await supabase.from('students')
    .update({ personal_tasbih_progress: fullProgress })
    .eq('id', studentId);
  logErr('savePersonalTplProgress', error);
}

// ─── READING BOOKS ────────────────────────────────────────────────
export async function dbAddBook(studentId, book) {
  const { error } = await supabase.from('reading_books').insert({
    id: book.id, student_id: studentId,
    title: book.title, author: book.author || '',
    start_date: book.startDate || '', total_pages: book.totalPages || 0,
    current_page: book.currentPage || 0, status: book.status || 'Reading',
    last_updated: book.lastUpdated || '',
  });
  logErr('addBook', error);
}

export async function dbUpdateBook(bookId, fields) {
  const update = {};
  if (fields.title       !== undefined) update.title        = fields.title;
  if (fields.author      !== undefined) update.author       = fields.author;
  if (fields.startDate   !== undefined) update.start_date   = fields.startDate;
  if (fields.totalPages  !== undefined) update.total_pages  = fields.totalPages;
  if (fields.currentPage !== undefined) update.current_page = fields.currentPage;
  if (fields.status      !== undefined) update.status       = fields.status;
  if (fields.lastUpdated !== undefined) update.last_updated = fields.lastUpdated;
  const { error } = await supabase.from('reading_books').update(update).eq('id', bookId);
  logErr('updateBook', error);
}

export async function dbDeleteBook(bookId) {
  const { error } = await supabase.from('reading_books').delete().eq('id', bookId);
  logErr('deleteBook', error);
}

// ─── PROGRAMS ─────────────────────────────────────────────────────
export async function dbAddProgram(program) {
  const { error } = await supabase.from('programs').insert({
    id: program.id, name: program.name, description: program.description || '',
    date: program.date || '', group_scope: program.groupScope, is_active: program.isActive ?? true,
  });
  logErr('addProgram', error);
}

export async function dbUpdateProgram(id, fields) {
  const update = {};
  if (fields.name        !== undefined) update.name        = fields.name;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.date        !== undefined) update.date        = fields.date;
  if (fields.groupScope  !== undefined) update.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) update.is_active   = fields.isActive;
  if (fields.tasks !== undefined) {
    // Delete existing tasks then re-insert
    const { error: de } = await supabase.from('program_tasks').delete().eq('program_id', id);
    logErr('updateProgram/delete-tasks', de);
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
      logErr('updateProgram/insert-tasks', ie);
    }
  }
  if (Object.keys(update).length) {
    const { error } = await supabase.from('programs').update(update).eq('id', id);
    logErr('updateProgram', error);
  }
}

export async function dbDeleteProgram(id) {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  logErr('deleteProgram', error);
}

// ─── PROGRAM COMPLETIONS ──────────────────────────────────────────
// FIX: use insert/update instead of upsert+new-id to avoid PK mutation.
export async function dbSaveProgramCompletion(studentId, programId, taskId, isDone, count) {
  const { data: existing, error: ce } = await supabase.from('program_completions')
    .select('id')
    .eq('student_id', studentId)
    .eq('task_id', taskId)
    .maybeSingle();
  if (ce) { logErr('saveProgramCompletion/check', ce); }

  if (existing) {
    const { error } = await supabase.from('program_completions')
      .update({ is_done: isDone, count })
      .eq('id', existing.id);
    logErr('saveProgramCompletion/update', error);
  } else {
    const { error } = await supabase.from('program_completions').insert({
      id: generateId(), student_id: studentId, program_id: programId,
      task_id: taskId, is_done: isDone, count,
    });
    logErr('saveProgramCompletion/insert', error);
  }
}

// ─── COLLECTIVE TASK COUNTS ───────────────────────────────────────
export async function dbUpdateCollectiveTask(taskId, count, completedTimes) {
  const { error } = await supabase.from('program_tasks')
    .update({ collective_count: count, collective_completed_times: completedTimes })
    .eq('id', taskId);
  logErr('updateCollectiveTask', error);
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
