import { createContext, useContext, useMemo, useState } from 'react';

const PERSONA_KEY = 'agent-dashboard.persona';
const TOKEN_KEY = 'agent-dashboard.token';
const USER_KEY = 'agent-dashboard.user';

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

function readStoredUser() {
  try {
    return JSON.parse(readStored(USER_KEY)) || null;
  } catch {
    return null;
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
  writeStored(USER_KEY, null);
}

export function PersonaProvider({ children }) {
  const [persona, setPersonaState] = useState(() => readStored(PERSONA_KEY));
  const [user, setUserState] = useState(readStoredUser);

  const value = useMemo(
    () => ({
      persona,
      // { id, teamMemberId, name, email } of whoever is signed in.
      user,
      isAuthenticated: persona != null,
      // Called with the response of a sign-in (POST /api/auth/login or
      // /api/auth/set-password) — persona, token and user arrive together.
      setSession: ({ persona: nextPersona, token, user: nextUser }) => {
        writeStored(PERSONA_KEY, nextPersona);
        writeStored(TOKEN_KEY, token);
        writeStored(USER_KEY, JSON.stringify(nextUser));
        setPersonaState(nextPersona);
        setUserState(nextUser);
      },
      clearPersona: () => {
        clearStoredSession();
        setPersonaState(null);
        setUserState(null);
      },
    }),
    [persona, user],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within a PersonaProvider');
  return ctx;
}
