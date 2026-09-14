import { Navigate } from 'react-router-dom';
import { usePersona } from './PersonaContext';

export default function RequirePersonaRoute({ allowed, children }) {
  const { persona } = usePersona();
  return allowed.includes(persona) ? children : <Navigate to="/" replace />;
}
