import { PERSONAS } from '../constants';
import { usePersona } from '../persona/PersonaContext';
import AgentManagerHomePage from './AgentManagerHomePage';
import ExecutivePortfolioPage from './ExecutivePortfolioPage';

// The agent list narrowed to agents tagged for Marketplace Deployment. Each
// persona gets the same view as their Home — the Agent Manager's queue with
// inline updates, the Executive's read-only rollup — just scoped to the tag.
export default function MarketplacePage() {
  const { persona } = usePersona();

  if (persona === PERSONAS.AGENT_MANAGER) return <AgentManagerHomePage marketplaceOnly />;
  return <ExecutivePortfolioPage marketplaceOnly />;
}
