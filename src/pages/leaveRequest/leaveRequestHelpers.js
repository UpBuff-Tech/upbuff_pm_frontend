/**
 * Plain helpers of the Leave Requests page (type badges, working-day counts,
 * tab selection and the backdated entry rows).
 * @author Claude
 */
import moment from 'moment';
import { LeaveTypeLabels } from '../../lib/shared/leaveRequests';
import { todayDateStr } from './utils';

// Badge colour per request type, shared by every list that renders a type badge.
const LEAVE_TYPE_BADGE_CLASS = {
  leave: 'bg-label-warning',
  wfh: 'bg-label-info',
  optional: 'bg-label-success'
};

// Solid badge variant used by the view/detail modals.
const LEAVE_TYPE_SOLID_BADGE_CLASS = {
  leave: 'bg-warning',
  wfh: 'bg-info',
  optional: 'bg-success'
};

export function leaveTypeBadgeClass(type) {
  return LEAVE_TYPE_BADGE_CLASS[type] || LEAVE_TYPE_BADGE_CLASS.leave;
}

export function leaveTypeSolidBadgeClass(type) {
  return LEAVE_TYPE_SOLID_BADGE_CLASS[type] || LEAVE_TYPE_SOLID_BADGE_CLASS.leave;
}

// Approved backdated entries show "Backdated" instead of "Approved".
export const isBackdatedApproved = request => request.isBackdated && request.status === 'approved';

// Highlights approved backdated entries in the request tables
export function backdatedRowClass(request) {
  return isBackdatedApproved(request) ? 'leave-row-backdated' : '';
}

// Weekdays between two YYYY-MM-DD strings, inclusive.
export function countWorkingDays(fromStr, toStr) {
  let workingDays = 0;
  const current = moment(fromStr, 'YYYY-MM-DD');
  const end = moment(toStr, 'YYYY-MM-DD');
  while (current.isSameOrBefore(end, 'day')) {
    const dayOfWeek = current.day();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.add(1, 'day');
  }
  return workingDays;
}

export function getUserDisplayName(user) {
  const profile = user.profile || {};
  return `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user.username;
}

// Tabs that can be opened directly via ?tab=, and whether they need approver rights
const LINKABLE_TABS = { myRequests: false, holidayCalendar: false, earlyLeave: false, pendingApprovals: true };

// The tab to show on load: the ?tab= value if the user may see it, else My Requests
export function resolveActiveTab(tab, canApprove) {
  if (!(tab in LINKABLE_TABS)) return 'myRequests';
  if (LINKABLE_TABS[tab] && !canApprove) return 'myRequests';
  return tab;
}

// Types that can still be requested / recorded. Optional holidays are picked in the Holiday Calendar instead.
export const LEAVE_TYPE_OPTIONS = Object.keys(LeaveTypeLabels)
  .filter(value => value !== 'optional')
  .map(value => ({ value, label: LeaveTypeLabels[value] }));

/**
 * Read and validate the backdated entry rows from the modal.
 * Fully blank rows are ignored. Returns { entries, errors }.
 */
export function readBackdatedRows(activeUsers) {
  const today = todayDateStr();
  const entries = [];
  const errors = [];

  $('#backdatedRows .backdated-row').each(function (index) {
    const $row = $(this);
    const rowNumber = index + 1;
    const userId = $row.find('.bd-employee').val();
    const type = $row.find('.bd-type').val();
    const dayType = $row.find('.bd-dayType').val();
    const fromDate = $row.find('.bd-from').val();
    const toDate = $row.find('.bd-to').val() || fromDate;
    const reason = $row.find('.bd-reason').val().trim();

    if (!userId && !fromDate && !reason) return;

    const rowError = (!userId && 'select an employee')
      || (!fromDate && 'select the from date')
      || (!reason && 'enter a reason')
      || (fromDate > toDate && 'from date is after to date')
      || (toDate > today && 'future dates are not allowed')
      || (countWorkingDays(fromDate, toDate) === 0 && 'selected dates only include weekends');
    if (rowError) {
      errors.push(`Row ${rowNumber}: ${rowError}`);
      return;
    }

    const workingDays = countWorkingDays(fromDate, toDate);
    const user = activeUsers.find(u => u._id === userId);
    entries.push({
      rowNumber,
      userId,
      employeeName: user ? user.name : userId,
      type,
      dayType,
      fromDate,
      toDate,
      reason,
      totalDays: dayType === 'half' ? workingDays * 0.5 : workingDays
    });
  });

  return { entries, errors };
}
