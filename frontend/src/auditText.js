import { formatDay } from './formatters';
import { FIELD_LABELS } from './labels';

// Plain-language copy for audit events (the API returns raw actions and
// before/after values). Kept here, like alertCopy.js, so the components
// only lay things out.

const FIELD_NAMES = {
  status: 'Status',
  progress: 'Progress',
  statusDescription: FIELD_LABELS.statusDescription,
  eta: FIELD_LABELS.eta,
  name: 'Name',
  description: 'Description',
  marketplaceDeployment: FIELD_LABELS.marketplaceDeployment,
};

const TEXT_PREVIEW = 80;

export function formatAuditValue(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'progress') return `${value}%`;
  if (field === 'eta') return formatDay(value);
  if (field === 'marketplaceDeployment') return value ? 'On' : 'Off';
  if (field === 'statusDescription' || field === 'description') {
    const text = String(value);
    return `“${text.length > TEXT_PREVIEW ? `${text.slice(0, TEXT_PREVIEW)}…` : text}”`;
  }
  return String(value);
}

// [{ label, from, to }] — or { label, text } for assignee changes — in a stable field order.
export function auditChangeLines(changes = {}) {
  const lines = Object.keys(FIELD_NAMES)
    .filter((field) => changes[field])
    .map((field) => ({
      label: FIELD_NAMES[field],
      from: formatAuditValue(field, changes[field].from),
      to: formatAuditValue(field, changes[field].to),
    }));
  if (changes.assignees) {
    const { added = [], removed = [] } = changes.assignees;
    lines.push({ label: 'Assignees', text: [...added.map((name) => `+ ${name}`), ...removed.map((name) => `− ${name}`)].join(', ') });
  }
  return lines;
}

// "In Progress · 55% · target Dec 10, 2026" for a proposed or initial set of values.
export function summarizeValues(values = {}) {
  return [
    values.status,
    values.progress !== undefined && values.progress !== null ? `${values.progress}%` : null,
    values.eta ? `target ${formatDay(values.eta)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

// The sentence for an event, as parts so the agent name can be a link:
// { before, after } surround the agent name.
export function auditSentence(event) {
  const actor = event.actorName || 'Someone without an account';
  const subject = event.subjectName || 'someone';
  const { details = {} } = event;

  switch (event.action) {
    case 'agent_created':
      return { before: `${actor} created `, after: '' };
    case 'agent_edited':
      return { before: `${actor} edited the details of `, after: '' };
    case 'agent_deleted':
      return { before: `${actor} deleted `, after: '' };
    case 'update_recorded':
      return { before: `${actor} updated `, after: details.via === 'daily_sheet' ? ' on the Daily Update Sheet' : '' };
    case 'update_submitted':
      return { before: `${actor} sent an update for `, after: ' for review' };
    case 'update_approved': {
      const edited = details.editedByReviewer?.length ? ' with edits' : '';
      return { before: `${actor} approved ${subject}'s update for `, after: edited };
    }
    case 'changes_requested':
      return { before: `${actor} asked ${subject} for changes to their update for `, after: '' };
    case 'update_rejected':
      return { before: `${actor} didn't accept ${subject}'s update for `, after: '' };
    default:
      return { before: `${actor} changed `, after: '' };
  }
}

// Extra one-liners under the sentence (besides the change lines).
export function auditNotes(event) {
  const { details = {} } = event;
  const notes = [];
  if (event.action === 'agent_created') {
    const initial = summarizeValues(details);
    if (initial) notes.push(`Started as ${initial}`);
    if (details.assignees?.length) notes.push(`Assigned to ${details.assignees.join(', ')}`);
  }
  if (['update_submitted', 'changes_requested', 'update_rejected'].includes(event.action) && details.proposed) {
    const proposed = summarizeValues(details.proposed);
    if (proposed) notes.push(`Proposed: ${proposed}`);
  }
  if (event.action === 'update_approved' && details.appliedToCurrent === false) {
    notes.push(`Recorded in the history for ${formatDay(details.updateDate)} only — a newer update was already showing.`);
  }
  if (details.comment) notes.push(`Comment: “${details.comment}”`);
  return notes;
}
