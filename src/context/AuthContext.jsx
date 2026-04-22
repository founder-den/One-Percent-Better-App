import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase.js';
import {
  getAdminSession, setAdminSession, clearAdminSession,
} from '../services/data.js';
import { useApp } from './AppContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { students, loading } = useApp();
  const [session, setSession] = useState(null);
  const [isAdmin,         setIsAdminState]    = useState(() => getAdminSession());

  // Listen for Supabase Auth state changes automatically
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Safely find the logged in student based on their secure UUID
  const student = session ? (students.find(s => s.id === session.user.id) || null) : null;

  // ── Student auth ─────────────────────────────────────────────
  const loginStudent = useCallback(async (username, password) => {
    const email = `${username.toLowerCase().replace(/\s+/g, '')}@1percentbetter.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const logoutStudent = useCallback(async () => {
    await supabase.auth.signOut();
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
