// Plain-language glossary — kept separate from constants.js (which mirrors
// DB enums) so copy strings don't get mixed in with data-model vocabulary.

export const FIELD_LABELS = {
  eta: 'Target date',
  statusDescription: 'Notes',
  assignedTo: 'Owner',
};

export const ALERT_TYPE_EXPLAINERS = {
  expensive_call: 'One AI call cost more than the limit set for this project.',
  unpriced_usage: 'Cost tracking is incomplete until someone adds a price for this AI model.',
  high_api_error_rate: 'The AI service is failing more often than usual — some requests may not be completing.',
  high_validation_error_rate: 'The data being sent to the AI service is likely malformed — worth checking the integration.',
};
