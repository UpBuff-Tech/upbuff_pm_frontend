/**
 * Ticket Management Page - plain helper functions shared by the page and its modals.
 */
import moment from 'moment';

// Display labels for the stored ticket enum values. Shared by the detail modal,
// the email templates and the export so they can never drift apart.
export const TICKET_STATUS_LABELS = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  in_review: 'In Review',
  closed: 'Closed'
};

export const TICKET_PRIORITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

// The export always covers every ticket matching the active filters, not just
// the visible page, so it refetches with a page size large enough to hold them.
export const EXPORT_PAGE_SIZE = 10000;

export const EMPTY_FILTERS = {
  search: '',
  clientId: '',
  typeId: '',
  requestType: '',
  status: '',
  priority: ''
};

/* ------------------------------------------------------------------ files */

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/** Icon of a file picked in the create form (a File object). */
export function getFileIconClass(file) {
  const t = file.type || '';
  const n = file.name.toLowerCase();
  if (t.startsWith('image/')) return { cls: 'icon-image', icon: 'fa-file-image-o' };
  if (t === 'application/pdf' || n.endsWith('.pdf')) return { cls: 'icon-pdf', icon: 'fa-file-pdf-o' };
  if (t.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return { cls: 'icon-word', icon: 'fa-file-word-o' };
  if (t.includes('excel') || t.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx')) return { cls: 'icon-excel', icon: 'fa-file-excel-o' };
  if (t.includes('zip') || t.includes('archive') || n.endsWith('.zip')) return { cls: 'icon-zip', icon: 'fa-file-archive-o' };
  if (t.startsWith('text/') || n.endsWith('.txt')) return { cls: 'icon-text', icon: 'fa-file-text-o' };
  return { cls: 'icon-other', icon: 'fa-file-o' };
}

/** Icon of an attachment saved on a ticket (by its mime type). */
export function getFileIcon(mimeType) {
  if (!mimeType) return 'fa-file-o';
  if (mimeType.startsWith('image/')) return 'fa-file-image-o';
  if (mimeType === 'application/pdf') return 'fa-file-pdf-o';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word-o';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel-o';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) return 'fa-file-archive-o';
  if (mimeType.startsWith('text/')) return 'fa-file-text-o';
  return 'fa-file-o';
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Adds the files that are not in the list yet (same name and size = same file). */
export function addNewFiles(selectedFiles, newFiles) {
  const files = selectedFiles.slice();
  newFiles.forEach((f) => {
    const duplicate = files.some((e) => e.name === f.name && e.size === f.size);
    if (!duplicate) files.push(f);
  });
  return files;
}

/** A browser URL for a file the server returned as base64 text. */
export function base64ToBlobUrl(base64, mimeType) {
  const byteChars = atob(base64);
  const byteArr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArr], { type: mimeType });
  return URL.createObjectURL(blob);
}

/* ------------------------------------------------------------------ progress of a ticket */

/**
 * Get the date when a ticket entered in_progress status.
 * Falls back to: inProgressSince -> activity log -> createdAt
 */
export function getInProgressSince(ticket) {
  // 1. Use inProgressSince if set
  if (ticket.inProgressSince) {
    return new Date(ticket.inProgressSince);
  }

  // 2. Look through activity log for the last status change to in_progress
  if (ticket.activityLog && ticket.activityLog.length > 0) {
    // Search from newest to oldest
    for (let i = ticket.activityLog.length - 1; i >= 0; i--) {
      const entry = ticket.activityLog[i];
      if (entry.action === 'status_changed' || entry.action === 'status_synced' || entry.action === 'updated') {
        const details = entry.details || '';
        if (details.includes('in_progress') || details.includes('In Progress')) {
          return new Date(entry.timestamp);
        }
        // Check changes array for status -> in_progress
        if (entry.changes && entry.changes.length > 0) {
          const statusChange = entry.changes.find((c) => c.field === 'status' && c.to === 'in_progress');
          if (statusChange) {
            return new Date(entry.timestamp);
          }
        }
      }
    }
  }

  // 3. Fallback to createdAt
  return new Date(ticket.createdAt);
}

/** Logged hours of a ticket, plus the time since it went "in progress" (not rounded). */
function getLoggedHours(ticket) {
  let loggedHrs = ticket.loggedHours || 0;
  if (ticket.status === 'in_progress') {
    const sinceDate = getInProgressSince(ticket);
    if (sinceDate) {
      const elapsed = (new Date().getTime() - sinceDate.getTime()) / (1000 * 60 * 60);
      loggedHrs += elapsed;
    }
  }
  return loggedHrs;
}

export function calcElapsedHours(ticket) {
  return Math.round(getLoggedHours(ticket) * 10) / 10;
}

export function showProgress(status) {
  return status === 'in_progress' || status === 'on_hold';
}

export function progressTextClass(status) {
  return status === 'on_hold' ? 'progress-onhold' : 'progress-inprogress';
}

export function progressBarText(ticket) {
  const estHrs = ticket.estimatedHours || 8;
  const status = ticket.status;

  // Auto-calculate elapsed time for in_progress tickets
  const loggedHrs = calcElapsedHours(ticket);
  const filledRaw = Math.round((loggedHrs / estHrs) * 6);
  const filled = Math.min(filledRaw, 6);
  const empty = 6 - filled;

  let bar;
  if (status === 'on_hold') {
    bar = '█'.repeat(filled) + '░'.repeat(empty);
  } else {
    bar = '|'.repeat(filled) + '-'.repeat(empty);
  }
  return '[' + bar + '] ' + loggedHrs + 'h/' + estHrs + 'h';
}

export function formatHours(hours) {
  return hours || 0;
}

/* ------------------------------------------------------------------ display of a ticket */

export function statusCardClass(status) {
  return status === 'closed' ? 'card-closed' : '';
}

export function priorityColorClass(priority) {
  switch (priority) {
    case 'critical': return 'priority-critical';
    case 'high': return 'priority-high';
    case 'medium': return 'priority-medium';
    case 'low': return 'priority-low';
    default: return 'priority-low';
  }
}

export function typeColorClass(typeCode) {
  if (!typeCode) return 'bg-secondary';
  // Generate consistent color based on type code hash
  const colors = [
    'bg-primary', 'bg-info', 'bg-success', 'bg-warning',
    'bg-danger', 'bg-dark', 'bg-secondary',
    'ticket-type-purple', 'ticket-type-teal', 'ticket-type-pink'
  ];
  let hash = 0;
  for (let i = 0; i < typeCode.length; i++) {
    hash = typeCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function hasAttachments(attachments) {
  return attachments && attachments.length > 0;
}

export function formatShortDateTime(date) {
  if (!date) return '-';
  return moment(date).format('h:mm A');
}

// The ticket page shows dates in its own formats (not the app-wide ones of lib/formatters.js).
export function formatDateTime(date) {
  if (!date) return '-';
  return moment(date).format('DD MMM YYYY, h:mm:ss A');
}

export function formatDate(date) {
  if (!date) return '-';
  return moment(date).format('MMM DD, YYYY');
}

export function shortName(name) {
  if (!name) return 'N/A';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return parts[0].charAt(0) + '. ' + parts[parts.length - 1];
}

export function getTaskStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'done') return 'bg-success';
  if (s === 'in progress') return 'bg-info';
  if (s === 'on hold') return 'bg-warning';
  if (s === 'testing') return 'bg-primary';
  return 'bg-secondary';
}

/** "Name (CL001)" - how a client is shown in the dropdowns. */
export function clientOptionText(client) {
  return client.name + (client.clientId ? ' (' + client.clientId + ')' : '');
}

/** "First Last" of a user ('' when the profile has no name). */
export function userFullName(user) {
  const first = user.profile && user.profile.firstName ? user.profile.firstName : '';
  const last = user.profile && user.profile.lastName ? user.profile.lastName : '';
  return (first + ' ' + last).trim();
}

/**
 * The ticket types a client can raise tickets for: the ones of its purchased products.
 * All types if the client has no productsPurchased defined (or no client is chosen).
 */
export function getTicketTypesForClient(allTypes, clients, clientId) {
  let filtered = allTypes;

  if (clientId) {
    const client = (clients || []).find((c) => c._id === clientId);
    const purchasedTypeIds = (client && client.productsPurchased)
      ? client.productsPurchased.map((p) => p.ticketTypeId).filter(Boolean)
      : null;

    if (purchasedTypeIds && purchasedTypeIds.length > 0) {
      filtered = allTypes.filter((t) => purchasedTypeIds.includes(t._id));
    }
  }

  return filtered;
}

/* ------------------------------------------------------------------ export */

// Mirrors the on-screen ticket table so the exported file matches what the user sees.
export const EXPORT_COLUMNS = [
  { header: 'Ticket ID', value: (t) => t.ticketId || '' },
  { header: 'Subject', value: (t) => t.subject || '' },
  { header: 'Client', value: (t) => t.clientName || '' },
  { header: 'Type', value: (t) => t.typeCode || '' },
  { header: 'Request Type', value: (t) => t.requestType || '' },
  { header: 'Priority', value: (t) => TICKET_PRIORITY_LABELS[t.priority] || t.priority || '' },
  { header: 'Status', value: (t) => TICKET_STATUS_LABELS[t.status] || t.status || '' },
  { header: 'Assigned To', value: (t) => t.assignedToName || 'Unassigned' },
  { header: 'Created', value: (t) => (t.createdAt ? moment(t.createdAt).format('MMM DD, YYYY') : '-') },
  { header: 'Last Updated', value: (t) => (t.updatedAt ? moment(t.updatedAt).format('MMM DD, YYYY') : '-') }
];

/* ------------------------------------------------------------------ "Send Email" templates */

/** The ready-made message of each template of the Send Email modal, filled in for one ticket. */
export function buildStaffEmailTemplates(ticket, ticketId) {
  const contactName = (ticket && ticket.contactPerson) || 'Valued Customer';
  const ticketRef = ticket ? `${ticket.ticketId} - ${ticket.subject}` : ticketId;
  const status = ticket ? (TICKET_STATUS_LABELS[ticket.status] || ticket.status) : '';

  return {
    status_update: `Dear ${contactName},\n\nWe wanted to provide you with a status update regarding your support ticket:\n\nTicket: ${ticketRef}\nCurrent Status: ${status}\n\nOur team is actively working on your request and we will keep you informed of any progress. Please do not hesitate to reach out if you have any questions.\n\nThank you for your patience.\n\nBest regards,\nSupport Team`,

    followup: `Dear ${contactName},\n\nWe are following up on your support ticket:\n\nTicket: ${ticketRef}\n\nWe noticed that we may require some additional information in order to proceed. Please review your ticket and provide any outstanding details at your earliest convenience.\n\nThank you for your cooperation.\n\nBest regards,\nSupport Team`,

    resolution: `Dear ${contactName},\n\nWe are pleased to inform you that your support ticket has been resolved:\n\nTicket: ${ticketRef}\n\nWe have completed the work associated with this request. Please review the changes and let us know if everything is to your satisfaction. If you experience any further issues, do not hesitate to create a new ticket.\n\nThank you for giving us the opportunity to assist you.\n\nBest regards,\nSupport Team`,

    info_required: `Dear ${contactName},\n\nThank you for reaching out to us.\n\nIn order to proceed with your ticket (${ticketRef}), we kindly request the following information:\n\n1. [Please describe the information needed]\n2. [Additional details if applicable]\n\nPlease reply to this email with the requested details so that we can continue working on your request without delay.\n\nBest regards,\nSupport Team`,

    in_review: `Dear ${contactName},\n\nWe are pleased to inform you that your support ticket is now ready for your review:\n\nTicket: ${ticketRef}\n\nOur team has completed the required work and we would like you to review the outcome at your earliest convenience. Once you are satisfied with the resolution, please close the ticket from your client portal.\n\nIf you have any concerns or require further assistance, please do not hesitate to reach out.\n\nBest regards,\nSupport Team`
  };
}

/* ------------------------------------------------------------------ select2 */

/** Turns a select2 dropdown back into a plain <select> (does nothing when it is not one). */
export function destroySelect2(select) {
  if (select.hasClass('select2-hidden-accessible')) {
    select.select2('destroy');
  }
}

/** `value` when it is one of the options of a dropdown, otherwise '' (nothing selected). */
export function knownValue(value, allowedValues) {
  return allowedValues.includes(value) ? value : '';
}
