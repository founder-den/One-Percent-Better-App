import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateId, todayString } from '../services/data.js';
import {
  loadAll,
  dbSaveCommunity,
  dbSaveAdminSettings,
  dbAddGroup, dbUpdateGroup,
  dbAddActivity, dbAddActivities, dbUpdateActivity,
  dbAddPeriod, dbUpdatePeriod, dbDeletePeriod, dbActivatePeriod,
  dbRegisterStudent, dbUpdateStudent, dbDeleteStudent,
  dbSubmitDay, dbEditSubmission,
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

  // ── Load everything on mount ──────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAll();
      setCommunity(data.community);
      setAdminUsername(data.adminSettings.adminUsername);
      setAdminPassword(data.adminSettings.adminPassword);
      setRegModeState(data.adminSettings.registrationMode);
      setProgramsLabelState(data.adminSettings.programsLabel);
      setGroups(data.groups);
      setStudents(data.students);
      setActivities(data.activities);
      setPeriods(data.periods);
      setGlobalTasbihs(data.globalTasbihs);
      setPersonalTemplates(data.personalTasbihTemplates);
      setPrograms(data.programs);
      setCollectiveCounts(data.collectiveTaskCounts);
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
    const updated = { ...community, ...fields };
    setCommunity(updated);
    await dbSaveCommunity(updated);
  }, [community]);

  // ── Admin settings ────────────────────────────────────────────
  const changeAdminUsername = useCallback(async (u) => {
    setAdminUsername(u);
    await dbSaveAdminSettings({ adminUsername: u });
  }, []);

  const changeAdminPassword = useCallback(async (pw) => {
    setAdminPassword(pw);
    await dbSaveAdminSettings({ adminPassword: pw });
  }, []);

  const setRegMode = useCallback(async (mode) => {
    setRegModeState(mode);
    await dbSaveAdminSettings({ registrationMode: mode });
  }, []);

  const setProgramsLabel = useCallback(async (label) => {
    setProgramsLabelState(label);
    await dbSaveAdminSettings({ programsLabel: label });
  }, []);

  // ── Groups ────────────────────────────────────────────────────
  const addGroup = useCallback(async (name, groupCode) => {
    const newGroup = { id: generateId(), name, groupCode, isActive: true };
    setGroups(g => [...g, newGroup]);
    await dbAddGroup(newGroup);
    // Seed default activities for the new group
    const newActs = DEFAULT_ACTIVITIES.map(t => ({
      id: generateId(), groupId: newGroup.id, name: t.name, points: t.points, isActive: true,
    }));
    setActivities(a => [...a, ...newActs]);
    await dbAddActivities(newActs);
    return newGroup;
  }, []);

  const updateGroup = useCallback(async (id, fields) => {
    setGroups(g => g.map(gr => gr.id === id ? { ...gr, ...fields } : gr));
    await dbUpdateGroup(id, fields);
  }, []);

  // ── Students ──────────────────────────────────────────────────
  const registerStudent = useCallback(async (fields, groupId, status) => {
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
      submissions: [],
      bonusPoints: [],
      books: [],
      programCompletions: [],
    };
    setStudents(s => [...s, newStudent]);
    await dbRegisterStudent(newStudent);
    return newStudent;
  }, []);

  const updateStudent = useCallback(async (id, fields) => {
    setStudents(s => s.map(st => st.id === id ? { ...st, ...fields } : st));
    await dbUpdateStudent(id, fields);
    return students.find(st => st.id === id) || null;
  }, [students]);

  const deleteStudent = useCallback(async (id) => {
    setStudents(s => s.filter(st => st.id !== id));
    await dbDeleteStudent(id);
  }, []);

  const approveStudent = useCallback(async (id) => {
    setStudents(s => s.map(st => st.id === id ? { ...st, status: 'active' } : st));
    await dbUpdateStudent(id, { status: 'active' });
  }, []);

  const submitDay = useCallback(async (studentId, dateStr, completedActivities, quote) => {
    const sub = { _id: null, date: dateStr, completedActivities, quote: quote || '', quoteId: null, quoteLikes: [] };
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const already = (st.submissions || []).some(x => x.date === dateStr);
      if (already) return st;
      return { ...st, submissions: [...(st.submissions || []), sub] };
    }));
    await dbSubmitDay(studentId, dateStr, completedActivities, quote || '');
    return students.find(st => st.id === studentId) || null;
  }, [students]);

  const editSubmission = useCallback(async (studentId, dateStr, completedActivities) => {
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const subs = (st.submissions || []).map(sub =>
        sub.date === dateStr ? { ...sub, completedActivities } : sub
      );
      const exists = subs.some(sub => sub.date === dateStr);
      return {
        ...st,
        submissions: exists ? subs : [...subs, { date: dateStr, completedActivities, quote: '', quoteLikes: [] }],
      };
    }));
    await dbEditSubmission(studentId, dateStr, completedActivities);
  }, []);

  const likeQuote = useCallback(async (ownerId, dateStr, likerId) => {
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
    await dbToggleQuoteLike(ownerId, dateStr, likerId);
  }, []);

  const addBonusPoints = useCallback(async (studentId, points, reason) => {
    const bp = { id: generateId(), date: todayString(), points: Number(points), reason };
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, bonusPoints: [...(st.bonusPoints || []), bp] };
    }));
    await dbAddBonusPoints(studentId, bp.date, points, reason);
    return students.find(st => st.id === studentId) || null;
  }, [students]);

  const saveTasbih = useCallback(async (student, tasbih) => {
    setStudents(s => s.map(st => st.id === student.id ? { ...st, tasbih } : st));
    await dbUpdateTasbih(student.id, tasbih);
    return { ...student, tasbih };
  }, []);

  // ── Activities ────────────────────────────────────────────────
  const addActivity = useCallback(async (groupId, name, points) => {
    const act = { id: generateId(), groupId, name, points, isActive: true };
    setActivities(a => [...a, act]);
    await dbAddActivity(act);
  }, []);

  const updateActivity = useCallback(async (id, fields) => {
    setActivities(a => a.map(act => act.id === id ? { ...act, ...fields } : act));
    await dbUpdateActivity(id, fields);
  }, []);

  // ── Periods ───────────────────────────────────────────────────
  const addPeriod = useCallback(async (groupId, name, startDate, endDate) => {
    const period = { id: generateId(), groupId, name, startDate, endDate, isActive: false, countForAllTime: false, prizeText: '' };
    setPeriods(p => [...p, period]);
    await dbAddPeriod(period);
  }, []);

  const updatePeriod = useCallback(async (id, fields) => {
    setPeriods(p => p.map(pe => pe.id === id ? { ...pe, ...fields } : pe));
    await dbUpdatePeriod(id, fields);
  }, []);

  const activatePeriod = useCallback(async (id, groupId) => {
    setPeriods(p => p.map(pe => pe.groupId === groupId ? { ...pe, isActive: pe.id === id } : pe));
    await dbActivatePeriod(id, groupId);
  }, []);

  const deletePeriod = useCallback(async (id) => {
    setPeriods(p => p.filter(pe => pe.id !== id));
    await dbDeletePeriod(id);
  }, []);

  // ── Global Tasbih ─────────────────────────────────────────────
  const addGlobalTasbih = useCallback(async (fields) => {
    const newT = {
      id: `gt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      title: fields.title || 'Tasbih',
      description: fields.description || '',
      target: Number(fields.target) || 100,
      current: 0, completedTimes: 0,
      isActive: true,
      groupScope: fields.groupScope || 'all',
    };
    setGlobalTasbihs(t => [...t, newT]);
    await dbAddGlobalTasbih(newT);
    return newT;
  }, []);

  const updateGlobalTasbih = useCallback(async (id, fields) => {
    setGlobalTasbihs(t => t.map(x => x.id === id ? { ...x, ...fields } : x));
    await dbUpdateGlobalTasbih(id, fields);
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
    setGlobalTasbihs(t => t.map(x => x.id === id ? { ...x, current: 0 } : x));
    await dbUpdateGlobalTasbih(id, { current: 0 });
  }, []);

  // ── Personal Tasbih Templates ─────────────────────────────────
  const addPersonalTasbihTemplate = useCallback(async (fields) => {
    const newT = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      title:       fields.title || 'Tasbih Goal',
      description: fields.description || '',
      target:      Number(fields.target) || 100,
      groupScope:  fields.groupScope || 'all',
      isActive:    true,
    };
    setPersonalTemplates(t => [...t, newT]);
    await dbAddPersonalTemplate(newT);
    return newT;
  }, []);

  const updatePersonalTasbihTemplate = useCallback(async (id, fields) => {
    setPersonalTemplates(t => t.map(x => x.id === id ? { ...x, ...fields } : x));
    await dbUpdatePersonalTemplate(id, fields);
  }, []);

  const deletePersonalTasbihTemplate = useCallback(async (id) => {
    setPersonalTemplates(t => t.filter(x => x.id !== id));
    await dbDeletePersonalTemplate(id);
  }, []);

  // Personal tasbih progress — stored on student record
  const getPersonalTplProgress = useCallback((studentId, templateId) => {
    const student = students.find(s => s.id === studentId);
    const prog = student?.personalTasbihProgress || {};
    return { count: prog[templateId] || 0 };
  }, [students]);

  const savePersonalTplProgress = useCallback(async (studentId, templateId, data) => {
    // Compute the merged object before the state update so we can pass it to db
    let mergedProgress = {};
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      mergedProgress = { ...(st.personalTasbihProgress || {}), [templateId]: data.count };
      return { ...st, personalTasbihProgress: mergedProgress };
    }));
    // Pass the full merged object — no pre-read in db.js needed
    await dbSavePersonalTplProgress(studentId, mergedProgress);
  }, []);

  // ── Reading Books ─────────────────────────────────────────────
  const getStudentBooks = useCallback((studentId) => {
    return students.find(s => s.id === studentId)?.books || [];
  }, [students]);

  const addBook = useCallback(async (studentId, bookData) => {
    const book = { id: generateId(), ...bookData };
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, books: [...(st.books || []), book] };
    }));
    await dbAddBook(studentId, book);
    return book;
  }, []);

  const updateBook = useCallback(async (studentId, bookId, fields) => {
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, books: (st.books || []).map(b => b.id === bookId ? { ...b, ...fields } : b) };
    }));
    await dbUpdateBook(bookId, fields);
  }, []);

  const removeBook = useCallback(async (studentId, bookId) => {
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      return { ...st, books: (st.books || []).filter(b => b.id !== bookId) };
    }));
    await dbDeleteBook(bookId);
  }, []);

  // ── Programs ──────────────────────────────────────────────────
  const addProgram = useCallback(async (fields) => {
    const newP = {
      id: `prog_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name: fields.name || 'Program',
      description: fields.description || '',
      date: fields.date || '',
      groupScope: fields.groupScope || 'all',
      isActive: true,
      tasks: [],
    };
    setPrograms(p => [...p, newP]);
    await dbAddProgram(newP);
    return newP;
  }, []);

  const updateProgram = useCallback(async (id, fields) => {
    setPrograms(p => p.map(pr => pr.id === id ? { ...pr, ...fields } : pr));
    await dbUpdateProgram(id, fields);
  }, []);

  const deleteProgram = useCallback(async (id) => {
    setPrograms(p => p.filter(pr => pr.id !== id));
    await dbDeleteProgram(id);
  }, []);

  // ── Program Completions ───────────────────────────────────────
  const getStudentProgramCompletions = useCallback((studentId) => {
    return students.find(s => s.id === studentId)?.programCompletions || [];
  }, [students]);

  const saveProgramCompletion = useCallback(async (studentId, programId, taskId, isDone, count) => {
    setStudents(s => s.map(st => {
      if (st.id !== studentId) return st;
      const comps = (st.programCompletions || []);
      const existing = comps.find(c => c.taskId === taskId);
      const updated = existing
        ? comps.map(c => c.taskId === taskId ? { ...c, isDone, count } : c)
        : [...comps, { id: generateId(), programId, taskId, isDone, count }];
      return { ...st, programCompletions: updated };
    }));
    await dbSaveProgramCompletion(studentId, programId, taskId, isDone, count);
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
      submitDay, editSubmission, likeQuote, saveTasbih, addBonusPoints,
      // Activities
      addActivity, updateActivity,
      // Periods
      addPeriod, updatePeriod, activatePeriod, deletePeriod,
      // Global Tasbih
      addGlobalTasbih, updateGlobalTasbih, tapGlobalTasbih, resetGlobalTasbih,
      // Personal Tasbih Templates
      addPersonalTasbihTemplate, updatePersonalTasbihTemplate, deletePersonalTasbihTemplate,
      getPersonalTplProgress, savePersonalTplProgress,
      // Reading Books
      getStudentBooks, addBook, updateBook, removeBook,
      // Programs
      addProgram, updateProgram, deleteProgram,
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
