import { createContext, useContext, useState, useCallback } from 'react';
import {
  getCurrentStudent, setCurrentStudent, clearCurrentStudent,
  getAdminSession, setAdminSession, clearAdminSession,
  getStudents, saveStudents,
} from '../services/data.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudentState]   = useState(() => getCurrentStudent());
  const [isAdmin, setIsAdminState]   = useState(() => getAdminSession());

  // ── Student auth ─────────────────────────────────────
  const loginStudent = useCallback((s) => {
    setCurrentStudent(s);
    setStudentState(s);
  }, []);

  const logoutStudent = useCallback(() => {
    clearCurrentStudent();
    setStudentState(null);
  }, []);

  // Re-read student from localStorage (after mutations elsewhere update them)
  const refreshStudent = useCallback(() => {
    const s = getCurrentStudent();
    setStudentState(s);
    return s;
  }, []);

  // ── Admin auth ───────────────────────────────────────
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
