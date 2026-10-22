// Notification types (the same values the server stores in notification.type)
export const NotificationTypes = {
  TASK_DELAYED: 'task_delayed',
  TASK_AT_RISK: 'task_at_risk',
  PROJECT_DELAYED: 'project_delayed',
  PROJECT_AT_RISK: 'project_at_risk',
  TASK_ASSIGNED: 'task_assigned',
  PROJECT_ASSIGNED: 'project_assigned',
  CLIENT_TICKET_CREATED: 'client_ticket_created',
  TICKET_UNASSIGNED: 'ticket_unassigned',
  TICKET_OVERDUE: 'ticket_overdue',
  TICKET_NO_ACTION: 'ticket_no_action',
  TASK_CREATED: 'task_created',
  TASK_COMMENT: 'task_comment',
  TICKET_COMMENT: 'ticket_comment'
};

export function isTaskDelay(notification) {
  return notification.type === NotificationTypes.TASK_DELAYED || notification.type === NotificationTypes.TASK_AT_RISK;
}

export function isProjectDelay(notification) {
  return notification.type === NotificationTypes.PROJECT_DELAYED || notification.type === NotificationTypes.PROJECT_AT_RISK;
}

// How each notification type looks: icon, colour tone and a short label.
const TYPE_STYLES = {
  [NotificationTypes.TASK_DELAYED]: { icon: 'bx-time-five', tone: 'danger', label: 'Task delayed', alert: true },
  [NotificationTypes.TASK_AT_RISK]: { icon: 'bx-error', tone: 'warning', label: 'Task at risk', alert: true },
  [NotificationTypes.PROJECT_DELAYED]: { icon: 'bx-folder-minus', tone: 'danger', label: 'Project delayed', alert: true },
  [NotificationTypes.PROJECT_AT_RISK]: { icon: 'bx-error', tone: 'warning', label: 'Project at risk', alert: true },
  [NotificationTypes.TASK_ASSIGNED]: { icon: 'bx-task', tone: 'primary', label: 'Task assigned' },
  [NotificationTypes.PROJECT_ASSIGNED]: { icon: 'bx-folder-plus', tone: 'primary', label: 'Project assigned' },
  [NotificationTypes.CLIENT_TICKET_CREATED]: { icon: 'bx-support', tone: 'info', label: 'New ticket' },
  [NotificationTypes.TICKET_UNASSIGNED]: { icon: 'bx-user-x', tone: 'warning', label: 'Ticket unassigned', alert: true },
  [NotificationTypes.TICKET_OVERDUE]: { icon: 'bx-alarm-exclamation', tone: 'danger', label: 'Ticket overdue', alert: true },
  [NotificationTypes.TICKET_NO_ACTION]: { icon: 'bx-hourglass', tone: 'warning', label: 'No action on ticket', alert: true },
  [NotificationTypes.TASK_CREATED]: { icon: 'bx-list-plus', tone: 'info', label: 'New task' },
  [NotificationTypes.TASK_COMMENT]: { icon: 'bx-comment-detail', tone: 'info', label: 'Task comment' },
  [NotificationTypes.TICKET_COMMENT]: { icon: 'bx-message-dots', tone: 'info', label: 'Ticket comment' },
};
const DEFAULT_STYLE = { icon: 'bx-bell', tone: 'primary', label: 'Update' };

/** { icon, tone, label, alert } for a notification (tone: primary | info | warning | danger). */
export function notificationStyle(notification) {
  return TYPE_STYLES[notification && notification.type] || DEFAULT_STYLE;
}
