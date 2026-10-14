/**
 * Shared client helpers for the leave request page and its sub-components
 * @author Claude
 */
import moment from 'moment';
import api from '../../api/client';

// Local "today" as YYYY-MM-DD for date input min/max.
export function todayDateStr() {
  return moment().format('YYYY-MM-DD');
}

// Minutes -> "7h 30m" / "8h" / "45m"
export function formatDuration(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined) return '-';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

// Helpers used by every leave/early-leave list and modal
export const requestListHelpers = {
  formatDate(date) {
    if (!date) return '-';
    return moment(date).format('ddd, MMM DD, YYYY');
  },

  formatDateTime(date) {
    if (!date) return '-';
    return moment(date).format('MMM DD, YYYY HH:mm');
  },

  truncate(text, length) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  },

  isPending(status) {
    return status === 'pending';
  },

  isApproved(status) {
    return status === 'approved';
  },

  isCancelled(status) {
    return status === 'cancelled';
  }
};

/**
 * Run a server method from a button: setBusy(true) while it runs (the component
 * shows its spinner and disables its buttons from that), toasts the result and
 * calls onSuccess.
 */
export function callWithSpinner({ method, args, setBusy, successMessage, errorMessage, onSuccess }) {
  setBusy(true);

  api.call(method, ...args, (error, result) => {
    setBusy(false);

    if (error) {
      toastr.error(error.reason || errorMessage);
      return;
    }
    toastr.success(successMessage);
    if (onSuccess) onSuccess(result);
  });
}

// Inline style of an element that is shown or hidden depending on the data.
export function displayStyle(visible) {
  return visible ? {} : { display: 'none' };
}
