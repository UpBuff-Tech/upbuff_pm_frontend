// Helper functions of the client dashboard (the template helpers of the old clientDashboard.js).
import moment from 'moment';

/**
 * Format date for display
 */
export function formatDate(date) {
  if (!date) return 'N/A';
  return moment(date).format('MMM DD, YYYY');
}

export function safeCompletionPct(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/** The badge class of a status/priority: looked up in `badges`, or `fallback` when it is not listed. */
export function badgeClass(badges, value, fallback) {
  return badges[value] || fallback;
}
