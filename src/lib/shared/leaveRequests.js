/**
 * Leave and work from home requests: the constants and labels of the old
 * imports/api/leaveRequests/leaveRequests.js.
 * @author Claude
 */

// Request types
export const LeaveTypes = {
  LEAVE: 'leave',
  WORK_FROM_HOME: 'wfh',
  OPTIONAL_LEAVE: 'optional'
};

// Human-readable label for each request type. Single source of truth shared by
// the apply form, list badges, view modals and email notifications.
export const LeaveTypeLabels = {
  [LeaveTypes.LEAVE]: 'Flexi Leave',
  [LeaveTypes.WORK_FROM_HOME]: 'Work From Home',
  [LeaveTypes.OPTIONAL_LEAVE]: 'Optional Leave'
};

// Short uppercase tag (badges / email pill) for each request type.
export const LeaveTypeTags = {
  [LeaveTypes.LEAVE]: 'Flexi',
  [LeaveTypes.WORK_FROM_HOME]: 'WFH',
  [LeaveTypes.OPTIONAL_LEAVE]: 'Optional'
};

export const getLeaveTypeLabel = (type) => LeaveTypeLabels[type] || LeaveTypeLabels[LeaveTypes.LEAVE];
export const getLeaveTypeTag = (type) => LeaveTypeTags[type] || LeaveTypeTags[LeaveTypes.LEAVE];

// Request status
export const LeaveStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};
