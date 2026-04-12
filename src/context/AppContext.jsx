import { createContext, useContext, useState, useCallback } from 'react';
import {
  getCommunity, saveCommunity,
  getGroups, saveGroups, findGroupById, findGroupByCode,
  getStudents, saveStudents,
  getActivities, saveActivities, getActivitiesForGroup,
  getPeriods, savePeriods, getPeriodsForGroup, getActivePeriod,
  getRegistrationMode, saveRegistrationMode,
  getAdminPassword, saveAdminPassword,
  generateId, seedActivitiesForGroup,
  todayString, toggleQuoteLike, updateTasbih,
  getGlobalTasbihs, saveGlobalTasbihs,
  getPrograms, savePrograms, getProgramsLabel, saveProgramsLabel,
  getCollectiveTaskCount, saveCollectiveTaskCount,
  getPersonalTasbihTemplates, savePersonalTasbihTemplates,
} from '../services/data.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Reactive slices of localStorage ─────────────────
  const [community,         setCommunityState]  = useState(getCommunity);
  const [groups,            setGroupsState]      = useState(getGroups);
  const [students,          setStudentsState]    = useState(getStudents);
  const [activities,        setActivitiesState]  = useState(getActivities);
  const [periods,           setPeriodsState]     = useState(getPeriods);
  const [registrationMode,  setRegModeState]     = useState(getRegistrationMode);
  const [adminPassword,     setAdminPassState]   = useState(getAdminPassword);
  const [globalTasbihs,     setGlobalTasbihsState] = useState(getGlobalTasbihs);
  const [programs,                setProgramsState]              = useState(getPrograms);
  const [programsLabel,           setProgramsLabelState]         = useState(getProgramsLabel);
  const [personalTasbihTemplates, setPersonalTasbihTemplatesState] = useState(getPersonalTasbihTemplates);

  // ── Generic reload helpers ────────────────────────────
  const reloadAll = useCallback(() => {
    setCommunityState(getCommunity());
    setGroupsState(getGroups());
    setStudentsState(getStudents());
    setActivitiesState(getActivities());
    setPeriodsState(getPeriods());
    setRegModeState(getRegistrationMode());
    setAdminPassState(getAdminPassword());
    setGlobalTasbihsState(getGlobalTasbihs());
    setProgramsState(getPrograms());
    setProgramsLabelState(getProgramsLabel());
    setPersonalTasbihTemplatesState(getPersonalTasbihTemplates());
  }, []);

  const reloadStudents   = useCallback(() => setStudentsState(getStudents()), []);
  const reloadActivities = useCallback(() => setActivitiesState(getActivities()), []);
  const reloadPeriods    = useCallback(() => setPeriodsState(getPeriods()), []);
  const reloadGroups     = useCallback(() => setGroupsState(getGroups()), []);

  // ── Community ─────────────────────────────────────────
  const updateCommunity = useCallback((fields) => {
    const c = { ...getCommunity(), ...fields };
    saveCommunity(c);
    setCommunityState(c);
  }, []);

  // ── Groups ────────────────────────────────────────────
  const addGroup = useCallback((name, groupCode) => {
    const g = getGroups();
    const newGroup = { id: generateId(), name, groupCode, isActive: true };
    g.push(newGroup);
    saveGroups(g);
    seedActivitiesForGroup(newGroup.id);
    reloadGroups();
    reloadActivities();
    return newGroup;
  }, [reloadGroups, reloadActivities]);

  const updateGroup = useCallback((id, fields) => {
    const g = getGroups().map(gr => gr.id === id ? { ...gr, ...fields } : gr);
    saveGroups(g);
    setGroupsState(g);
  }, []);

  // ── Students ──────────────────────────────────────────
  const registerStudent = useCallback((fields, groupId, status) => {
    const s = getStudents();
    const newStudent = {
      id: generateId(),
      fullName: fields.fullName,
      username: fields.username,
      password: fields.password,
      groupId,
      status,
      submissions: [],
      university: '',
      phone: '',
      avatar: null,
      tasbih: { allTimeTotal: 0, todayCount: 0, lastUpdatedDate: '', dailyResetEnabled: false },
      bonusPoints: [],
    };
    s.push(newStudent);
    saveStudents(s);
    setStudentsState([...s]);
    return newStudent;
  }, []);

  const updateStudent = useCallback((id, fields) => {
    const s = getStudents().map(st => st.id === id ? { ...st, ...fields } : st);
    saveStudents(s);
    setStudentsState(s);
    return s.find(st => st.id === id);
  }, []);

  const deleteStudent = useCallback((id) => {
    const s = getStudents().filter(st => st.id !== id);
    saveStudents(s);
    setStudentsState(s);
  }, []);

  const approveStudent = useCallback((id) => {
    const s = getStudents().map(st => st.id === id ? { ...st, status: 'active' } : st);
    saveStudents(s);
    setStudentsState(s);
  }, []);

  const submitDay = useCallback((studentId, dateStr, completedActivities, quote) => {
    const s = getStudents();
    const idx = s.findIndex(st => st.id === studentId);
    if (idx === -1) return null;
    const already = (s[idx].submissions || []).some(sub => sub.date === dateStr);
    if (already) return s[idx];
    if (!s[idx].submissions) s[idx].submissions = [];
    s[idx].submissions.push({ date: dateStr, completedActivities, quote, quoteLikes: [] });
    saveStudents(s);
    setStudentsState([...s]);
    return s[idx];
  }, []);

  const editSubmission = useCallback((studentId, dateStr, completedActivities) => {
    const s = getStudents();
    const idx = s.findIndex(st => st.id === studentId);
    if (idx === -1) return;
    const sub = (s[idx].submissions || []).find(x => x.date === dateStr);
    if (sub) {
      sub.completedActivities = completedActivities;
    } else {
      if (!s[idx].submissions) s[idx].submissions = [];
      s[idx].submissions.push({ date: dateStr, completedActivities, quote: '', quoteLikes: [] });
    }
    saveStudents(s);
    setStudentsState([...s]);
  }, []);

  const addBonusPoints = useCallback((studentId, points, reason) => {
    const s = getStudents();
    const idx = s.findIndex(st => st.id === studentId);
    if (idx === -1) return null;
    if (!s[idx].bonusPoints) s[idx].bonusPoints = [];
    s[idx].bonusPoints.push({ id: generateId(), date: todayString(), points: Number(points), reason });
    saveStudents(s);
    setStudentsState([...s]);
    return s[idx];
  }, []);

  const likeQuote = useCallback((ownerId, date, likerId) => {
    toggleQuoteLike(ownerId, date, likerId);
    setStudentsState([...getStudents()]);
  }, []);

  const saveTasbih = useCallback((student, tasbih) => {
    const updated = updateTasbih(student, tasbih);
    setStudentsState([...getStudents()]);
    return updated;
  }, []);

  // ── Activities ────────────────────────────────────────
  const addActivity = useCallback((groupId, name, points) => {
    const a = getActivities();
    a.push({ id: generateId(), groupId, name, points, isActive: true });
    saveActivities(a);
    setActivitiesState([...a]);
  }, []);

  const updateActivity = useCallback((id, fields) => {
    const a = getActivities().map(act => act.id === id ? { ...act, ...fields } : act);
    saveActivities(a);
    setActivitiesState(a);
  }, []);

  // ── Periods ───────────────────────────────────────────
  const addPeriod = useCallback((groupId, name, startDate, endDate) => {
    const p = getPeriods();
    p.push({ id: generateId(), groupId, name, startDate, endDate, isActive: false, countForAllTime: false, prizeText: '' });
    savePeriods(p);
    setPeriodsState([...p]);
  }, []);

  const updatePeriod = useCallback((id, fields) => {
    const p = getPeriods().map(pe => pe.id === id ? { ...pe, ...fields } : pe);
    savePeriods(p);
    setPeriodsState(p);
  }, []);

  const activatePeriod = useCallback((id, groupId) => {
    const p = getPeriods().map(pe => {
      if (pe.groupId === groupId) return { ...pe, isActive: pe.id === id };
      return pe;
    });
    savePeriods(p);
    setPeriodsState(p);
  }, []);

  const deletePeriod = useCallback((id) => {
    const p = getPeriods().filter(pe => pe.id !== id);
    savePeriods(p);
    setPeriodsState(p);
  }, []);

  // ── Registration & admin password ─────────────────────
  const setRegMode = useCallback((mode) => {
    saveRegistrationMode(mode);
    setRegModeState(mode);
  }, []);

  const changeAdminPassword = useCallback((pw) => {
    saveAdminPassword(pw);
    setAdminPassState(pw);
  }, []);

  // ── Global Tasbih ─────────────────────────────────────
  const addGlobalTasbih = useCallback((fields) => {
    const arr = getGlobalTasbihs();
    const newT = {
      id: `gt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      title: fields.title || 'Tasbih',
      description: fields.description || '',
      target: Number(fields.target) || 100,
      current: 0,
      completedTimes: 0,
      isActive: true,
      groupScope: fields.groupScope || 'all',
    };
    arr.push(newT);
    saveGlobalTasbihs(arr);
    setGlobalTasbihsState([...arr]);
    return newT;
  }, []);

  const updateGlobalTasbih = useCallback((id, fields) => {
    const arr = getGlobalTasbihs().map(t => t.id === id ? { ...t, ...fields } : t);
    saveGlobalTasbihs(arr);
    setGlobalTasbihsState([...arr]);
  }, []);

  // Always reads fresh from localStorage to avoid stale concurrent updates
  const tapGlobalTasbih = useCallback((id, amount) => {
    const arr = getGlobalTasbihs();
    const idx = arr.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const t = arr[idx];
    if (!t.isActive) return null;
    let newCurrent = t.current + amount;
    let newCompleted = t.completedTimes;
    let justCompleted = false;
    if (newCurrent >= t.target) {
      newCompleted += 1;
      newCurrent = 0;
      justCompleted = true;
    }
    arr[idx] = { ...t, current: newCurrent, completedTimes: newCompleted };
    saveGlobalTasbihs(arr);
    setGlobalTasbihsState([...arr]);
    return { tasbih: arr[idx], justCompleted, completedTimes: newCompleted };
  }, []);

  const resetGlobalTasbih = useCallback((id) => {
    const arr = getGlobalTasbihs().map(t => t.id === id ? { ...t, current: 0 } : t);
    saveGlobalTasbihs(arr);
    setGlobalTasbihsState([...arr]);
  }, []);

  // ── Programs ──────────────────────────────────────────
  const addProgram = useCallback((fields) => {
    const arr = getPrograms();
    const newP = {
      id: `prog_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name: fields.name || 'Program',
      description: fields.description || '',
      date: fields.date || '',
      groupScope: fields.groupScope || 'all',
      isActive: true,
      tasks: [],
    };
    arr.push(newP);
    savePrograms(arr);
    setProgramsState([...arr]);
    return newP;
  }, []);

  const updateProgram = useCallback((id, fields) => {
    const arr = getPrograms().map(p => p.id === id ? { ...p, ...fields } : p);
    savePrograms(arr);
    setProgramsState([...arr]);
  }, []);

  const deleteProgram = useCallback((id) => {
    const arr = getPrograms().filter(p => p.id !== id);
    savePrograms(arr);
    setProgramsState([...arr]);
  }, []);

  const setProgramsLabelFn = useCallback((label) => {
    saveProgramsLabel(label);
    setProgramsLabelState(label);
  }, []);

  // ── Collective Program Tasks ───────────────────────────────────
  // Always reads fresh from localStorage to avoid stale concurrent updates
  const tapCollectiveTask = useCallback((taskId, target, amount) => {
    const data = getCollectiveTaskCount(taskId);
    let { count, completedTimes } = data;
    let justCompleted = false;
    count += amount;
    if (count >= target) {
      completedTimes += 1;
      count = 0;
      justCompleted = true;
    }
    const newData = { count, completedTimes };
    saveCollectiveTaskCount(taskId, newData);
    return { ...newData, justCompleted };
  }, []);

  const resetCollectiveTask = useCallback((taskId) => {
    saveCollectiveTaskCount(taskId, { count: 0, completedTimes: 0 });
  }, []);

  // ── Personal Tasbih Templates ─────────────────────────
  const addPersonalTasbihTemplate = useCallback((fields) => {
    const arr = getPersonalTasbihTemplates();
    const newT = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      title:       fields.title || 'Tasbih Goal',
      description: fields.description || '',
      target:      Number(fields.target) || 100,
      groupScope:  fields.groupScope || 'all',
      isActive:    true,
    };
    arr.push(newT);
    savePersonalTasbihTemplates(arr);
    setPersonalTasbihTemplatesState([...arr]);
    return newT;
  }, []);

  const updatePersonalTasbihTemplate = useCallback((id, fields) => {
    const arr = getPersonalTasbihTemplates().map(t => t.id === id ? { ...t, ...fields } : t);
    savePersonalTasbihTemplates(arr);
    setPersonalTasbihTemplatesState([...arr]);
  }, []);

  const deletePersonalTasbihTemplate = useCallback((id) => {
    const arr = getPersonalTasbihTemplates().filter(t => t.id !== id);
    savePersonalTasbihTemplates(arr);
    setPersonalTasbihTemplatesState([...arr]);
  }, []);

  // ── Full reset ────────────────────────────────────────
  const resetAll = useCallback(() => {
    [
      'community','groups','students','activities','periods',
      'registrationMode','currentStudent','challengeStartDate',
    ].forEach(k => localStorage.removeItem(k));
    reloadAll();
  }, [reloadAll]);

  return (
    <AppContext.Provider value={{
      // State
      community, groups, students, activities, periods,
      registrationMode, adminPassword,
      globalTasbihs, programs, programsLabel, personalTasbihTemplates,
      // Computed helpers
      findGroupById: (id) => groups.find(g => g.id === id) || null,
      findGroupByCode: (code) => {
        const norm = String(code).trim().toLowerCase();
        return groups.find(g => String(g.groupCode||'').trim().toLowerCase()===norm) || null;
      },
      activitiesForGroup: (gid) => activities.filter(a => a.groupId === gid),
      periodsForGroup:    (gid) => periods.filter(p => p.groupId === gid),
      activePeriod:       (gid) => periods.find(p => p.groupId === gid && !!p.isActive) || null,
      studentsForGroup:   (gid) => students.filter(s => s.groupId === gid || (s.secondaryGroupIds || []).includes(gid)),
      activitiesForStudent: (student) => {
        const groupIds = [student.groupId, ...(student.secondaryGroupIds || [])];
        return activities.filter(a => groupIds.includes(a.groupId));
      },
      // Student mutations
      updateCommunity,
      addGroup, updateGroup,
      registerStudent, updateStudent, deleteStudent, approveStudent,
      submitDay, editSubmission, likeQuote, saveTasbih, addBonusPoints,
      addActivity, updateActivity,
      addPeriod, updatePeriod, activatePeriod, deletePeriod,
      setRegMode, changeAdminPassword, resetAll,
      reloadAll, reloadStudents,
      // Global Tasbih mutations
      addGlobalTasbih, updateGlobalTasbih, tapGlobalTasbih, resetGlobalTasbih,
      // Programs mutations
      addProgram, updateProgram, deleteProgram,
      setProgramsLabel: setProgramsLabelFn,
      // Collective task mutations
      tapCollectiveTask, resetCollectiveTask,
      // Personal tasbih template mutations
      addPersonalTasbihTemplate, updatePersonalTasbihTemplate, deletePersonalTasbihTemplate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
