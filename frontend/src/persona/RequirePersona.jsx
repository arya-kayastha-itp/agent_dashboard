import { Navigate, useLocation } from 'react-router-dom';
import { usePersona } from './PersonaContext';

export default function RequirePersona({ children }) {
  const { isAuthenticated } = usePersona();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
