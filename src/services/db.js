// ─────────────────────────────────────────────────────────────────
//  db.js — all reads and writes go through Supabase.
//
//  localStorage is NOT used here for any app data.
//  Theme (theme key) and session (currentStudent, adminSession) are
//  handled in data.js / AuthContext.jsx and must not be changed.
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js';
import { generateId } from './data.js';

// ─── Row → JS object mappers ──────────────────────────────────────

function mapStudent(row, submissions = [], bonusPoints = [], books = [], programCompletions = []) {
  return {
    id:                     row.id,
    fullName:               row.full_name || '',
    username:               row.username,
    password:               row.password,
    groupId:                row.group_id,
    secondaryGroupIds:      row.secondary_group_ids || [],
    status:                 row.status,
    university:             row.university || '',
    phone:                  row.phone || '',
    avatar:                 row.avatar ?? null,
    tasbih:                 row.tasbih || { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false },
    personalTasbihProgress: row.personal_tasbih_progress || {},
    personalTasbihs:        row.personal_tasbihs || [],
    telegramUsername:       row.telegram_username || '',
    preferredLanguage:      row.preferred_language || 'en',
    submissions,
    bonusPoints,
    books,
    programCompletions,
  };
}

function mapSubmission(row) {
  return {
    date:                row.date,
    completedActivities: row.completed_activities || [],
    quote:               row.quote || '',
    quoteLikes:          row.quote_likes || [],
    ...(typeof row.score_override === 'number' ? { scoreOverride: row.score_override } : {}),
  };
}

function mapBonusPoint(row) {
  return { id: row.id, date: row.date, points: row.points, reason: row.reason || '' };
}

function mapBook(row) {
  return {
    id:           row.id,
    title:        row.title || '',
    author:       row.author || '',
    totalPages:   row.total_pages || 0,
    currentPage:  row.current_page || 0,
    status:       row.status || 'reading',
    startedDate:  row.started_date || null,
    finishedDate: row.finished_date || null,
  };
}

function mapProgramCompletion(row) {
  return {
    id:        row.id,
    programId: row.program_id,
    taskId:    row.task_id,
    isDone:    row.is_done,
    count:     row.count,
  };
}

function mapActivity(row) {
  return { id: row.id, groupId: row.group_id, name: row.name, points: row.points, isActive: row.is_active };
}

function mapPeriod(row) {
  return {
    id:              row.id,
    groupId:         row.group_id,
    name:            row.name,
    startDate:       row.start_date,
    endDate:         row.end_date,
    isActive:        row.is_active,
    countForAllTime: row.count_for_all_time,
    prizeText:       row.prize_text || '',
  };
}

function mapGlobalTasbih(row) {
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description || '',
    target:         row.target,
    current:        row.current,
    completedTimes: row.completed_times,
    isActive:       row.is_active,
    groupScope:     row.group_scope || 'all',
    resetType:      row.reset_type    || 'none',
    lastResetDate:  row.last_reset_date || '',
  };
}

function mapPersonalTemplate(row) {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description || '',
    target:      row.target,
    groupScope:  row.group_scope || 'all',
    isActive:    row.is_active,
    resetType:   row.reset_type  || 'none',
  };
}

function mapProgram(row) {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description || '',
    date:        row.date || '',
    groupScope:  row.group_scope || 'all',
    isActive:    row.is_active,
    tasks:       row.tasks || [],
  };
}

function mapChallenge(row) {
  return {
    id:               row.id,
    name:             row.name,
    description:      row.description      || '',
    code:             row.code             || null,
    isPrivate:        row.is_private       ?? false,
    isVisible:        row.is_visible       ?? false,
    visibleToGroups:  row.visible_to_groups || [],
    startDate:        row.start_date       || '',
    endDate:          row.end_date         || '',
    isActive:         row.is_active        ?? true,
    activities:       row.activities       || [],
    periods:          row.periods          || [],
    createdAt:        row.created_at       || '',
  };
}

function mapChallengeMembership(row) {
  return {
    id:          row.id,
    challengeId: row.challenge_id,
    studentId:   row.student_id,
    joinedAt:    row.joined_at || '',
  };
}

function mapAnnouncement(row) {
  return {
    id:              row.id,
    title:           row.title,
    message:         row.message          || '',
    visibleToGroups: row.visible_to_groups || [],
    isPinned:        row.is_pinned        ?? false,
    isActive:        row.is_active        ?? true,
    createdAt:       row.created_at       || '',
  };
}

// ─── ENSURE COMMUNITY ─────────────────────────────────────────────
let _communityId = null;

export async function dbEnsureCommunity() {
  if (_communityId) return _communityId;
  console.log('[db] dbEnsureCommunity — checking communities table');
  try {
    const { data, error } = await supabase.from('communities').select('id').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (data) { _communityId = data.id; return _communityId; }

    const { data: inserted, error: insertError } = await supabase
      .from('communities')
      .insert({ id: 'main', name: 'Kyrgyz Community Center' })
      .select('id').single();
    if (insertError) throw insertError;
    _communityId = inserted.id;
    console.log('[db] ✓ dbEnsureCommunity — default community inserted');
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
      console.log('[db] ✓ dbLoadCommunity — loaded from Supabase');
      return {
        name:        data.name         || '',
        logo:        data.logo         ?? null,
        banner:      data.banner       ?? null,
        bannerDark:  data.banner_dark  ?? null,
        bannerLight: data.banner_light ?? null,
      };
    }
  } catch (e) {
    console.error('[db] dbLoadCommunity — Supabase error:', e);
  }
  return null;
}

// ─── GROUPS LOAD ──────────────────────────────────────────────────
export async function dbLoadGroups() {
  console.log('[db] dbLoadGroups — fetching from Supabase');
  try {
    const { data, error } = await supabase.from('groups').select('*');
    if (error) throw error;
    const groups = (data || []).map(r => ({ id: r.id, name: r.name, groupCode: r.group_code, isActive: r.is_active }));
    console.log(`[db] ✓ dbLoadGroups — ${groups.length} groups loaded`);
    return groups;
  } catch (e) {
    console.error('[db] dbLoadGroups — Supabase error:', e);
    return [];
  }
}

// ─── loadAll ──────────────────────────────────────────────────────
export async function loadAll() {
  console.log('[db] loadAll — loading all app data from Supabase…');

  const TABLE_NAMES = [
    'students', 'submissions', 'bonus_points', 'books', 'program_completions',
    'activities', 'periods', 'global_tasbihs', 'personal_tasbih_templates',
    'programs', 'collective_task_counts', 'admin_settings',
    'challenges', 'challenge_memberships', 'announcements',
  ];

  const [
    { data: studentRows,      error: e1  },
    { data: submissionRows,   error: e2  },
    { data: bonusRows,        error: e3  },
    { data: bookRows,         error: e4  },
    { data: completionRows,   error: e5  },
    { data: activityRows,     error: e6  },
    { data: periodRows,       error: e7  },
    { data: tasbihRows,       error: e8  },
    { data: templateRows,     error: e9  },
    { data: programRows,      error: e10 },
    { data: ctcRows,          error: e11 },
    { data: settingsRow,      error: e12 },
    { data: challengeRows,    error: e13 },
    { data: membershipRows,   error: e14 },
    { data: announcementRows, error: e15 },
    community,
    groups,
  ] = await Promise.all([
    supabase.from('students').select('*'),
    supabase.from('submissions').select('*'),
    supabase.from('bonus_points').select('*'),
    supabase.from('books').select('*'),
    supabase.from('program_completions').select('*'),
    supabase.from('activities').select('*'),
    supabase.from('periods').select('*'),
    supabase.from('global_tasbihs').select('*'),
    supabase.from('personal_tasbih_templates').select('*'),
    supabase.from('programs').select('*'),
    supabase.from('collective_task_counts').select('*'),
    supabase.from('admin_settings').select('*').eq('id', 'main').maybeSingle(),
    supabase.from('challenges').select('*'),
    supabase.from('challenge_memberships').select('*'),
    supabase.from('announcements').select('*'),
    dbLoadCommunity(),
    dbLoadGroups(),
  ]);

  [e1,e2,e3,e4,e5,e6,e7,e8,e9,e10,e11,e12,e13,e14,e15].forEach((e, i) => {
    if (e) console.error(`[db] loadAll — ${TABLE_NAMES[i]} error:`, e);
  });

  const students = (studentRows || []).map(row => {
    const subs  = (submissionRows  || []).filter(r => r.student_id === row.id).map(mapSubmission);
    const bonus = (bonusRows       || []).filter(r => r.student_id === row.id).map(mapBonusPoint);
    const books = (bookRows        || []).filter(r => r.student_id === row.id).map(mapBook);
    const comps = (completionRows  || []).filter(r => r.student_id === row.id).map(mapProgramCompletion);
    return mapStudent(row, subs, bonus, books, comps);
  });

  const collectiveTaskCounts = Object.fromEntries(
    (ctcRows || []).map(r => [r.task_id, { count: r.count, completedTimes: r.completed_times }])
  );

  const s = settingsRow || {};
  const adminSettings = {
    adminUsername:    s.admin_username    || 'admin',
    adminPassword:    s.admin_password    || 'admin1',
    registrationMode: s.registration_mode || 'open',
    programsLabel:    s.programs_label    || 'Programs',
  };

  console.log(`[db] ✓ loadAll — ${students.length} students, ${activityRows?.length || 0} activities, ${periodRows?.length || 0} periods`);
  return {
    community,
    adminSettings,
    groups,
    students,
    activities:              (activityRows      || []).map(mapActivity),
    periods:                 (periodRows        || []).map(mapPeriod),
    globalTasbihs:           (tasbihRows        || []).map(mapGlobalTasbih),
    personalTasbihTemplates: (templateRows      || []).map(mapPersonalTemplate),
    programs:                (programRows       || []).map(mapProgram),
    collectiveTaskCounts,
    challenges:              (challengeRows     || []).map(mapChallenge),
    challengeMemberships:    (membershipRows    || []).map(mapChallengeMembership),
    announcements:           (announcementRows  || []).map(mapAnnouncement),
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
  if (error) { console.error('[db] saveCommunity — Supabase write FAILED:', error); return false; }
  console.log('[db] ✓ saveCommunity — saved to Supabase');
  return true;
}

// ─── ADMIN SETTINGS ───────────────────────────────────────────────
// The SQL schema seeds admin_settings with a default 'main' row.
// We always UPDATE — never INSERT — since that row is always present.
export async function dbSaveAdminSettings(fields) {
  console.log('[db] saveAdminSettings:', Object.keys(fields));
  const row = {};
  if (fields.adminUsername    !== undefined) row.admin_username    = fields.adminUsername;
  if (fields.adminPassword    !== undefined) row.admin_password    = fields.adminPassword;
  if (fields.registrationMode !== undefined) row.registration_mode = fields.registrationMode;
  if (fields.programsLabel    !== undefined) row.programs_label    = fields.programsLabel;

  const { error } = await supabase.from('admin_settings').update(row).eq('id', 'main');
  if (error) { console.error('[db] saveAdminSettings — Supabase write FAILED:', error); return false; }
  console.log('[db] ✓ saveAdminSettings — saved to Supabase');
  return true;
}

// ─── GROUPS ───────────────────────────────────────────────────────
export async function dbAddGroup(group) {
  console.log('[db] addGroup — writing to Supabase:', group.name);
  const communityId = await dbEnsureCommunity();
  if (!communityId) { console.error('[db] addGroup — cannot insert without a community_id'); return null; }

  const { error } = await supabase.from('groups').insert({
    id:           group.id,
    name:         group.name,
    group_code:   group.groupCode,
    is_active:    group.isActive ?? true,
    community_id: communityId,
  });
  if (error) { console.error('[db] addGroup — Supabase write FAILED:', error); return null; }
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
  if (error) { console.error('[db] updateGroup — Supabase write FAILED:', error); return false; }
  console.log('[db] ✓ updateGroup — saved to Supabase:', id);
  return true;
}

// ─── ACTIVITIES ───────────────────────────────────────────────────
export async function dbAddActivity(act) {
  console.log('[db] addActivity:', act.name);
  const { error } = await supabase.from('activities').insert({
    id:        act.id,
    group_id:  act.groupId,
    name:      act.name,
    points:    act.points,
    is_active: act.isActive ?? true,
  });
  if (error) { console.error('[db] addActivity — Supabase write FAILED:', error); return null; }
  return act;
}

export async function dbAddActivities(acts) {
  console.log('[db] addActivities:', acts.length);
  const rows = acts.map(act => ({
    id:        act.id,
    group_id:  act.groupId,
    name:      act.name,
    points:    act.points,
    is_active: act.isActive ?? true,
  }));
  const { error } = await supabase.from('activities').insert(rows);
  if (error) { console.error('[db] addActivities — Supabase write FAILED:', error); return null; }
  return acts;
}

export async function dbUpdateActivity(id, fields) {
  console.log('[db] updateActivity:', id);
  const row = {};
  if (fields.name     !== undefined) row.name      = fields.name;
  if (fields.points   !== undefined) row.points    = fields.points;
  if (fields.isActive !== undefined) row.is_active = fields.isActive;
  if (fields.groupId  !== undefined) row.group_id  = fields.groupId;

  const { error } = await supabase.from('activities').update(row).eq('id', id);
  if (error) { console.error('[db] updateActivity — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── PERIODS ──────────────────────────────────────────────────────
export async function dbAddPeriod(period) {
  console.log('[db] addPeriod:', period.name);
  const { error } = await supabase.from('periods').insert({
    id:                 period.id,
    group_id:           period.groupId,
    name:               period.name,
    start_date:         period.startDate         || null,
    end_date:           period.endDate           || null,
    is_active:          period.isActive          ?? false,
    count_for_all_time: period.countForAllTime   ?? false,
    prize_text:         period.prizeText         || '',
  });
  if (error) { console.error('[db] addPeriod — Supabase write FAILED:', error); return null; }
  return period;
}

export async function dbUpdatePeriod(id, fields) {
  console.log('[db] updatePeriod:', id);
  const row = {};
  if (fields.name             !== undefined) row.name               = fields.name;
  if (fields.startDate        !== undefined) row.start_date         = fields.startDate;
  if (fields.endDate          !== undefined) row.end_date           = fields.endDate;
  if (fields.isActive         !== undefined) row.is_active          = fields.isActive;
  if (fields.countForAllTime  !== undefined) row.count_for_all_time = fields.countForAllTime;
  if (fields.prizeText        !== undefined) row.prize_text         = fields.prizeText;

  const { error } = await supabase.from('periods').update(row).eq('id', id);
  if (error) { console.error('[db] updatePeriod — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeletePeriod(id) {
  console.log('[db] deletePeriod:', id);
  const { error } = await supabase.from('periods').delete().eq('id', id);
  if (error) { console.error('[db] deletePeriod — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbActivatePeriod(id, groupId) {
  console.log('[db] activatePeriod:', id, groupId);
  // Deactivate all periods in the group, then activate the target one
  const { error: e1 } = await supabase.from('periods').update({ is_active: false }).eq('group_id', groupId);
  if (e1) { console.error('[db] activatePeriod — deactivate-all FAILED:', e1); return false; }
  const { error: e2 } = await supabase.from('periods').update({ is_active: true }).eq('id', id);
  if (e2) { console.error('[db] activatePeriod — activate FAILED:', e2); return false; }
  return true;
}

// ─── STUDENTS ─────────────────────────────────────────────────────
export async function dbRegisterStudent(student) {
  console.log('[db] registerStudent:', student.username, '— inserting into Supabase');

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
    tasbih:                   student.tasbih || { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false },
    personal_tasbih_progress: student.personalTasbihProgress || {},
    personal_tasbihs:         student.personalTasbihs        || [],
  });

  if (error) {
    console.error('[db] registerStudent — Supabase write FAILED:', error);
    return null;
  }

  console.log('[db] ✓ registerStudent — inserted into Supabase:', student.username);
  return { ...student, submissions: [], bonusPoints: [], books: [], programCompletions: [], personalTasbihs: student.personalTasbihs || [] };
}

export async function dbUpdateStudent(id, fields) {
  console.log('[db] updateStudent:', id, Object.keys(fields));
  const row = {};
  if (fields.fullName          !== undefined) row.full_name           = fields.fullName;
  if (fields.username          !== undefined) row.username            = fields.username;
  if (fields.password          !== undefined) row.password            = fields.password;
  if (fields.groupId           !== undefined) row.group_id            = fields.groupId;
  if (fields.secondaryGroupIds !== undefined) row.secondary_group_ids = fields.secondaryGroupIds;
  if (fields.status            !== undefined) row.status              = fields.status;
  if (fields.university        !== undefined) row.university          = fields.university;
  if (fields.phone             !== undefined) row.phone               = fields.phone;
  if (fields.avatar            !== undefined) row.avatar              = fields.avatar;
  if (fields.telegramUsername  !== undefined) row.telegram_username   = fields.telegramUsername;
  if (fields.preferredLanguage !== undefined) row.preferred_language  = fields.preferredLanguage;

  if (Object.keys(row).length === 0) return true;

  const { error } = await supabase.from('students').update(row).eq('id', id);
  if (error) { console.error('[db] updateStudent — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeleteStudent(id) {
  console.log('[db] deleteStudent:', id);
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) { console.error('[db] deleteStudent — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────
export async function dbSubmitDay(studentId, dateStr, completedActivities, quote) {
  console.log('[db] submitDay:', studentId, dateStr);
  const { data: existing } = await supabase
    .from('submissions').select('id').eq('student_id', studentId).eq('date', dateStr).maybeSingle();
  if (existing) { console.log('[db] submitDay — already submitted, skipping'); return true; }

  const { error } = await supabase.from('submissions').insert({
    id:                   generateId(),
    student_id:           studentId,
    date:                 dateStr,
    completed_activities: completedActivities,
    quote:                quote || '',
    quote_likes:          [],
  });
  if (error) { console.error('[db] submitDay — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbEditSubmission(studentId, dateStr, completedActivities, scoreOverride) {
  console.log('[db] editSubmission:', studentId, dateStr);
  const { data: existing } = await supabase
    .from('submissions').select('id').eq('student_id', studentId).eq('date', dateStr).maybeSingle();

  const updatePayload = { completed_activities: completedActivities };
  if (typeof scoreOverride === 'number') updatePayload.score_override = scoreOverride;
  else updatePayload.score_override = null;

  if (existing) {
    const { error } = await supabase.from('submissions')
      .update(updatePayload)
      .eq('student_id', studentId).eq('date', dateStr);
    if (error) { console.error('[db] editSubmission update — FAILED:', error); return false; }
  } else {
    const { error } = await supabase.from('submissions').insert({
      id:                   generateId(),
      student_id:           studentId,
      date:                 dateStr,
      completed_activities: completedActivities,
      score_override:       typeof scoreOverride === 'number' ? scoreOverride : null,
      quote:                '',
      quote_likes:          [],
    });
    if (error) { console.error('[db] editSubmission insert — FAILED:', error); return false; }
  }
  return true;
}

export async function dbDeleteSubmission(studentId, dateStr) {
  console.log('[db] deleteSubmission:', studentId, dateStr);
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('student_id', studentId)
    .eq('date', dateStr);
  if (error) { console.error('[db] deleteSubmission — FAILED:', error); return false; }
  return true;
}

export async function dbToggleQuoteLike(ownerId, dateStr, likerId) {
  console.log('[db] toggleQuoteLike:', ownerId, dateStr, likerId);
  const { data, error: fetchError } = await supabase
    .from('submissions').select('quote_likes').eq('student_id', ownerId).eq('date', dateStr).maybeSingle();
  if (fetchError) { console.error('[db] toggleQuoteLike fetch — FAILED:', fetchError); return false; }
  if (!data) return false;

  const likes = data.quote_likes || [];
  const newLikes = likes.includes(likerId) ? likes.filter(l => l !== likerId) : [...likes, likerId];

  const { error } = await supabase.from('submissions')
    .update({ quote_likes: newLikes }).eq('student_id', ownerId).eq('date', dateStr);
  if (error) { console.error('[db] toggleQuoteLike update — FAILED:', error); return false; }
  return true;
}

// ─── BONUS POINTS ─────────────────────────────────────────────────
export async function dbAddBonusPoints(studentId, date, points, reason) {
  console.log('[db] addBonusPoints:', studentId, points);
  const bp = { id: generateId(), date, points: Number(points), reason: reason || '' };
  const { error } = await supabase.from('bonus_points').insert({
    id:         bp.id,
    student_id: studentId,
    date:       bp.date,
    points:     bp.points,
    reason:     bp.reason,
  });
  if (error) { console.error('[db] addBonusPoints — Supabase write FAILED:', error); return null; }
  return bp;
}

export async function dbUpdateBonusPoints(_studentId, bonusId, fields) {
  console.log('[db] updateBonusPoints:', bonusId);
  const row = {};
  if (fields.points !== undefined) row.points = Number(fields.points);
  if (fields.reason !== undefined) row.reason = fields.reason;
  const { error } = await supabase.from('bonus_points').update(row).eq('id', bonusId);
  if (error) { console.error('[db] updateBonusPoints — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeleteBonusPoints(_studentId, bonusId) {
  console.log('[db] deleteBonusPoints:', bonusId);
  const { error } = await supabase.from('bonus_points').delete().eq('id', bonusId);
  if (error) { console.error('[db] deleteBonusPoints — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── STUDENT TASBIH ───────────────────────────────────────────────
export async function dbUpdateTasbih(studentId, tasbih) {
  console.log('[db] updateTasbih:', studentId);
  const { error } = await supabase.from('students').update({ tasbih }).eq('id', studentId);
  if (error) { console.error('[db] updateTasbih — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── GLOBAL TASBIH ────────────────────────────────────────────────
export async function dbAddGlobalTasbih(t) {
  console.log('[db] addGlobalTasbih:', t.title);
  const { error } = await supabase.from('global_tasbihs').insert({
    id:              t.id,
    title:           t.title,
    description:     t.description  || '',
    target:          t.target,
    current:          t.current       ?? 0,
    completed_times:  t.completedTimes ?? 0,
    is_active:        t.isActive      ?? true,
    group_scope:      t.groupScope    || 'all',
    reset_type:       t.resetType     || 'none',
    last_reset_date:  t.lastResetDate || '',
  });
  if (error) { console.error('[db] addGlobalTasbih — Supabase write FAILED:', error); return null; }
  return t;
}

export async function dbUpdateGlobalTasbih(id, fields) {
  console.log('[db] updateGlobalTasbih:', id);
  const row = {};
  if (fields.title          !== undefined) row.title           = fields.title;
  if (fields.description    !== undefined) row.description     = fields.description;
  if (fields.target         !== undefined) row.target          = fields.target;
  if (fields.current        !== undefined) row.current         = fields.current;
  if (fields.completedTimes !== undefined) row.completed_times  = fields.completedTimes;
  if (fields.isActive       !== undefined) row.is_active        = fields.isActive;
  if (fields.groupScope     !== undefined) row.group_scope      = fields.groupScope;
  if (fields.resetType      !== undefined) row.reset_type       = fields.resetType;
  if (fields.lastResetDate  !== undefined) row.last_reset_date  = fields.lastResetDate;

  const { error } = await supabase.from('global_tasbihs').update(row).eq('id', id);
  if (error) { console.error('[db] updateGlobalTasbih — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── PERSONAL TASBIH TEMPLATES ────────────────────────────────────
export async function dbAddPersonalTemplate(t) {
  console.log('[db] addPersonalTemplate:', t.title);
  const { error } = await supabase.from('personal_tasbih_templates').insert({
    id:          t.id,
    title:       t.title,
    description: t.description || '',
    target:      t.target,
    group_scope: t.groupScope  || 'all',
    is_active:   t.isActive    ?? true,
    reset_type:  t.resetType   || 'none',
  });
  if (error) { console.error('[db] addPersonalTemplate — Supabase write FAILED:', error); return null; }
  return t;
}

export async function dbUpdatePersonalTemplate(id, fields) {
  console.log('[db] updatePersonalTemplate:', id);
  const row = {};
  if (fields.title       !== undefined) row.title       = fields.title;
  if (fields.description !== undefined) row.description = fields.description;
  if (fields.target      !== undefined) row.target      = fields.target;
  if (fields.groupScope  !== undefined) row.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) row.is_active   = fields.isActive;
  if (fields.resetType   !== undefined) row.reset_type  = fields.resetType;

  const { error } = await supabase.from('personal_tasbih_templates').update(row).eq('id', id);
  if (error) { console.error('[db] updatePersonalTemplate — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeletePersonalTemplate(id) {
  console.log('[db] deletePersonalTemplate:', id);
  const { error } = await supabase.from('personal_tasbih_templates').delete().eq('id', id);
  if (error) { console.error('[db] deletePersonalTemplate — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── PERSONAL TASBIH PROGRESS ─────────────────────────────────────
export async function dbSavePersonalTplProgress(studentId, fullProgress) {
  console.log('[db] savePersonalTplProgress:', studentId);
  const { error } = await supabase.from('students')
    .update({ personal_tasbih_progress: fullProgress }).eq('id', studentId);
  if (error) { console.error('[db] savePersonalTplProgress — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── STUDENT PERSONAL TASBIHS (student-created) ───────────────────
// Saves the entire personal_tasbihs array for a student.
export async function dbSavePersonalTasbihs(studentId, personalTasbihs) {
  console.log('[db] savePersonalTasbihs:', studentId, personalTasbihs.length);
  const { error } = await supabase.from('students')
    .update({ personal_tasbihs: personalTasbihs }).eq('id', studentId);
  if (error) { console.error('[db] savePersonalTasbihs — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── READING BOOKS ────────────────────────────────────────────────
export async function dbAddBook(studentId, book) {
  console.log('[db] addBook:', studentId, book.title);
  const { error } = await supabase.from('books').insert({
    id:           book.id,
    student_id:   studentId,
    title:        book.title        || '',
    author:       book.author       || '',
    total_pages:  book.totalPages   || 0,
    current_page: book.currentPage  || 0,
    status:       book.status       || 'reading',
    started_date:  book.startedDate  || null,
    finished_date: book.finishedDate || null,
  });
  if (error) { console.error('[db] addBook — Supabase write FAILED:', error); return null; }
  return book;
}

export async function dbUpdateBook(bookId, fields) {
  console.log('[db] updateBook:', bookId);
  const row = {};
  if (fields.title        !== undefined) row.title         = fields.title;
  if (fields.author       !== undefined) row.author        = fields.author;
  if (fields.totalPages   !== undefined) row.total_pages   = fields.totalPages;
  if (fields.currentPage  !== undefined) row.current_page  = fields.currentPage;
  if (fields.status       !== undefined) row.status        = fields.status;
  if (fields.startedDate  !== undefined) row.started_date  = fields.startedDate;
  if (fields.finishedDate !== undefined) row.finished_date = fields.finishedDate;

  const { error } = await supabase.from('books').update(row).eq('id', bookId);
  if (error) { console.error('[db] updateBook — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeleteBook(bookId) {
  console.log('[db] deleteBook:', bookId);
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) { console.error('[db] deleteBook — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── PROGRAMS ─────────────────────────────────────────────────────
export async function dbAddProgram(program) {
  console.log('[db] addProgram:', program.name);
  const { error } = await supabase.from('programs').insert({
    id:          program.id,
    name:        program.name,
    description: program.description || '',
    date:        program.date        || null,
    group_scope: program.groupScope  || 'all',
    is_active:   program.isActive    ?? true,
    tasks:       program.tasks       || [],
  });
  if (error) { console.error('[db] addProgram — Supabase write FAILED:', error); return null; }
  return program;
}

export async function dbUpdateProgram(id, fields) {
  console.log('[db] updateProgram:', id);
  const row = {};
  if (fields.name        !== undefined) row.name        = fields.name;
  if (fields.description !== undefined) row.description = fields.description;
  if (fields.date        !== undefined) row.date        = fields.date;
  if (fields.groupScope  !== undefined) row.group_scope = fields.groupScope;
  if (fields.isActive    !== undefined) row.is_active   = fields.isActive;
  if (fields.tasks       !== undefined) row.tasks       = fields.tasks;

  const { error } = await supabase.from('programs').update(row).eq('id', id);
  if (error) { console.error('[db] updateProgram — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeleteProgram(id) {
  console.log('[db] deleteProgram:', id);
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) { console.error('[db] deleteProgram — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── PROGRAM COMPLETIONS ──────────────────────────────────────────
export async function dbSaveProgramCompletion(studentId, programId, taskId, isDone, count) {
  console.log('[db] saveProgramCompletion:', studentId, taskId);
  const { data: existing } = await supabase
    .from('program_completions').select('id')
    .eq('student_id', studentId).eq('task_id', taskId).maybeSingle();

  if (existing) {
    const { error } = await supabase.from('program_completions')
      .update({ is_done: isDone, count })
      .eq('student_id', studentId).eq('task_id', taskId);
    if (error) { console.error('[db] saveProgramCompletion update — FAILED:', error); return false; }
  } else {
    const { error } = await supabase.from('program_completions').insert({
      id:         generateId(),
      student_id: studentId,
      program_id: programId,
      task_id:    taskId,
      is_done:    isDone,
      count,
    });
    if (error) { console.error('[db] saveProgramCompletion insert — FAILED:', error); return false; }
  }
  return true;
}

// ─── COLLECTIVE TASK COUNTS ───────────────────────────────────────
export async function dbUpdateCollectiveTask(taskId, count, completedTimes) {
  console.log('[db] updateCollectiveTask:', taskId, count);
  const { error } = await supabase.from('collective_task_counts').upsert(
    { task_id: taskId, count, completed_times: completedTimes },
    { onConflict: 'task_id' }
  );
  if (error) { console.error('[db] updateCollectiveTask — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── CHALLENGES ───────────────────────────────────────────────────
export async function dbLoadChallenges() {
  console.log('[db] dbLoadChallenges — fetching from Supabase');
  try {
    const { data, error } = await supabase.from('challenges').select('*');
    if (error) throw error;
    return (data || []).map(mapChallenge);
  } catch (e) {
    console.error('[db] dbLoadChallenges — Supabase error:', e);
    return [];
  }
}

export async function dbAddChallenge(challenge) {
  console.log('[db] addChallenge:', challenge.name);
  const { error } = await supabase.from('challenges').insert({
    id:                challenge.id,
    name:              challenge.name,
    description:       challenge.description      || '',
    code:              challenge.code             || null,
    is_private:        challenge.isPrivate        ?? false,
    is_visible:        challenge.isVisible        ?? false,
    visible_to_groups: challenge.visibleToGroups  || [],
    start_date:        challenge.startDate        || '',
    end_date:          challenge.endDate          || '',
    is_active:         challenge.isActive         ?? true,
    activities:        challenge.activities       || [],
  });
  if (error) { console.error('[db] addChallenge — Supabase write FAILED:', error); return null; }
  return challenge;
}

export async function dbUpdateChallenge(id, fields) {
  console.log('[db] updateChallenge:', id);
  const row = {};
  if (fields.name             !== undefined) row.name               = fields.name;
  if (fields.description      !== undefined) row.description        = fields.description;
  if (fields.code             !== undefined) row.code               = fields.code;
  if (fields.isPrivate        !== undefined) row.is_private         = fields.isPrivate;
  if (fields.isVisible        !== undefined) row.is_visible         = fields.isVisible;
  if (fields.visibleToGroups  !== undefined) row.visible_to_groups  = fields.visibleToGroups;
  if (fields.startDate        !== undefined) row.start_date         = fields.startDate;
  if (fields.endDate          !== undefined) row.end_date           = fields.endDate;
  if (fields.isActive         !== undefined) row.is_active          = fields.isActive;
  if (fields.activities       !== undefined) row.activities         = fields.activities;
  if (fields.periods          !== undefined) row.periods            = fields.periods;

  const { error } = await supabase.from('challenges').update(row).eq('id', id);
  if (error) { console.error('[db] updateChallenge — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeleteChallenge(id) {
  console.log('[db] deleteChallenge:', id);
  const { error } = await supabase.from('challenges').delete().eq('id', id);
  if (error) { console.error('[db] deleteChallenge — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── CHALLENGE MEMBERSHIPS ────────────────────────────────────────
export async function dbJoinChallenge(challengeId, studentId) {
  console.log('[db] joinChallenge:', challengeId, studentId);
  // Check for duplicate
  const { data: existing } = await supabase
    .from('challenge_memberships')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (existing) return { id: existing.id, challengeId, studentId };

  const id = generateId();
  const { error } = await supabase.from('challenge_memberships').insert({
    id,
    challenge_id: challengeId,
    student_id:   studentId,
  });
  if (error) { console.error('[db] joinChallenge — Supabase write FAILED:', error); return null; }
  return { id, challengeId, studentId };
}

export async function dbLoadStudentChallenges(studentId) {
  console.log('[db] loadStudentChallenges:', studentId);
  try {
    const { data, error } = await supabase
      .from('challenge_memberships')
      .select('*')
      .eq('student_id', studentId);
    if (error) throw error;
    return (data || []).map(mapChallengeMembership);
  } catch (e) {
    console.error('[db] loadStudentChallenges — Supabase error:', e);
    return [];
  }
}

export async function dbLoadChallengeMemberships(challengeId) {
  console.log('[db] loadChallengeMemberships:', challengeId);
  try {
    const { data, error } = await supabase
      .from('challenge_memberships')
      .select('*')
      .eq('challenge_id', challengeId);
    if (error) throw error;
    return (data || []).map(mapChallengeMembership);
  } catch (e) {
    console.error('[db] loadChallengeMemberships — Supabase error:', e);
    return [];
  }
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────
export async function dbLoadAnnouncements() {
  console.log('[db] dbLoadAnnouncements — fetching from Supabase');
  try {
    const { data, error } = await supabase.from('announcements').select('*');
    if (error) throw error;
    return (data || []).map(mapAnnouncement);
  } catch (e) {
    console.error('[db] dbLoadAnnouncements — Supabase error:', e);
    return [];
  }
}

export async function dbAddAnnouncement(ann) {
  console.log('[db] addAnnouncement:', ann.title);
  const { error } = await supabase.from('announcements').insert({
    id:               ann.id,
    title:            ann.title,
    message:          ann.message          || '',
    visible_to_groups: ann.visibleToGroups || [],
    is_pinned:        ann.isPinned         ?? false,
    is_active:        ann.isActive         ?? true,
  });
  if (error) { console.error('[db] addAnnouncement — Supabase write FAILED:', error); return null; }
  return ann;
}

export async function dbUpdateAnnouncement(id, fields) {
  console.log('[db] updateAnnouncement:', id);
  const row = {};
  if (fields.title            !== undefined) row.title             = fields.title;
  if (fields.message          !== undefined) row.message           = fields.message;
  if (fields.visibleToGroups  !== undefined) row.visible_to_groups = fields.visibleToGroups;
  if (fields.isPinned         !== undefined) row.is_pinned         = fields.isPinned;
  if (fields.isActive         !== undefined) row.is_active         = fields.isActive;

  const { error } = await supabase.from('announcements').update(row).eq('id', id);
  if (error) { console.error('[db] updateAnnouncement — Supabase write FAILED:', error); return false; }
  return true;
}

export async function dbDeleteAnnouncement(id) {
  console.log('[db] deleteAnnouncement:', id);
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) { console.error('[db] deleteAnnouncement — Supabase write FAILED:', error); return false; }
  return true;
}

// ─── Realtime subscriptions ───────────────────────────────────────
export function subscribeToGlobalTasbihs(cb) {
  const channel = supabase.channel('rt_global_tasbihs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'global_tasbihs' }, cb)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToStudents(cb) {
  const channel = supabase.channel('rt_students')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, cb)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToSubmissions(cb) {
  const channel = supabase.channel('rt_submissions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, cb)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
