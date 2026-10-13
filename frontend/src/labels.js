// Plain-language glossary — kept separate from constants.js (which mirrors
// DB enums) so copy strings don't get mixed in with data-model vocabulary.

export const FIELD_LABELS = {
  eta: 'Target date',
  statusDescription: 'Notes',
  assignedTo: 'Owner',
  marketplaceDeployment: 'Marketplace Deployment',
};

export const ALERT_TYPE_EXPLAINERS = {
  expensive_call: 'One AI call cost more than the limit set for this project.',
  unpriced_usage: 'Cost tracking is incomplete until someone adds a price for this AI model.',
  high_api_error_rate: 'The AI service is failing more often than usual — some requests may not be completing.',
  high_validation_error_rate: 'The data being sent to the AI service is likely malformed — worth checking the integration.',
};

export const PERSONA_LABELS = {
  EXECUTIVE: 'Executive',
  AGENT_MANAGER: 'Agent Manager',
  FINOPS: 'FinOps',
  CONTRIBUTOR: 'Contributor',
};

export const PERSONA_DESCRIPTIONS = {
  CONTRIBUTOR: 'Sees every agent; submits updates for the agents they work on',
  AGENT_MANAGER: 'Reviews updates and manages agents, people and access',
  EXECUTIVE: 'Read-only view of the portfolio',
  FINOPS: 'Pricing, alert rules and cost views',
};

export const ACCOUNT_STATUS_LABELS = {
  invited: 'Invited',
  active: 'Active',
  deactivated: 'Deactivated',
};
