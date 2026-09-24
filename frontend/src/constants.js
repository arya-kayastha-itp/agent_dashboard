export const PERSONAS = {
  EXECUTIVE: 'EXECUTIVE',
  AGENT_MANAGER: 'AGENT_MANAGER',
  FINOPS: 'FINOPS',
};

export const STATUS_VALUES = ['Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold'];

export const STATUS_COLORS = {
  'Not Started': 'default',
  'In Progress': 'info',
  Blocked: 'error',
  Completed: 'success',
  'On Hold': 'warning',
};

export const ALERT_TYPES = ['expensive_call', 'high_api_error_rate', 'high_validation_error_rate'];

export const ALERT_TYPE_LABELS = {
  expensive_call: 'Expensive call',
  unpriced_usage: 'Unpriced usage',
  high_api_error_rate: 'High API error rate',
  high_validation_error_rate: 'High validation error rate',
};

export const ALERT_SEVERITY_COLORS = {
  warning: 'warning',
  critical: 'error',
};

export const ALERT_STATUS_COLORS = {
  open: 'error',
  acknowledged: 'warning',
  resolved: 'success',
};
