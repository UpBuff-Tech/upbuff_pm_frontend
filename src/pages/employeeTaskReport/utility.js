// Helpers shared by the task reports (Employee Task Report and Client Task Report).
import moment from 'moment';

const STATUS_BADGES = {
  'Pending': 'bg-label-warning',
  'In Progress': 'bg-label-primary',
  'On Hold': 'bg-label-secondary',
  'Testing': 'bg-label-info',
  'Completed': 'bg-label-success'
};

export function getStatusBadge(status) {
  return STATUS_BADGES[status] || 'bg-label-secondary';
}

/** True when a generated report has at least one task row. */
export function hasReportTasks(data) {
  return !!(data && data.tasks && data.tasks.length > 0);
}

/**
 * The range the report was generated for, as "DD-MM-YYYY_to_DD-MM-YYYY".
 * `instance` is { reportData }.
 */
export function getReportRangeLabel(instance, separator) {
  const data = instance.reportData || {};
  const from = data.fromDate ? moment(data.fromDate).format('DD-MM-YYYY') : '';
  const to = data.toDate ? moment(data.toDate).format('DD-MM-YYYY') : '';
  if (!from && !to) return '';
  return `${from}${separator}${to}`;
}

/** The date shown in the report header. */
export function formatDate(date) {
  return moment(date).format('DD-MM-YYYY');
}
