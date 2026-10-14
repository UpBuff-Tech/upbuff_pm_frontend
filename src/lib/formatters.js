// The global template helpers the old app registered in pages/project/utility.js and
// pages/client/utility.js ({{formatDate d}}, {{formatDateTime d}}, {{formatDateInput d}}, {{eq a b}}),
// as plain functions.

import moment from 'moment';

/** "05 Mar 2026" ('' for an empty date) */
export function formatDate(date) {
  if (!date) return '';
  return moment(date).format('DD MMM YYYY');
}

/** "05 Mar 2026, 02:30 PM" ('' for an empty date) */
export function formatDateTime(date) {
  if (!date) return '';
  return moment(date).format('DD MMM YYYY, hh:mm A');
}

/** "2026-03-05", the value format of <input type="date"> ('' for an empty date) */
export function formatDateInput(date) {
  if (!date) return '';
  return moment(date).format('YYYY-MM-DD');
}

export function eq(a, b) {
  return a === b;
}
