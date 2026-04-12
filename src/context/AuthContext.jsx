import { createContext, useContext, useState, useCallback, useEffect } from 'react';
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

  // Derive student object from the students array in AppContext
  const student = studentUsername
    ? (students.find(s => s.username === studentUsername) || null)
    : null;

  // ── Student auth ─────────────────────────────────────────────
  const loginStudent = useCallback((s) => {
    setSessionUsername(s.username);
    setStudentUsername(s.username);
  }, []);

  const logoutStudent = useCallback(() => {
    clearSessionUsername();
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
