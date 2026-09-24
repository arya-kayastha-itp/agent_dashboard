import { createContext, useContext, useMemo, useState } from 'react';

const PERSONA_KEY = 'agent-dashboard.persona';
const TOKEN_KEY = 'agent-dashboard.token';

const PersonaContext = createContext(null);

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // localStorage unavailable — session still works for this page load
  }
}

// Plain (non-hook) accessors so api/client.js can attach the token to
// requests, and clear the session on a 401, without needing to be inside a
// component.
export function getStoredToken() {
  return readStored(TOKEN_KEY);
}

export function clearStoredSession() {
  writeStored(PERSONA_KEY, null);
  writeStored(TOKEN_KEY, null);
}

export function PersonaProvider({ children }) {
  const [persona, setPersonaState] = useState(() => readStored(PERSONA_KEY));

  const value = useMemo(
    () => ({
      persona,
      isAuthenticated: persona != null,
      // Called after a successful POST /api/auth/login — persona and token
      // arrive together, since the token is what a login actually proves.
      setSession: (nextPersona, token) => {
        writeStored(PERSONA_KEY, nextPersona);
        writeStored(TOKEN_KEY, token);
        setPersonaState(nextPersona);
      },
      clearPersona: () => {
        writeStored(PERSONA_KEY, null);
        writeStored(TOKEN_KEY, null);
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
