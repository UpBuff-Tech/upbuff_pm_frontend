// Shared helpers (the old imports/startup/client/customFunctions.js).

import moment from 'moment';
import { getCachedPermissions, currentUserId } from '../auth/AuthContext';

/** True when the logged-in user has the permission. Inside components prefer useAuth().userCan. */
function userCan(permission) {
  return getCachedPermissions().includes(permission);
}

function initializeSelect2(select2Data) {
  select2Data.forEach((data) => setUpSelect2(data.id, data.placeholder));
  function setUpSelect2(id, placeholder) {
    $(`#${id}`).select2({
      placeholder: `${placeholder}`,
      width: '100%',
      tokenSeparators: [','],
      allowClear: true,
      dropdownParent: $(`#${id}`).parent(),
    });
  }
}

const go_to_lastPage = () => window.history.back();

const camelCaseToNormal = (str) => {
  let spacedString = str.replace(/([a-z])([A-Z])/g, '$1 $2'); // Insert space between camel case
  return spacedString.charAt(0).toUpperCase() + spacedString.slice(1).toLowerCase(); // Capitalize the first letter
};

const addCommasToNumber = (number) => Number(number).toFixed(2).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');

// Precise relative time, e.g. "48 minutes ago" instead of moment's coarse
// "an hour ago" (moment rounds 45-89 minutes up to "an hour ago").
function formatRelativeTime(timestamp) {
  const then = moment(timestamp);
  if (!then.isValid()) return '';

  const seconds = moment().diff(then, 'seconds');
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  // Fall back to moment for longer spans (months/years).
  return then.fromNow();
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export { userCan, go_to_lastPage, camelCaseToNormal, addCommasToNumber, validateEmail, initializeSelect2, formatRelativeTime, currentUserId };
