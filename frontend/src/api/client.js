import axios from 'axios';
import { clearStoredSession, getStoredToken } from '../persona/PersonaContext';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The backend requires a valid session for everything behind login (see
// backend/src/middleware/auth.js) — a 401 here means the token is missing,
// expired, or was revoked server-side, not a normal request failure. Bounce
// to /login rather than showing every screen its own "not authenticated"
// error state.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/auth/login')) {
      clearStoredSession();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export default client;
