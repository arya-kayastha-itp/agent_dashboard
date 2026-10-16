import { PERSONAS } from '../constants';

export const canEditAgents = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const canAddAgent = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const canDeleteAgent = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const canReviewUpdates = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const isAssignedTo = (agent, user) => Boolean(agent?.assignees?.some((assignee) => assignee.id === user?.teamMemberId));

// Being assigned to an agent is what makes someone a contributor on it, on
// top of their role. Contributors and FinOps send those updates for review;
// the Agent Manager updates directly (they're the reviewer) and Executives
// are view-only. The API enforces the same rule (backend config/personas.js).
const SUBMITTING_PERSONAS = [PERSONAS.CONTRIBUTOR, PERSONAS.FINOPS];

export const canSubmitUpdate = (persona, agent, user) => SUBMITTING_PERSONAS.includes(persona) && isAssignedTo(agent, user);
