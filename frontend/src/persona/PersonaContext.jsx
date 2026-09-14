import { createContext, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'agent-dashboard.persona';

const PersonaContext = createContext(null);

function readStoredPersona() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function PersonaProvider({ children }) {
  const [persona, setPersonaState] = useState(readStoredPersona);

  const value = useMemo(
    () => ({
      persona,
      isAuthenticated: persona != null,
      setPersona: (next) => {
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // localStorage unavailable — persona still works for this session
        }
        setPersonaState(next);
      },
      clearPersona: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        setPersonaState(null);
      },
    }),
    [persona],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within a PersonaProvider');
  return ctx;
}
