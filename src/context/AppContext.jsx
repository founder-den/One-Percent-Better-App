import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateId, todayString, setSessionUsername } from '../services/data.js';
import { checkAndResetTasbih } from '../services/calculations.js';
import {
  loadAll,
  dbEnsureCommunity, dbLoadCommunity, dbLoadGroups,
  dbSaveCommunity,
  dbSaveAdminSettings,
  dbAddGroup, dbUpdateGroup,
  dbAddActivity, dbAddActivities, dbUpdateActivity,
  dbAddPeriod, dbUpdatePeriod, dbDeletePeriod, dbActivatePeriod,
  dbRegisterStudent, dbUpdateStudent, dbDeleteStudent,
  dbSubmitDay, dbEditSubmission, dbDeleteSubmission,
  dbToggleQuoteLike,
  dbAddBonusPoints,
  dbUpdateTasbih,
  dbAddGlobalTasbih, dbUpdateGlobalTasbih,
  dbAddPersonalTemplate, dbUpdatePersonalTemplate, dbDeletePersonalTemplate,
  dbSavePersonalTplProgress,
  dbAddBook, dbUpdateBook, dbDeleteBook,
  dbAddProgram, dbUpdateProgram, dbDeleteProgram,
  dbSaveProgramCompletion,
  dbUpdateCollectiveTask,
  dbSavePersonalTasbihs,
  dbAddChallenge, dbUpdateChallenge, dbDeleteChallenge,
  dbJoinChallenge,
  subscribeToGlobalTasbihs,
  subscribeToStudents,
  subscribeToSubmissions,
} from '../services/db.js';

const DEFAULT_ACTIVITIES = [
  { name: 'Reading Book',      points: 10 },
  { name: 'Awwabin Namaz',     points: 20 },
  { name: 'Kaza Namaz',        points: 10 },
  { name: 'Quran Reading',     points: 30 },
  { name: 'Learning New Ayat', points: 20 },
  { name: 'Tahajjud',          points: 25 },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [loading,  setLoading]  = useState(true);
  const [dbError,  setDbError]  = useState(null);

  // ── Core state ────────────────────────────────────────────────
  const [community,               setCommunity]           = useState(null);
  const [adminUsername,           setAdminUsername]       = useState('admin');
  const [adminPassword,           setAdminPassword]       = useState('admin1');
  const [registrationMode,        setRegModeState]        = useState('open');
  const [programsLabel,           setProgramsLabelState]  = useState('Programs');
  const [groups,                  setGroups]              = useState([]);
  const [students,                setStudents]            = useState([]);
  const [activities,              setActivities]          = useState([]);
  const [periods,                 setPeriods]             = useState([]);
  const [globalTasbihs,           setGlobalTasbihs]       = useState([]);
  const [personalTasbihTemplates, setPersonalTemplates]   = useState([]);
  const [programs,                setPrograms]            = useState([]);
  const [collectiveTaskCounts,    setCollectiveCounts]    = useState({});
  const [challenges,              setChallenges]          = useState([]);
  const [challengeMemberships,    setChallengeMemberships] = useState([]);

  // ── Load everything on mount ──────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure community row exists in Supabase before any other writes
      await dbEnsureCommunity();
      // Community and groups fetched directly from Supabase (fall back to localStorage)
      const [community, groups, data] = await Promise.all([
        dbLoadCommunity(),
        dbLoadGroups(),
        loadAll(),
      ]);
      setCommunity(community);
      setGroups(groups);
      setAdminUsername(data.adminSettings.adminUsername);
      setAdminPassword(data.adminSettings.adminPassword);
      setRegModeState(data.adminSettings.registrationMode);
      setProgramsLabelState(data.adminSettings.programsLabel);
      // ── Auto-reset global tasbihs ─────────────────────────────
      const resetGlobals = data.globalTasbihs.map(t => {
        const { needsReset, newLastResetDate } = checkAndResetTasbih(t.resetType, t.lastResetDate);
        if (needsReset) {
          dbUpdateGlobalTasbih(t.id, { current: 0, lastResetDate: newLastResetDate });
          return { ...t, current: 0, lastResetDate: newLastResetDate };
        }
        return t;
      });

      // ── Auto-reset student personal tasbihs + template progress ──
      const resetStudents = data.students.map(st => {
        let changed = false;

        // student.personalTasbihs (student-created)
        const newPT = (st.personalTasbihs || []).map(pt => {
          const { needsReset, newLastResetDate } = checkAndResetTasbih(pt.resetType, pt.lastResetDate);
          if (needsReset) { changed = true; return { ...pt, current: 0, lastResetDate: newLastResetDate }; }
          return pt;
        });

        // personalTasbihProgress (admin template progress)
        const newProg = { ...(st.personalTasbihProgress || {}) };
        data.personalTasbihTemplates.forEach(tpl => {
          if (!tpl.resetType || tpl.resetType === 'none') return;
          const prog = newProg[tpl.id] || { count: 0, lastResetDate: '' };
          const { needsReset, newLastResetDate } = checkAndResetTasbih(tpl.resetType, prog.lastResetDate);
          if (needsReset) {
            changed = true;
            newProg[tpl.id] = { count: 0, lastResetDate: newLastResetDate };
          }
        });

        if (changed) {
          dbSavePersonalTasbihs(st.id, newPT);
          dbSavePersonalTplProgress(st.id, newProg);
          return { ...st, personalTasbihs: newPT, personalTasbihProgress: newProg };
        }
        return { ...st, personalTasbihs: newPT };
      });

      setStudents(resetStudents);
      setActivities(data.activities);
      setPeriods(data.periods);
      setGlobalTasbihs(resetGlobals);
      setPersonalTemplates(data.personalTasbihTemplates);
      setPrograms(data.programs);
      setCollectiveCounts(data.collectiveTaskCounts);
      setChallenges(data.challenges || []);
      setChallengeMemberships(data.challengeMemberships || []);
    } catch (err) {
      console.error('[AppContext] load failed:', err);
      setDbError(err.message || 'Failed to load data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Realtime subscriptions ────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const unsubGlobal = subscribeToGlobalTasbihs(async () => {
      const data = await loadAll();
      setGlobalTasbihs(data.globalTasbihs);
      setCollectiveCounts(data.collectiveTaskCounts);
    });
    const unsubStudents = subscribeToStudents(async () => {
      const data = await loadAll();
      setStudents(data.students);
    });
    const unsubSubs = subscribeToSubmissions(async () => {
      const data = await loadAll();
      setStudents(data.students);
    });
    return () => { unsubGlobal(); unsubStudents(); unsubSubs(); };
  }, [loading]);

  // ── Community ─────────────────────────────────────────────────
  const updateCommunity = useCallback(async (fields) => {
    console.log('[AppContext] updateCommunity:', fields);
    const updated = { ...(community || {}), ...fields };
    const ok = await dbSaveCommunity(updated);
    if (!ok) { console.error('[AppContext] updateCommunity: Supabase write failed — state NOT updated'); return; }
    setCommunity(updated);
  }, [community]);

  // ── Admin settings ────────────────────────────────────────────
  const changeAdminUsername = useCallback(async (u) => {
    console.log('[AppContext] changeAdminUsername:', u);
    const ok = await dbSaveAdminSettings({ adminUsername: u });
    if (!ok) { console.error('[AppContext] changeAdminUsername failed — state NOT updated'); return; }
    setAdminUsername(u);
  }, []);

  const changeAdminPassword = useCallback(async (pw) => {
    console.log('[AppContext] changeAdminPassword');
    const ok = await dbSaveAdminSettings({ adminPassword: pw });
    if (!ok) { console.error('[AppContext] changeAdminPassword failed — state NOT updated'); return; }
    setAdminPassword(pw);
  }, []);

  const setRegMode = useCallback(async (mode) => {
    console.log('[AppContext] setRegMode:', mode);
    const ok = await dbSaveAdminSettings({ registrationMode: mode });
    if (!ok) { console.error('[AppContext] setRegMode failed — state NOT updated'); return; }
    setRegModeState(mode);
  }, []);

  const setProgramsLabel = useCallback(async (label) => {
    console.log('[AppContext] setProgramsLabel:', label);
    const ok = await dbSaveAdminSettings({ programsLabel: label });
    if (!ok) { console.error('[AppContext] setProgramsLabel failed — state NOT updated'); return; }
    setProgramsLabelState(label);
  }, []);

  // ── Groups ────────────────────────────────────────────────────
  const addGroup = useCallback(async (name, groupCode) => {
    console.log('[AppContext] addGroup:', { name, groupCode });
    const newGroup = { id: generateId(), name, groupCode, isActive: true };
    const confirmed = await dbAddGroup(newGroup);
    if (!confirmed) { console.error('[AppContext] addGroup: Supabase write failed — state NOT updated'); return null; }
    setGroups(g => [...g, confirmed]);
    // Seed default activities for the new group
    const newActs = DEFAULT_ACTIVITIES.map(t => ({
      id: generateId(), groupId: confirmed.id, name: t.name, points: t.points, isActive: true,
    }));
    const confirmedActs = await dbAddActivities(newActs);
    if (confirmedActs?.length) setActivities(a => [...a, ...confirmedActs]);
    return confirmed;
  }, []);

  const updateGroup = useCallback(async (id, fields) => {
    console.log('[AppContext] updateGroup:', { id, fields });
    const ok = await dbUpdateGroup(id, fields);
    if (!ok) { console.error('[AppContext] updateGroup failed — state NOT updated'); return; }
    setGroups(g => g.map(gr => gr.id === id ? { ...gr, ...fields } : gr));
  }, []);

  // ── Students ──────────────────────────────────────────────────
  const registerStudent = useCallback(async (fields, groupId, status) => {
    console.log('[AppContext] registerStudent:', { username: fields.username, groupId, status });
    const newStudent = {
      id: generateId(),
      fullName: fields.fullName,
      username: fields.username,
      password: fields.password,
      groupId,
      secondaryGroupIds: [],
      status,
      university: '',
      phone: '',
      avatar: null,
      tasbih: { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false },
      personalTasbihProgress: {},
    };
    const confirmed = await dbRegisterStudent(newStudent);
    if (!confirmed) { console.error('[AppContext] registerStudent: Supabase write failed — state NOT updated'); return null; }
    const withArrays = { ...confirmed, submissions: [], bonusPoints: [], books: [], programCompletions: [] };
    setStudents(s => [...s, withArrays]);
    setSessionUsername(withArrays.username); // auto-login: AuthContext picks this up on next students update
    return withArrays;
  }, []);

  const updateStudent = useCallback(async (id, fields) => {
    console.log('[AppContext] updateStudent:', { id, fields });
    const ok = await dbUpdateStudent(id, fields);
    if (!ok) { console.error('[AppContext] updateStudent failed — state NOT updated'); return null; }
    // Capture the merged student synchronously inside the functional update — never call reload()
    let updated = null;
    setStudents(s => s.map(st => {
      if (st.id !== id) return st;
      updated = { ...st, ...fields };
      return updated;
    }));
    return updated;
  }, []);

  const deleteStudent = useCallback(async (id) => {
    console.log('[AppContext] deleteStudent:', id);
    const ok = await dbDeleteStudent(id);
    if (!ok) { console.error('[AppContext] deleteStudent failed — state NOT updated'); return; }
    setStudents(s => s.filter(st => st.id !== id));
  }, []);

  const approveStudent = useCallback(async (id) => {
    console.log('[AppContext] approveStudent:', id);
    const ok = await dbUpdateStudent(id, { status: 'active' });
    if (!ok) { console.error('[AppContext] approveStudent failed — state NOT updated'); return; }
    setStudents(s => s.map(st => st.id === id ? { ...st, status: 'active' } : st));
  }, []);

  const submitDay = useCallback(async (studentId, dateStr, completedActivities, quote) => {
    console.log('[AppContext] submitDay:', { studentId, dateStr });
    const ok = await dbSubmitDay(studentId, dateStr, completedActivities, quote || '');
    if (!ok) { console.error('[AppContext] submitDay failed — state NOT updated'); return null; }
    const sub = { date: dateStr, completedActivities, quote: quote || '', quoteLikes: [] };
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const already = (st.submissions || []).some(x => x.date === dateStr);
      if (already) return st;
      return { ...st, submissions: [...(st.submissions || []), sub] };
    }));
    return students.find(st => st.id === studentId) || null;
  }, [students]);

  const editSubmission = useCallback(async (studentId, dateStr, completedActivities, scoreOverride) => {
    console.log('[AppContext] editSubmission:', { studentId, dateStr });
    const ok = await dbEditSubmission(studentId, dateStr, completedActivities, scoreOverride);
    if (!ok) { console.error('[AppContext] editSubmission failed — state NOT updated'); return; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const subs = (st.submissions || []).map(sub => {
        if (sub.date !== dateStr) return sub;
        const updated = { ...sub, completedActivities };
        if (typeof scoreOverride === 'number') updated.scoreOverride = scoreOverride;
        else delete updated.scoreOverride;
        return updated;
      });
      const exists = subs.some(sub => sub.date === dateStr);
      return {
        ...st,
        submissions: exists ? subs : [...subs, { date: dateStr, completedActivities, quote: '', quoteLikes: [] }],
      };
    }));
  }, []);

  const deleteSubmission = useCallback(async (studentId, dateStr) => {
    console.log('[AppContext] deleteSubmission:', { studentId, dateStr });
    const ok = await dbDeleteSubmission(studentId, dateStr);
    if (!ok) { console.error('[AppContext] deleteSubmission failed — state NOT updated'); return; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, submissions: (st.submissions || []).filter(sub => sub.date !== dateStr) };
    }));
  }, []);

  const likeQuote = useCallback(async (ownerId, dateStr, likerId) => {
    console.log('[AppContext] likeQuote:', { ownerId, dateStr, likerId });
    const ok = await dbToggleQuoteLike(ownerId, dateStr, likerId);
    if (!ok) { console.error('[AppContext] likeQuote failed — state NOT updated'); return; }
    setStudents(s => s.map(st => {
      if (st.id !== ownerId) return st;
      const subs = (st.submissions || []).map(sub => {
        if (sub.date !== dateStr) return sub;
        const likes = sub.quoteLikes || [];
        const already = likes.includes(likerId);
        return { ...sub, quoteLikes: already ? likes.filter(l => l !== likerId) : [...likes, likerId] };
      });
      return { ...st, submissions: subs };
    }));
  }, []);

  const addBonusPoints = useCallback(async (studentId, points, reason) => {
    console.log('[AppContext] addBonusPoints:', { studentId, points, reason });
    const date = todayString();
    const confirmed = await dbAddBonusPoints(studentId, date, points, reason);
    if (!confirmed) { console.error('[AppContext] addBonusPoints failed — state NOT updated'); return null; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, bonusPoints: [...(st.bonusPoints || []), confirmed] };
    }));
    return students.find(st => st.id === studentId) || null;
  }, [students]);

  const saveTasbih = useCallback(async (student, tasbih) => {
    console.log('[AppContext] saveTasbih:', { studentId: student.id });
    const ok = await dbUpdateTasbih(student.id, tasbih);
    if (!ok) { console.error('[AppContext] saveTasbih failed — state NOT updated'); return student; }
    setStudents(s => s.map(st => st.id === student.id ? { ...st, tasbih } : st));
    return { ...student, tasbih };
  }, []);

  // ── Student personal tasbihs ──────────────────────────────────
  const addPersonalTasbih = useCallback(async (studentId, fields) => {
    console.log('[AppContext] addPersonalTasbih:', { studentId, title: fields.title });
    const newT = {
      id:            generateId(),
      title:         fields.title       || 'Tasbih',
      target:        Number(fields.target) || 100,
      current:       0,
      resetType:     fields.resetType   || 'none',
      lastResetDate: '',
    };
    let updated = null;
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      updated = { ...st, personalTasbihs: [...(st.personalTasbihs || []), newT] };
      return updated;
    }));
    // Fire-and-forget — capture array after state update via closure
    setTimeout(() => {
      setStudents(s => {
        const st = s.find(x => x.id === studentId);
        if (st) dbSavePersonalTasbihs(studentId, st.personalTasbihs || []);
        return s;
      });
    }, 0);
    return newT;
  }, []);

  const updatePersonalTasbih = useCallback(async (studentId, tasbihId, fields) => {
    console.log('[AppContext] updatePersonalTasbih:', { studentId, tasbihId });
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const newList = (st.personalTasbihs || []).map(t =>
        t.id === tasbihId ? { ...t, ...fields } : t
      );
      dbSavePersonalTasbihs(studentId, newList);
      return { ...st, personalTasbihs: newList };
    }));
  }, []);

  const deletePersonalTasbih = useCallback(async (studentId, tasbihId) => {
    console.log('[AppContext] deletePersonalTasbih:', { studentId, tasbihId });
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const newList = (st.personalTasbihs || []).filter(t => t.id !== tasbihId);
      dbSavePersonalTasbihs(studentId, newList);
      return { ...st, personalTasbihs: newList };
    }));
  }, []);

  // ── Activities ────────────────────────────────────────────────
  const addActivity = useCallback(async (groupId, name, points) => {
    console.log('[AppContext] addActivity:', { groupId, name, points });
    const act = { id: generateId(), groupId, name, points, isActive: true };
    const confirmed = await dbAddActivity(act);
    if (!confirmed) { console.error('[AppContext] addActivity failed — state NOT updated'); return; }
    setActivities(a => [...a, confirmed]);
  }, []);

  const updateActivity = useCallback(async (id, fields) => {
    console.log('[AppContext] updateActivity:', { id, fields });
    const ok = await dbUpdateActivity(id, fields);
    if (!ok) { console.error('[AppContext] updateActivity failed — state NOT updated'); return; }
    setActivities(a => a.map(act => act.id === id ? { ...act, ...fields } : act));
  }, []);

  // ── Periods ───────────────────────────────────────────────────
  const addPeriod = useCallback(async (groupId, name, startDate, endDate) => {
    console.log('[AppContext] addPeriod:', { groupId, name });
    const period = { id: generateId(), groupId, name, startDate, endDate, isActive: false, countForAllTime: false, prizeText: '' };
    const confirmed = await dbAddPeriod(period);
    if (!confirmed) { console.error('[AppContext] addPeriod failed — state NOT updated'); return; }
    setPeriods(p => [...p, confirmed]);
  }, []);

  const updatePeriod = useCallback(async (id, fields) => {
    console.log('[AppContext] updatePeriod:', { id, fields });
    const ok = await dbUpdatePeriod(id, fields);
    if (!ok) { console.error('[AppContext] updatePeriod failed — state NOT updated'); return; }
    setPeriods(p => p.map(pe => pe.id === id ? { ...pe, ...fields } : pe));
  }, []);

  const activatePeriod = useCallback(async (id, groupId) => {
    console.log('[AppContext] activatePeriod:', { id, groupId });
    const ok = await dbActivatePeriod(id, groupId);
    if (!ok) { console.error('[AppContext] activatePeriod failed — state NOT updated'); return; }
    setPeriods(p => p.map(pe => pe.groupId === groupId ? { ...pe, isActive: pe.id === id } : pe));
  }, []);

  const deletePeriod = useCallback(async (id) => {
    console.log('[AppContext] deletePeriod:', id);
    const ok = await dbDeletePeriod(id);
    if (!ok) { console.error('[AppContext] deletePeriod failed — state NOT updated'); return; }
    setPeriods(p => p.filter(pe => pe.id !== id));
  }, []);

  // ── Global Tasbih ─────────────────────────────────────────────
  const addGlobalTasbih = useCallback(async (fields) => {
    console.log('[AppContext] addGlobalTasbih:', fields.title);
    const newT = {
      id: `gt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      title: fields.title || 'Tasbih',
      description: fields.description || '',
      target: Number(fields.target) || 100,
      current: 0, completedTimes: 0,
      isActive: true,
      groupScope: fields.groupScope || 'all',
    };
    const confirmed = await dbAddGlobalTasbih(newT);
    if (!confirmed) { console.error('[AppContext] addGlobalTasbih failed — state NOT updated'); return null; }
    setGlobalTasbihs(t => [...t, confirmed]);
    return confirmed;
  }, []);

  const updateGlobalTasbih = useCallback(async (id, fields) => {
    console.log('[AppContext] updateGlobalTasbih:', { id, fields });
    const ok = await dbUpdateGlobalTasbih(id, fields);
    if (!ok) { console.error('[AppContext] updateGlobalTasbih failed — state NOT updated'); return; }
    setGlobalTasbihs(t => t.map(x => x.id === id ? { ...x, ...fields } : x));
  }, []);

  const tapGlobalTasbih = useCallback(async (id, amount) => {
    // Read current values from state directly to avoid stale closure
    const current = globalTasbihs.find(t => t.id === id);
    if (!current || !current.isActive) return null;

    let newCurrent = current.current + amount;
    let newCompleted = current.completedTimes;
    let justCompleted = false;
    if (newCurrent >= current.target) { newCompleted += 1; newCurrent = 0; justCompleted = true; }

    const updated = { ...current, current: newCurrent, completedTimes: newCompleted };
    setGlobalTasbihs(prev => prev.map(t => t.id === id ? updated : t));

    // Write to Supabase after updating state (not inside the setter)
    await dbUpdateGlobalTasbih(id, { current: newCurrent, completedTimes: newCompleted });

    return { tasbih: updated, justCompleted, completedTimes: newCompleted };
  }, [globalTasbihs]);

  const resetGlobalTasbih = useCallback(async (id) => {
    console.log('[AppContext] resetGlobalTasbih:', id);
    const ok = await dbUpdateGlobalTasbih(id, { current: 0 });
    if (!ok) { console.error('[AppContext] resetGlobalTasbih failed — state NOT updated'); return; }
    setGlobalTasbihs(t => t.map(x => x.id === id ? { ...x, current: 0 } : x));
  }, []);

  // ── Personal Tasbih Templates ─────────────────────────────────
  const addPersonalTasbihTemplate = useCallback(async (fields) => {
    console.log('[AppContext] addPersonalTasbihTemplate:', fields.title);
    const newT = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      title:       fields.title || 'Tasbih Goal',
      description: fields.description || '',
      target:      Number(fields.target) || 100,
      groupScope:  fields.groupScope || 'all',
      isActive:    true,
    };
    const confirmed = await dbAddPersonalTemplate(newT);
    if (!confirmed) { console.error('[AppContext] addPersonalTasbihTemplate failed — state NOT updated'); return null; }
    setPersonalTemplates(t => [...t, confirmed]);
    return confirmed;
  }, []);

  const updatePersonalTasbihTemplate = useCallback(async (id, fields) => {
    console.log('[AppContext] updatePersonalTasbihTemplate:', { id, fields });
    const ok = await dbUpdatePersonalTemplate(id, fields);
    if (!ok) { console.error('[AppContext] updatePersonalTasbihTemplate failed — state NOT updated'); return; }
    setPersonalTemplates(t => t.map(x => x.id === id ? { ...x, ...fields } : x));
  }, []);

  const deletePersonalTasbihTemplate = useCallback(async (id) => {
    console.log('[AppContext] deletePersonalTasbihTemplate:', id);
    const ok = await dbDeletePersonalTemplate(id);
    if (!ok) { console.error('[AppContext] deletePersonalTasbihTemplate failed — state NOT updated'); return; }
    setPersonalTemplates(t => t.filter(x => x.id !== id));
  }, []);

  // Personal tasbih progress — stored on student record
  const getPersonalTplProgress = useCallback((studentId, templateId) => {
    const student = students.find(s => s.id === studentId);
    const prog = student?.personalTasbihProgress || {};
    return { count: prog[templateId] || 0 };
  }, [students]);

  const savePersonalTplProgress = useCallback(async (studentId, templateId, data) => {
    console.log('[AppContext] savePersonalTplProgress:', { studentId, templateId, count: data.count });
    // Compute merged progress from current state BEFORE the setter (setters can be delayed/re-run by React)
    const currentStudent = students.find(s => s.id === studentId);
    const mergedProgress = { ...(currentStudent?.personalTasbihProgress || {}), [templateId]: data.count };
    const ok = await dbSavePersonalTplProgress(studentId, mergedProgress);
    if (!ok) { console.error('[AppContext] savePersonalTplProgress failed — state NOT updated'); return; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, personalTasbihProgress: mergedProgress };
    }));
  }, [students]);

  // ── Reading Books ─────────────────────────────────────────────
  const getStudentBooks = useCallback((studentId) => {
    return students.find(s => s.id === studentId)?.books || [];
  }, [students]);

  const addBook = useCallback(async (studentId, bookData) => {
    console.log('[AppContext] addBook:', { studentId, title: bookData.title });
    const book = { id: generateId(), ...bookData };
    const confirmed = await dbAddBook(studentId, book);
    if (!confirmed) { console.error('[AppContext] addBook failed — state NOT updated'); return null; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, books: [...(st.books || []), confirmed] };
    }));
    return confirmed;
  }, []);

  const updateBook = useCallback(async (studentId, bookId, fields) => {
    console.log('[AppContext] updateBook:', { studentId, bookId, fields });
    const ok = await dbUpdateBook(bookId, fields);
    if (!ok) { console.error('[AppContext] updateBook failed — state NOT updated'); return; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, books: (st.books || []).map(b => b.id === bookId ? { ...b, ...fields } : b) };
    }));
  }, []);

  const removeBook = useCallback(async (studentId, bookId) => {
    console.log('[AppContext] removeBook:', { studentId, bookId });
    const ok = await dbDeleteBook(bookId);
    if (!ok) { console.error('[AppContext] removeBook failed — state NOT updated'); return; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, books: (st.books || []).filter(b => b.id !== bookId) };
    }));
  }, []);

  // ── Programs ──────────────────────────────────────────────────
  const addProgram = useCallback(async (fields) => {
    console.log('[AppContext] addProgram:', fields.name);
    const newP = {
      id: `prog_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name: fields.name || 'Program',
      description: fields.description || '',
      date: fields.date || '',
      groupScope: fields.groupScope || 'all',
      isActive: true,
      tasks: [],
    };
    const confirmed = await dbAddProgram(newP);
    if (!confirmed) { console.error('[AppContext] addProgram failed — state NOT updated'); return null; }
    setPrograms(p => [...p, confirmed]);
    return confirmed;
  }, []);

  const updateProgram = useCallback(async (id, fields) => {
    console.log('[AppContext] updateProgram:', { id, fields });
    const ok = await dbUpdateProgram(id, fields);
    if (!ok) { console.error('[AppContext] updateProgram failed — state NOT updated'); return; }
    setPrograms(p => p.map(pr => pr.id === id ? { ...pr, ...fields } : pr));
  }, []);

  const deleteProgram = useCallback(async (id) => {
    console.log('[AppContext] deleteProgram:', id);
    const ok = await dbDeleteProgram(id);
    if (!ok) { console.error('[AppContext] deleteProgram failed — state NOT updated'); return; }
    setPrograms(p => p.filter(pr => pr.id !== id));
  }, []);

  // ── Challenges ────────────────────────────────────────────────
  const addChallenge = useCallback(async (fields) => {
    console.log('[AppContext] addChallenge:', fields.name);
    const newC = {
      id:              `ch_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name:            fields.name            || 'Challenge',
      description:     fields.description     || '',
      code:            fields.code            || null,
      isPrivate:       fields.isPrivate       ?? false,
      isVisible:       fields.isVisible       ?? false,
      visibleToGroups: fields.visibleToGroups || [],
      startDate:       fields.startDate       || '',
      endDate:         fields.endDate         || '',
      isActive:        true,
      activities:      fields.activities      || [],
    };
    const confirmed = await dbAddChallenge(newC);
    if (!confirmed) { console.error('[AppContext] addChallenge failed — state NOT updated'); return null; }
    setChallenges(c => [...c, confirmed]);
    return confirmed;
  }, []);

  const updateChallenge = useCallback(async (id, fields) => {
    console.log('[AppContext] updateChallenge:', id);
    const ok = await dbUpdateChallenge(id, fields);
    if (!ok) { console.error('[AppContext] updateChallenge failed — state NOT updated'); return; }
    setChallenges(c => c.map(ch => ch.id === id ? { ...ch, ...fields } : ch));
  }, []);

  const deleteChallenge = useCallback(async (id) => {
    console.log('[AppContext] deleteChallenge:', id);
    const ok = await dbDeleteChallenge(id);
    if (!ok) { console.error('[AppContext] deleteChallenge failed — state NOT updated'); return; }
    setChallenges(c => c.filter(ch => ch.id !== id));
    setChallengeMemberships(m => m.filter(m => m.challengeId !== id));
  }, []);

  const joinChallenge = useCallback(async (challengeId, studentId) => {
    console.log('[AppContext] joinChallenge:', challengeId, studentId);
    const confirmed = await dbJoinChallenge(challengeId, studentId);
    if (!confirmed) { console.error('[AppContext] joinChallenge failed — state NOT updated'); return null; }
    setChallengeMemberships(m => {
      const exists = m.some(x => x.challengeId === challengeId && x.studentId === studentId);
      if (exists) return m;
      return [...m, { ...confirmed, joinedAt: new Date().toISOString() }];
    });
    return confirmed;
  }, []);

  // ── Program Completions ───────────────────────────────────────
  const getStudentProgramCompletions = useCallback((studentId) => {
    return students.find(s => s.id === studentId)?.programCompletions || [];
  }, [students]);

  const saveProgramCompletion = useCallback(async (studentId, programId, taskId, isDone, count) => {
    console.log('[AppContext] saveProgramCompletion:', { studentId, programId, taskId, isDone, count });
    const ok = await dbSaveProgramCompletion(studentId, programId, taskId, isDone, count);
    if (!ok) { console.error('[AppContext] saveProgramCompletion failed — state NOT updated'); return; }
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const comps = (st.programCompletions || []);
      const existing = comps.find(c => c.taskId === taskId);
      const updated = existing
        ? comps.map(c => c.taskId === taskId ? { ...c, isDone, count } : c)
        : [...comps, { id: generateId(), programId, taskId, isDone, count }];
      return { ...st, programCompletions: updated };
    }));
  }, []);

  // ── Collective Task Counts ────────────────────────────────────
  const tapCollectiveTask = useCallback(async (taskId, target, amount) => {
    const current = collectiveTaskCounts[taskId] || { count: 0, completedTimes: 0 };
    let count = current.count + amount;
    let completedTimes = current.completedTimes;
    let justCompleted = false;
    if (count >= target) { completedTimes += 1; count = 0; justCompleted = true; }

    setCollectiveCounts(prev => ({ ...prev, [taskId]: { count, completedTimes } }));

    // Write to Supabase after updating state (not inside the setter)
    await dbUpdateCollectiveTask(taskId, count, completedTimes);

    return { count, completedTimes, justCompleted };
  }, [collectiveTaskCounts]);

  const resetCollectiveTask = useCallback(async (taskId) => {
    setCollectiveCounts(prev => ({ ...prev, [taskId]: { count: 0, completedTimes: 0 } }));
    await dbUpdateCollectiveTask(taskId, 0, 0);
  }, []);

  const getCollectiveTaskCount = useCallback((taskId) => {
    return collectiveTaskCounts[taskId] || { count: 0, completedTimes: 0 };
  }, [collectiveTaskCounts]);

  // ── Full reset ────────────────────────────────────────────────
  const resetAll = useCallback(async () => {
    await reload();
  }, [reload]);

  return (
    <AppContext.Provider value={{
      // Meta
      loading, dbError, reload,
      // State
      community, groups, students, activities, periods,
      registrationMode, adminPassword, adminUsername,
      globalTasbihs, programs, programsLabel, personalTasbihTemplates,
      collectiveTaskCounts,
      // Computed helpers (synchronous, read from state)
      findGroupById:      (id)   => groups.find(g => g.id === id) || null,
      findGroupByCode:    (code) => {
        const norm = String(code).trim().toLowerCase();
        return groups.find(g => String(g.groupCode||'').trim().toLowerCase() === norm) || null;
      },
      activitiesForGroup: (gid)  => activities.filter(a => a.groupId === gid),
      periodsForGroup:    (gid)  => periods.filter(p => p.groupId === gid),
      activePeriod:       (gid)  => periods.find(p => p.groupId === gid && !!p.isActive) || null,
      studentsForGroup:   (gid)  => students.filter(s => s.groupId === gid || (s.secondaryGroupIds || []).includes(gid)),
      activitiesForStudent: (student) => {
        const ids = [student.groupId, ...(student.secondaryGroupIds || [])];
        return activities.filter(a => ids.includes(a.groupId));
      },
      // Community
      updateCommunity,
      // Admin settings
      changeAdminUsername, changeAdminPassword, setRegMode, setProgramsLabel,
      // Groups
      addGroup, updateGroup,
      // Students
      registerStudent, updateStudent, deleteStudent, approveStudent,
      submitDay, editSubmission, deleteSubmission, likeQuote, saveTasbih, addBonusPoints,
      // Activities
      addActivity, updateActivity,
      // Periods
      addPeriod, updatePeriod, activatePeriod, deletePeriod,
      // Global Tasbih
      addGlobalTasbih, updateGlobalTasbih, tapGlobalTasbih, resetGlobalTasbih,
      // Personal Tasbih Templates
      addPersonalTasbihTemplate, updatePersonalTasbihTemplate, deletePersonalTasbihTemplate,
      getPersonalTplProgress, savePersonalTplProgress,
      // Student personal tasbihs
      addPersonalTasbih, updatePersonalTasbih, deletePersonalTasbih,
      // Reading Books
      getStudentBooks, addBook, updateBook, removeBook,
      // Programs
      addProgram, updateProgram, deleteProgram,
      // Challenges
      challenges, challengeMemberships,
      addChallenge, updateChallenge, deleteChallenge, joinChallenge,
      // Program Completions
      getStudentProgramCompletions, saveProgramCompletion,
      // Collective Tasks
      tapCollectiveTask, resetCollectiveTask, getCollectiveTaskCount,
      // Reload
      reloadAll: reload, reloadStudents: reload,
      resetAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
