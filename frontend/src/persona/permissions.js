import { PERSONAS } from '../constants';

export const canEditAgents = (persona) => persona === PERSONAS.AGENT_MANAGER;

export const canAddAgent = (persona) => persona === PERSONAS.AGENT_MANAGER;
