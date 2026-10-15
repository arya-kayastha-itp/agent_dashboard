// The same rules the API enforces (backend/src/services/agent-rules.service.js),
// so forms can ask for what's needed before saving instead of after an error.

// Becoming Blocked needs why, and who or what can unblock it.
export const needsBlockerDetails = (fromStatus, toStatus, reason, blockedBy) =>
  toStatus === 'Blocked' && fromStatus !== 'Blocked' && (!reason?.trim() || !blockedBy?.trim());

// 'yyyy-MM-dd' strings compare as text; only a later date is a slip.
export const isLaterDate = (toDate, fromDate) => Boolean(fromDate && toDate && toDate > fromDate);
