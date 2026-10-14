import { PERSONAS } from '../constants';

export const canEditAgents = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const canAddAgent = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const canDeleteAgent = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const canReviewUpdates = (persona) => persona === PERSONAS.AGENT_MANAGER;

// Contributors send updates for review, and only for agents they're assigned
// to — the API enforces the same rule.
export const canSubmitUpdate = (persona, agent, user) =>
  persona === PERSONAS.CONTRIBUTOR && Boolean(agent?.assignees?.some((assignee) => assignee.id === user?.teamMemberId));
