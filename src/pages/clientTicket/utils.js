// Plain helpers of the client ticket page.

import moment from 'moment';
import XLSX from 'xlsx';

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function getClientFileIconClass(file) {
  const t = file.type || '';
  const n = file.name.toLowerCase();
  if (t.startsWith('image/')) return { cls: 'icon-image', icon: 'bx bx-image' };
  if (t === 'application/pdf' || n.endsWith('.pdf')) return { cls: 'icon-pdf', icon: 'bx bxs-file-pdf' };
  if (t.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return { cls: 'icon-word', icon: 'bx bxs-file-doc' };
  if (t.includes('excel') || t.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx')) return { cls: 'icon-excel', icon: 'bx bx-spreadsheet' };
  if (t.includes('zip') || t.includes('archive') || n.endsWith('.zip')) return { cls: 'icon-zip', icon: 'bx bx-archive' };
  if (t.startsWith('text/') || n.endsWith('.txt')) return { cls: 'icon-text', icon: 'bx bx-file-blank' };
  return { cls: 'icon-other', icon: 'bx bx-file' };
}

/** "Mar 05, 2026 14:30" - the date format used everywhere on this page. */
export function formatTicketDate(date) {
  return moment(date).format('MMM DD, YYYY HH:mm');
}

export function truncate(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// ---------------------------------------------------------------- status / priority badges

const STATUS_LABELS = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  on_hold: 'On Hold', in_review: 'In Review', closed: 'Closed'
};

const STATUS_BADGE_CLASSES = {
  open: 'bg-label-info', assigned: 'bg-label-primary', in_progress: 'bg-label-warning',
  on_hold: 'bg-label-secondary', in_review: 'bg-label-info', closed: 'bg-label-success'
};

const PRIORITY_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

const PRIORITY_BADGE_CLASSES = { critical: 'bg-danger', high: 'bg-warning', medium: 'bg-info', low: 'bg-secondary' };

export function formatTicketStatus(status) {
  return STATUS_LABELS[status] || status || '';
}

/** Badge colour of a ticket status (an unknown status is grey). */
export function ticketStatusBadgeClass(status) {
  return STATUS_BADGE_CLASSES[status] || 'bg-label-secondary';
}

/** Label of a known priority; an unknown one gives `fallback`. */
export function formatTicketPriority(priority, fallback) {
  return PRIORITY_LABELS[priority] || fallback;
}

/** Badge colour of a ticket priority (an unknown priority is grey). */
export function ticketPriorityBadgeClass(priority) {
  return PRIORITY_BADGE_CLASSES[priority] || 'bg-secondary';
}

// ---------------------------------------------------------------- Excel export

export function filterTicketsByDateRange(tickets, range) {
  const now = moment();
  if (range === 'this_month') return tickets.filter(t => moment(t.createdAt).isSame(now, 'month'));
  if (range === 'last_3_months') return tickets.filter(t => moment(t.createdAt).isAfter(now.clone().subtract(3, 'months')));
  if (range === 'last_6_months') return tickets.filter(t => moment(t.createdAt).isAfter(now.clone().subtract(6, 'months')));
  return tickets;
}

export function exportTicketsToExcel(tickets) {
  const rows = tickets.map(t => ({
    'Ticket ID': t.ticketId || '',
    'Subject': t.subject || '',
    'Type': t.typeName || '',
    'Priority': t.priority ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) : '',
    'Status': formatTicketStatus(t.status),
    'Contact Person': t.contactPerson || '',
    'Contact Email': t.contactEmail || '',
    'Contact Number': t.contactNumber || '',
    'Created At': t.createdAt ? formatTicketDate(t.createdAt) : ''
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
  XLSX.writeFile(wb, `tickets_export_${moment().format('YYYY-MM-DD')}.xlsx`);
}

// ---------------------------------------------------------------- select2

/** Removes the select2 dropdown from a <select> (given as a jQuery object) when it has one. */
export function destroySelect2(select) {
  if (select.hasClass('select2-hidden-accessible')) select.select2('destroy');
}
