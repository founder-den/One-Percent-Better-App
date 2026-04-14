import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  getSessionUsername, setSessionUsername, clearSessionUsername,
  getAdminSession, setAdminSession, clearAdminSession,
} from '../services/data.js';
import { useApp } from './AppContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { students, loading } = useApp();
  const [studentUsername, setStudentUsername] = useState(() => getSessionUsername());
  const [isAdmin,         setIsAdminState]    = useState(() => getAdminSession());

  // Bug 2 fix: keep the last successfully resolved student so a temporary
  // empty-students state during reload never causes an accidental logout.
  const lastStudentRef = useRef(null);

  const rawStudent = studentUsername
    ? (students.find(s => s.username === studentUsername) || null)
    : null;

  if (rawStudent) lastStudentRef.current = rawStudent;

  // During a reload students may be [] briefly — use the cached ref to survive the gap
  const student = rawStudent ?? (loading && studentUsername ? lastStudentRef.current : null);

  // Bug 1 fix: AppContext.registerStudent writes the new username to sessionStorage
  // then updates the students array. When students changes, re-check sessionStorage
  // so AuthContext auto-logs-in the freshly registered user without a page refresh.
  useEffect(() => {
    if (studentUsername) return; // already logged in
    const persisted = getSessionUsername();
    if (persisted) setStudentUsername(persisted);
  }, [students]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Student auth ─────────────────────────────────────────────
  const loginStudent = useCallback((s) => {
    setSessionUsername(s.username);
    setStudentUsername(s.username);
  }, []);

  const logoutStudent = useCallback(() => {
    clearSessionUsername();
    lastStudentRef.current = null;
    setStudentUsername(null);
  }, []);

  // Re-derive student from updated students array (no-op, handled reactively above)
  const refreshStudent = useCallback((updatedStudent) => {
    if (updatedStudent) return updatedStudent;
    return student;
  }, [student]);

  // ── Admin auth ───────────────────────────────────────────────
  const loginAdmin = useCallback(() => {
    setAdminSession(true);
    setIsAdminState(true);
  }, []);

  const logoutAdmin = useCallback(() => {
    clearAdminSession();
    setIsAdminState(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      student, loginStudent, logoutStudent, refreshStudent,
      isAdmin, loginAdmin, logoutAdmin,
      authLoading: loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
