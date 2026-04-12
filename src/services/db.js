// ─────────────────────────────────────────────────────────────────
//  db.js — all async Supabase operations
//  Returns data in the same shapes the app already expects (camelCase).
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js';
import { generateId } from './data.js';

// ─── Error helper ─────────────────────────────────────────────────
function must(data, error, label) {
  if (error) {
    console.error(`[db] ${label}:`, error.message);
    throw new Error(error.message);
  }
  return data;
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
    // These get attached after fetching related rows:
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
// Fetches everything from Supabase and assembles the full app state.
export async function loadAll() {
  const [
    { data: communityRows, error: e1 },
    { data: adminRows,     error: e2 },
    { data: groupRows,     error: e3 },
    { data: studentRows,   error: e4 },
    { data: activityRows,  error: e5 },
    { data: periodRows,    error: e6 },
    { data: subRows,       error: e7 },
    { data: quoteRows,     error: e8 },
    { data: likeRows,      error: e9 },
    { data: bonusRows,     error: e10 },
    { data: globalRows,    error: e11 },
    { data: personalRows,  error: e12 },
    { data: bookRows,      error: e13 },
    { data: programRows,   error: e14 },
    { data: taskRows,      error: e15 },
    { data: completionRows,error: e16 },
  ] = await Promise.all([
    supabase.from('communities').select('*').eq('id', 'main').single(),
    supabase.from('admin_settings').select('*').eq('id', 'main').single(),
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

  [e1,e2,e3,e4,e5,e6,e7,e8,e9,e10,e11,e12,e13,e14,e15,e16].forEach((e, i) => {
    if (e) console.error(`[db] loadAll error at index ${i}:`, e.message);
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

  // Build collective task counts map from taskRows
  const collectiveTaskCounts = {};
  (taskRows || []).forEach(t => {
    collectiveTaskCounts[t.id] = {
      count: t.collective_count || 0,
      completedTimes: t.collective_completed_times || 0,
    };
  });

  return {
    community: communityRows ? {
      name:        communityRows.name,
      logo:        communityRows.logo        || null,
      banner:      communityRows.banner      || null,
      bannerDark:  communityRows.banner_dark  || null,
      bannerLight: communityRows.banner_light || null,
    } : { name: 'My Community', logo: null, banner: null, bannerDark: null, bannerLight: null },

    adminSettings: adminRows ? {
      adminUsername:    adminRows.admin_username,
      adminPassword:    adminRows.admin_password,
      registrationMode: adminRows.registration_mode,
      programsLabel:    adminRows.programs_label,
    } : { adminUsername: 'admin', adminPassword: 'admin1', registrationMode: 'open', programsLabel: 'Programs' },

    groups:               (groupRows    || []).map(rowToGroup),
    students,
    activities:           (activityRows || []).map(rowToActivity),
    periods:              (periodRows   || []).map(rowToPeriod),
    globalTasbihs:        (globalRows   || []).map(rowToGlobalTasbih),
    personalTasbihTemplates: (personalRows || []).map(rowToPersonalTemplate),
    programs:             (programRows  || []).map(r => rowToProgram(r, tasksMap)),
    collectiveTaskCounts,
  };
}

// ─── COMMUNITY ────────────────────────────────────────────────────
export async function dbSaveCommunity(fields) {
  const { error } = await supabase.from('communities').update({
    name:         fields.name,
    logo:         fields.logo         ?? null,
    banner:       fields.banner       ?? null,
    banner_dark:  fields.bannerDark   ?? null,
    banner_light: fields.bannerLight  ?? null,
  }).eq('id', 'main');
  if (error) console.error('[db] saveCommunity:', error.message);
}

// ─── ADMIN SETTINGS ───────────────────────────────────────────────
export async function dbSaveAdminSettings(fields) {
  const update = {};
  if (fields.adminUsername    !== undefined) update.admin_username    = fields.adminUsername;
  if (fields.adminPassword    !== undefined) update.admin_password    = fields.adminPassword;
  if (fields.registrationMode !== undefined) update.registration_mode = fields.registrationMode;
  if (fields.programsLabel    !== undefined) update.programs_label    = fields.programsLabel;
  const { error } = await supabase.from('admin_settings').update(update).eq('id', 'main');
  if (error) console.error('[db] saveAdminSettings:', error.message);
}

// ─── GROUPS ───────────────────────────────────────────────────────
export async function dbAddGroup(group) {
  const { error } = await supabase.from('groups').insert({
    id: group.id, name: group.name, group_code: group.groupCode, is_active: group.isActive ?? true,
  });
  if (error) console.error('[db] addGroup:', error.message);
}

export async function dbUpdateGroup(id, fields) {
  const update = {};
  if (fields.name      !== undefined) update.name       = fields.name;
  if (fields.groupCode !== undefined) update.group_code = fields.groupCode;
  if (fields.isActive  !== undefined) update.is_active  = fields.isActive;
  const { error } = await supabase.from('groups').update(update).eq('id', id);
  if (error) console.error('[db] updateGroup:', error.message);
}

// ─── ACTIVITIES ───────────────────────────────────────────────────
export async function dbAddActivity(activity) {
  const { error } = await supabase.from('activities').insert({
    id: activity.id, group_id: activity.groupId,
    name: activity.name, points: activity.points, is_active: activity.isActive ?? true,
  });
  if (error) console.error('[db] addActivity:', error.message);
}

export async function dbAddActivities(activities) {
  if (!activities.length) return;
  const { error } = await supabase.from('activities').insert(
    activities.map(a => ({ id: a.id, group_id: a.groupId, name: a.name, points: a.points, is_active: a.isActive ?? true }))
  );
  if (error) console.error('[db] addActivities:', error.message);
}

export async function dbUpdateActivity(id, fields) {
  const update = {};
  if (fields.name     !== undefined) update.name      = fields.name;
  if (fields.points   !== undefined) update.points    = fields.points;
  if (fields.isActive !== undefined) update.is_active = fields.isActive;
  const { error } = await supabase.from('activities').update(update).eq('id', id);
  if (error) console.error('[db] updateActivity:', error.message);
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
  if (error) console.error('[db] addPeriod:', error.message);
}

export async function dbUpdatePeriod(id, fields) {
  const update = {};
  if (fields.name             !== undefined) update.name               = fields.name;
  if (fields.startDate        !== undefined) update.start_date         = fields.startDate;
  if (fields.endDate          !== undefined) update.end_date           = fields.endDate;
  if (fields.isActive         !== undefined) update.is_active          = fields.isActive;
  if (fields.countForAllTime  !== undefined) update.count_for_all_time = fields.countForAllTime;
  if (fields.prizeText        !== undefined) update.prize_text         = fields.prizeText;
  const { error } = await supabase.from('periods').update(update).eq('id', id);
  if (error) console.error('[db] updatePeriod:', error.message);
}

export async function dbDeletePeriod(id) {
  const { error } = await supabase.from('periods').delete().eq('id', id);
  if (error) console.error('[db] deletePeriod:', error.message);
}

// Deactivate all periods for a group, then activate the specified one
export async function dbActivatePeriod(id, groupId) {
  const { error: e1 } = await supabase.from('periods')
    .update({ is_active: false })
    .eq('group_id', groupId);
  if (e1) console.error('[db] activatePeriod deactivate:', e1.message);

  const { error: e2 } = await supabase.from('periods')
    .update({ is_active: true })
    .eq('id', id);
  if (e2) console.error('[db] activatePeriod activate:', e2.message);
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
  if (error) console.error('[db] registerStudent:', error.message);
}

export async function dbUpdateStudent(id, fields) {
  const update = {};
  if (fields.fullName               !== undefined) update.full_name                 = fields.fullName;
  if (fields.username               !== undefined) update.username                  = fields.username;
  if (fields.password               !== undefined) update.password                  = fields.password;
  if (fields.groupId                !== undefined) update.group_id                  = fields.groupId;
  if (fields.secondaryGroupIds      !== undefined) update.secondary_group_ids       = fields.secondaryGroupIds;
  if (fields.status                 !== undefined) update.status                    = fields.status;
  if (fields.university             !== undefined) update.university                = fields.university;
  if (fields.phone                  !== undefined) update.phone                     = fields.phone;
  if (fields.avatar                 !== undefined) update.avatar                    = fields.avatar;
  if (fields.tasbih                 !== undefined) update.tasbih                    = fields.tasbih;
  if (fields.personalTasbihProgress !== undefined) update.personal_tasbih_progress  = fields.personalTasbihProgress;
  if (!Object.keys(update).length) return;
  const { error } = await supabase.from('students').update(update).eq('id', id);
  if (error) console.error('[db] updateStudent:', error.message);
}

export async function dbDeleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) console.error('[db] deleteStudent:', error.message);
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────
// Upserts submission + quote rows together
export async function dbSubmitDay(studentId, dateStr, completedActivities, quoteText) {
  const subId = generateId();
  const { error: e1 } = await supabase.from('submissions').upsert({
    id: subId, student_id: studentId, date: dateStr,
    completed_activities: completedActivities,
  }, { onConflict: 'student_id,date', ignoreDuplicates: false });
  if (e1) console.error('[db] submitDay submission:', e1.message);

  if (quoteText) {
    const { error: e2 } = await supabase.from('quotes').upsert({
      id: generateId(), student_id: studentId, date: dateStr, text: quoteText,
    }, { onConflict: 'student_id,date', ignoreDuplicates: false });
    if (e2) console.error('[db] submitDay quote:', e2.message);
  }
}

export async function dbEditSubmission(studentId, dateStr, completedActivities) {
  const { error } = await supabase.from('submissions')
    .update({ completed_activities: completedActivities })
    .eq('student_id', studentId)
    .eq('date', dateStr);
  if (error) console.error('[db] editSubmission:', error.message);
}

// ─── QUOTE LIKES ──────────────────────────────────────────────────
export async function dbToggleQuoteLike(studentId, dateStr, likerId) {
  // Look up the quote
  const { data: quote, error: qe } = await supabase.from('quotes')
    .select('id')
    .eq('student_id', studentId)
    .eq('date', dateStr)
    .maybeSingle();
  if (qe || !quote) return;

  // Check if like exists
  const { data: existing } = await supabase.from('quote_likes')
    .select('id')
    .eq('quote_id', quote.id)
    .eq('liker_id', likerId)
    .maybeSingle();

  if (existing) {
    await supabase.from('quote_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('quote_likes').insert({ id: generateId(), quote_id: quote.id, liker_id: likerId });
  }
}

// ─── BONUS POINTS ─────────────────────────────────────────────────
export async function dbAddBonusPoints(studentId, date, points, reason) {
  const { error } = await supabase.from('bonus_points').insert({
    id: generateId(), student_id: studentId, date, points: Number(points), reason,
  });
  if (error) console.error('[db] addBonusPoints:', error.message);
}

// ─── TASBIH (student personal) ────────────────────────────────────
export async function dbUpdateTasbih(studentId, tasbih) {
  return dbUpdateStudent(studentId, { tasbih });
}

// ─── GLOBAL TASBIH ────────────────────────────────────────────────
export async function dbAddGlobalTasbih(t) {
  const { error } = await supabase.from('tasbih_global').insert({
    id: t.id, title: t.title, description: t.description,
    target: t.target, current: 0, completed_times: 0,
    is_active: t.isActive ?? true, group_scope: t.groupScope,
  });
  if (error) console.error('[db] addGlobalTasbih:', error.message);
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
  if (error) console.error('[db] updateGlobalTasbih:', error.message);
}

// ─── PERSONAL TASBIH TEMPLATES ────────────────────────────────────
export async function dbAddPersonalTemplate(t) {
  const { error } = await supabase.from('tasbih_personal').insert({
    id: t.id, title: t.title, description: t.description,
    target: t.target, group_scope: t.groupScope, is_active: t.isActive ?? true,
  });
  if (error) console.error('[db] addPersonalTemplate:', error.message);
}

export async function dbUpdatePersonalTemplate(id, fields) {
  const update = {};
  if (fields.title       !== undefined) update.title       = fields.title;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.target      !== undefined) update.target      = fields.target;
  if (fields.groupScope  !== undefined) update.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) update.is_active   = fields.isActive;
  const { error } = await supabase.from('tasbih_personal').update(update).eq('id', id);
  if (error) console.error('[db] updatePersonalTemplate:', error.message);
}

export async function dbDeletePersonalTemplate(id) {
  const { error } = await supabase.from('tasbih_personal').delete().eq('id', id);
  if (error) console.error('[db] deletePersonalTemplate:', error.message);
}

// Personal tasbih progress is stored on the student record as JSONB
export async function dbSavePersonalTplProgress(studentId, templateId, count) {
  // We need to merge into the existing JSONB — read current, then update
  const { data, error: re } = await supabase.from('students')
    .select('personal_tasbih_progress')
    .eq('id', studentId)
    .single();
  if (re) { console.error('[db] getPersonalTplProgress:', re.message); return; }
  const current = data?.personal_tasbih_progress || {};
  const updated = { ...current, [templateId]: count };
  const { error } = await supabase.from('students')
    .update({ personal_tasbih_progress: updated })
    .eq('id', studentId);
  if (error) console.error('[db] savePersonalTplProgress:', error.message);
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
  if (error) console.error('[db] addBook:', error.message);
}

export async function dbUpdateBook(bookId, fields) {
  const update = {};
  if (fields.title        !== undefined) update.title         = fields.title;
  if (fields.author       !== undefined) update.author        = fields.author;
  if (fields.startDate    !== undefined) update.start_date    = fields.startDate;
  if (fields.totalPages   !== undefined) update.total_pages   = fields.totalPages;
  if (fields.currentPage  !== undefined) update.current_page  = fields.currentPage;
  if (fields.status       !== undefined) update.status        = fields.status;
  if (fields.lastUpdated  !== undefined) update.last_updated  = fields.lastUpdated;
  const { error } = await supabase.from('reading_books').update(update).eq('id', bookId);
  if (error) console.error('[db] updateBook:', error.message);
}

export async function dbDeleteBook(bookId) {
  const { error } = await supabase.from('reading_books').delete().eq('id', bookId);
  if (error) console.error('[db] deleteBook:', error.message);
}

// ─── PROGRAMS ─────────────────────────────────────────────────────
export async function dbAddProgram(program) {
  const { error: pe } = await supabase.from('programs').insert({
    id: program.id, name: program.name, description: program.description || '',
    date: program.date || '', group_scope: program.groupScope, is_active: program.isActive ?? true,
  });
  if (pe) console.error('[db] addProgram:', pe.message);
}

export async function dbUpdateProgram(id, fields) {
  const update = {};
  if (fields.name        !== undefined) update.name        = fields.name;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.date        !== undefined) update.date        = fields.date;
  if (fields.groupScope  !== undefined) update.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) update.is_active   = fields.isActive;
  if (fields.tasks !== undefined) {
    // Replace all tasks for this program
    await supabase.from('program_tasks').delete().eq('program_id', id);
    if (fields.tasks.length) {
      await supabase.from('program_tasks').insert(
        fields.tasks.map((t, i) => ({
          id: t.id, program_id: id, type: t.type, description: t.description,
          target: t.target || 100, task_order: t.order ?? i, mode: t.mode || 'individual',
          collective_count: t.collectiveCount || 0,
          collective_completed_times: t.collectiveCompletedTimes || 0,
        }))
      );
    }
  }
  if (Object.keys(update).length) {
    const { error } = await supabase.from('programs').update(update).eq('id', id);
    if (error) console.error('[db] updateProgram:', error.message);
  }
}

export async function dbDeleteProgram(id) {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) console.error('[db] deleteProgram:', error.message);
}

// ─── PROGRAM COMPLETIONS ──────────────────────────────────────────
export async function dbSaveProgramCompletion(studentId, programId, taskId, isDone, count) {
  const { error } = await supabase.from('program_completions').upsert({
    id: generateId(), student_id: studentId, program_id: programId,
    task_id: taskId, is_done: isDone, count,
  }, { onConflict: 'student_id,task_id', ignoreDuplicates: false });
  if (error) console.error('[db] saveProgramCompletion:', error.message);
}

// ─── COLLECTIVE TASK COUNTS ───────────────────────────────────────
export async function dbUpdateCollectiveTask(taskId, count, completedTimes) {
  const { error } = await supabase.from('program_tasks')
    .update({ collective_count: count, collective_completed_times: completedTimes })
    .eq('id', taskId);
  if (error) console.error('[db] updateCollectiveTask:', error.message);
}

// ─── REALTIME SUBSCRIPTIONS ───────────────────────────────────────
// Returns an unsubscribe function
export function subscribeToGlobalTasbihs(onUpdate) {
  const channel = supabase
    .channel('global-tasbihs')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasbih_global' },
      (payload) => onUpdate(payload)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToStudents(onUpdate) {
  const channel = supabase
    .channel('students-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      (payload) => onUpdate(payload)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToSubmissions(onUpdate) {
  const channel = supabase
    .channel('submissions-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'submissions' },
      (payload) => onUpdate(payload)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
