/**
 * The status and priority badges of a ticket, shared by the table, the cards and the detail modal.
 */

const STATUS_BADGES = {
  open: { className: 'ticket-status-open', label: 'Open' },
  assigned: { className: 'ticket-status-assigned', label: 'Assigned' },
  in_progress: { className: 'ticket-status-inprogress', label: 'In Progress' },
  on_hold: { className: 'ticket-status-onhold', label: 'On Hold' },
  in_review: { className: 'ticket-status-inreview', label: 'In Review' },
  closed: { className: 'ticket-status-closed', label: 'Closed' }
};

const PRIORITY_BADGES = {
  critical: { className: 'tk-priority p-critical', label: 'Critical' },
  high: { className: 'tk-priority p-high', label: 'High' },
  medium: { className: 'tk-priority p-medium', label: 'Medium' },
  low: { className: 'tk-priority p-low', label: 'Low' }
};

/** Nothing for an unknown status. An "On Hold" badge shows the hold reason as its tooltip. */
export function TicketStatusBadge({ status, holdReason, style }) {
  const badge = STATUS_BADGES[status];
  if (!badge) return null;

  return (
    <span className={`badge tk-status ${badge.className}`} style={style} title={status === 'on_hold' ? (holdReason || '') : undefined}>
      {badge.label}
    </span>
  );
}

/** `fallback` = the priority to show for an unknown one (the list shows "Low", the detail modal nothing). */
export function TicketPriorityBadge({ priority, fallback }) {
  const badge = PRIORITY_BADGES[priority] || PRIORITY_BADGES[fallback];
  if (!badge) return null;

  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}
