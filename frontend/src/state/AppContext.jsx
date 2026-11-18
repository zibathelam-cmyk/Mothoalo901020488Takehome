import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';

const STORAGE_KEY = 'bukahub.desk-session';
const AppContext = createContext(null);

const readSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
};

export function AppProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [toasts, setToasts] = useState([]);
  const [threshold, setThreshold] = useState(2);
  const [revision, setRevision] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    api.meta().then((data) => setThreshold(data.lowStockThreshold)).catch(() => {});
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const notify = useCallback((message, tone = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, tone }]);
    timers.current.push(setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200));
  }, []);

  const signIn = useCallback((member) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(member));
    setSession(member);
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const value = useMemo(
    () => ({ session, signIn, signOut, notify, toasts, dismiss, threshold, revision, refresh }),
    [session, signIn, signOut, notify, toasts, dismiss, threshold, revision, refresh]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
