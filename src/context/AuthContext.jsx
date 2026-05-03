import { createContext, useContext, useState, useCallback } from 'react';
import {
  getAdminSession, setAdminSession, clearAdminSession,
  getSessionUsername, setSessionUsername, clearSessionUsername,
} from '../services/data.js';
import { supabase } from '../services/supabase.js';
import { useApp } from './AppContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { students, loading } = useApp();
  const [currentUsername, setCurrentUsername] = useState(() => getSessionUsername());
  const [isAdmin, setIsAdminState] = useState(() => getAdminSession());

  // Derive the logged-in student from the loaded students array
  const student = currentUsername
    ? (students.find(s => s.username.toLowerCase() === currentUsername.toLowerCase()) || null)
    : null;

  // ── Student auth ─────────────────────────────────────────────
  const loginStudent = useCallback(async (username, password) => {
    const { data } = await supabase
      .from('students')
      .select('id, username, password')
      .eq('username', username.trim())
      .single();

    if (!data || data.password !== password) throw new Error('Invalid username or password');
    setSessionUsername(data.username);
    setCurrentUsername(data.username);
  }, []);

  // Called after registration when the new student isn't in the array yet
  const loginStudentDirectly = useCallback((username) => {
    setSessionUsername(username);
    setCurrentUsername(username);
  }, []);

  const logoutStudent = useCallback(() => {
    clearSessionUsername();
    setCurrentUsername(null);
  }, []);

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
      student, loginStudent, loginStudentDirectly, logoutStudent,
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
