import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// A 3-level "is this okay?" system, separate from STATUS_VALUES/STATUS_COLORS
// in constants.js (which has 5 agent-specific states). This is the rollup
// vocabulary used by the Dashboard banner, the Legend, and FinOps alerts —
// domains that don't naturally have 5 states, only "fine / watch / not fine".
export const HEALTH_LEVELS = {
  HEALTHY: 'healthy',
  ATTENTION: 'attention',
  AT_RISK: 'atRisk',
  NEUTRAL: 'neutral',
};

export const HEALTH_LEVEL_META = {
  [HEALTH_LEVELS.HEALTHY]: { color: 'success', label: 'On track', Icon: CheckCircleOutlineIcon },
  [HEALTH_LEVELS.ATTENTION]: { color: 'warning', label: 'Needs attention', Icon: WarningAmberIcon },
  [HEALTH_LEVELS.AT_RISK]: { color: 'error', label: 'At risk', Icon: ReportProblemIcon },
  [HEALTH_LEVELS.NEUTRAL]: { color: 'default', label: 'Not started', Icon: RadioButtonUncheckedIcon },
};

export function statusToHealthLevel(status) {
  switch (status) {
    case 'Blocked':
      return HEALTH_LEVELS.AT_RISK;
    case 'On Hold':
      return HEALTH_LEVELS.ATTENTION;
    case 'In Progress':
    case 'Completed':
      return HEALTH_LEVELS.HEALTHY;
    default:
      return HEALTH_LEVELS.NEUTRAL;
  }
}

// Resolution is itself a good outcome, so it always reads as healthy —
// this is what stops an "open" (red) status chip from sitting next to a
// merely-"warning" (amber) severity chip and reading as contradictory.
export function getAlertHealthLevel(alert) {
  if (alert.status === 'resolved') return HEALTH_LEVELS.HEALTHY;
  return alert.severity === 'critical' ? HEALTH_LEVELS.AT_RISK : HEALTH_LEVELS.ATTENTION;
}
