import { PERSONAS } from '../constants';
import { usePersona } from '../persona/PersonaContext';
import AgentManagerHomePage from './AgentManagerHomePage';
import ExecutivePortfolioPage from './ExecutivePortfolioPage';
import FinOpsHomePage from './FinOpsHomePage';
import MyAgentsPage from './MyAgentsPage';

// "/" is one route, but not one component — each persona's Home is a
// different composition built around their actual job, not a shared grid
// with panels toggled on or off.
export default function HomePage() {
  const { persona } = usePersona();

  if (persona === PERSONAS.AGENT_MANAGER) return <AgentManagerHomePage />;
  if (persona === PERSONAS.FINOPS) return <FinOpsHomePage />;
  if (persona === PERSONAS.CONTRIBUTOR) return <MyAgentsPage />;
  return <ExecutivePortfolioPage />;
}
