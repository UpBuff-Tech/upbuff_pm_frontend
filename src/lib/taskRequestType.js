/**
 * What kind of work a task or ticket is: something newly asked for, a change to
 * something already delivered, support, or ongoing project work. Shared by every
 * surface that offers or displays the choice, so the values and their colours
 * are stated once. (The server validates the same list.)
 *
 * Tasks created before this field existed carry no requestType — display
 * code treats that as "not set" rather than assuming either value.
 *
 * The create modal, the kanban card, the detail modal and the reports all render
 * the same options and badge:
 *   - the old global helper {{#each type in taskRequestTypes}} -> TASK_REQUEST_TYPES.map(...)
 *   - the old global helper {{requestTypeBadgeClass value}}    -> requestTypeBadgeClass(value)
 *   - the old {{> taskRequestTypeBadge}} template              -> components/TaskRequestTypeBadge.jsx
 */

export const TASK_REQUEST_TYPES = ['New Requirement', 'Change Request', 'Support', 'Ongoing Project'];

/** Pre-selected wherever a new task or ticket is created. */
export const DEFAULT_REQUEST_TYPE = 'Support';

const REQUEST_TYPE_BADGE = {
  'New Requirement': 'bg-label-info',
  'Change Request': 'bg-label-warning',
  'Support': 'bg-label-danger',
  'Ongoing Project': 'bg-label-primary'
};

export function isValidRequestType(value) {
  return TASK_REQUEST_TYPES.includes(value);
}

export function requestTypeBadgeClass(value) {
  return REQUEST_TYPE_BADGE[value] || 'bg-label-secondary';
}
