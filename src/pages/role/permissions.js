/**
 * @author Nithin
 */

// The page permissions of a role, written down once. The "Page Permissions" cards of the create
// and the edit modal, the ticks loaded from a role and the permissions object sent to the server
// are all built from these lists.

/**
 * One entry per card, in the order the cards are shown.
 *   key        - the name used in the class names: select-all-<key>-create, <key>-permission-edit ...
 *   idPrefix   - the "Select All" box has the id <idPrefix>SelectAllCreate / <idPrefix>SelectAllEdit
 *   editClass  - an extra class the boxes of this card carry in the edit modal
 *   items      - the check boxes: name (= the permission), label, id in the create modal, id in the
 *                edit modal, and legacyName = the name older role documents stored the permission under
 */
export const PERMISSION_SECTIONS = [
  {
    key: 'admin', idPrefix: 'adminDashboard', icon: 'bx bx-grid-alt me-2', title: 'Admin Dashboard', editClass: 'adashboardSelect',
    items: [
      { name: 'admindashboard_view', label: 'View', createId: 'adminDashboardViewCreate', editId: 'adashboardView', legacyName: 'adminDashboard' },
    ],
  },
  {
    key: 'directorDashboard', idPrefix: 'directorDashboard', icon: 'bx bx-bar-chart-alt-2 me-2', title: 'Directors Dashboard',
    items: [
      { name: 'directorDashboard_view', label: 'View', createId: 'directorDashboardViewCreate', editId: 'directorDashboardViewEdit' },
    ],
  },
  {
    key: 'userDashboard', idPrefix: 'userDashboard', icon: 'bx bx-user-circle me-2', title: 'User Dashboard',
    items: [
      { name: 'userDashboard_view', label: 'View', createId: 'userDashboardViewCreate', editId: 'userDashboardViewEdit' },
    ],
  },
  {
    key: 'allAccounts', idPrefix: 'allAccounts', icon: 'bx bx-wallet me-2', title: 'All Accounts',
    items: [
      { name: 'allAccounts_view', label: 'View', createId: 'allAccountsViewCreate', editId: 'allAccountsViewEdit' },
    ],
  },
  {
    key: 'user', idPrefix: 'user', icon: 'bx bx-user me-2', title: 'User Management', editClass: 'userSelect',
    items: [
      { name: 'user_view', label: 'View', createId: 'userViewCreate', editId: 'userscheckView', legacyName: 'userView' },
      { name: 'user_create', label: 'Create', createId: 'userCreateCreate', editId: 'userscheckCreate', legacyName: 'userCreate' },
      { name: 'user_update', label: 'Edit', createId: 'userUpdateCreate', editId: 'userscheckUpdate', legacyName: 'userUpdate' },
      { name: 'user_delete', label: 'Delete', createId: 'userDeleteCreate', editId: 'userscheckDelete', legacyName: 'userDelete' },
    ],
  },
  {
    key: 'role', idPrefix: 'role', icon: 'bx bx-shield me-2', title: 'Role Management', editClass: 'roleSelect',
    items: [
      { name: 'role_view', label: 'View', createId: 'roleViewCreate', editId: 'rolecheckView', legacyName: 'roleView' },
      { name: 'role_create', label: 'Create', createId: 'roleCreateCreate', editId: 'rolecheckCreate', legacyName: 'roleCreate' },
      { name: 'role_update', label: 'Edit', createId: 'roleUpdateCreate', editId: 'rolecheckUpdate', legacyName: 'roleUpdate' },
      { name: 'role_delete', label: 'Delete', createId: 'roleDeleteCreate', editId: 'rolecheckDelete', legacyName: 'roleDelete' },
    ],
  },
  {
    key: 'systemConfig', idPrefix: 'systemConfig', icon: 'bx bx-cog me-2', title: 'System Config',
    items: [
      { name: 'systemConfig_view', label: 'View', createId: 'systemConfigViewCreate', editId: 'systemConfigViewEdit' },
      { name: 'systemConfig_create', label: 'Create', createId: 'systemConfigCreateCreate', editId: 'systemConfigCreateEdit' },
      { name: 'systemConfig_update', label: 'Edit', createId: 'systemConfigUpdateCreate', editId: 'systemConfigUpdateEdit' },
      { name: 'systemConfig_delete', label: 'Delete', createId: 'systemConfigDeleteCreate', editId: 'systemConfigDeleteEdit' },
    ],
  },
  {
    key: 'client', idPrefix: 'client', icon: 'bx bx-building me-2', title: 'Client Management',
    items: [
      { name: 'client_view', label: 'View', createId: 'clientViewCreate', editId: 'clientViewEdit', legacyName: 'clientView' },
      { name: 'client_create', label: 'Create', createId: 'clientCreateCreate', editId: 'clientCreateEdit', legacyName: 'clientCreate' },
      { name: 'client_update', label: 'Edit', createId: 'clientUpdateCreate', editId: 'clientUpdateEdit', legacyName: 'clientUpdate' },
      { name: 'client_delete', label: 'Delete', createId: 'clientDeleteCreate', editId: 'clientDeleteEdit', legacyName: 'clientDelete' },
    ],
  },
  {
    key: 'project', idPrefix: 'project', icon: 'bx bx-briefcase me-2', title: 'Project Management',
    items: [
      { name: 'project_view', label: 'View', createId: 'projectViewCreate', editId: 'projectViewEdit', legacyName: 'projectView' },
      { name: 'project_create', label: 'Create', createId: 'projectCreateCreate', editId: 'projectCreateEdit', legacyName: 'projectCreate' },
      { name: 'project_update', label: 'Edit', createId: 'projectUpdateCreate', editId: 'projectUpdateEdit', legacyName: 'projectUpdate' },
      { name: 'project_delete', label: 'Delete', createId: 'projectDeleteCreate', editId: 'projectDeleteEdit', legacyName: 'projectDelete' },
    ],
  },
  {
    key: 'task', idPrefix: 'task', icon: 'bx bx-task me-2', title: 'Task Management',
    items: [
      { name: 'task_view', label: 'View', createId: 'taskViewCreate', editId: 'taskViewEdit', legacyName: 'taskView' },
      { name: 'task_create', label: 'Create', createId: 'taskCreateCreate', editId: 'taskCreateEdit', legacyName: 'taskCreate' },
      { name: 'task_update', label: 'Edit', createId: 'taskUpdateCreate', editId: 'taskUpdateEdit', legacyName: 'taskUpdate' },
    ],
  },
  {
    key: 'employeeTaskReport', idPrefix: 'employeeTaskReport', icon: 'bx bx-bar-chart me-2', title: 'Employee Task Report',
    items: [
      { name: 'employeeTaskReport_view', label: 'View', createId: 'employeeTaskReportViewCreate', editId: 'employeeTaskReportViewEdit' },
    ],
  },
  {
    key: 'clientTaskReport', idPrefix: 'clientTaskReport', icon: 'bx bx-pie-chart-alt-2 me-2', title: 'Client Task Report',
    items: [
      { name: 'clientTaskReport_view', label: 'View', createId: 'clientTaskReportViewCreate', editId: 'clientTaskReportViewEdit' },
    ],
  },
  {
    key: 'attendance', idPrefix: 'attendance', icon: 'bx bx-time-five me-2', title: 'Attendance',
    items: [
      { name: 'attendance_view', label: 'View Own', createId: 'attendanceViewCreate', editId: 'attendanceViewEdit', legacyName: 'attendanceView' },
      { name: 'attendance_viewAll', label: 'View All', createId: 'attendanceViewAllCreate', editId: 'attendanceViewAllEdit' },
    ],
  },
  {
    key: 'leaveRequest', idPrefix: 'leaveRequest', icon: 'bx bx-calendar-check me-2', title: 'Leave Request',
    items: [
      { name: 'leaveRequest_approve', label: 'Approve', createId: 'leaveRequestApproveCreate', editId: 'leaveRequestApproveEdit' },
    ],
  },
  {
    key: 'ganttChart', idPrefix: 'ganttChart', icon: 'bx bx-chart me-2', title: 'Gantt Chart',
    items: [
      { name: 'ganttChart_view', label: 'View', createId: 'ganttChartViewCreate', editId: 'ganttChartViewEdit' },
    ],
  },
  {
    key: 'ticket', idPrefix: 'ticket', icon: 'bx bx-support me-2', title: 'Ticket Management',
    items: [
      { name: 'ticket_view', label: 'View', createId: 'ticketViewCreate', editId: 'ticketViewEdit' },
      { name: 'ticket_create', label: 'Create', createId: 'ticketCreateCreate', editId: 'ticketCreateEdit' },
      { name: 'ticket_update', label: 'Edit', createId: 'ticketUpdateCreate', editId: 'ticketUpdateEdit' },
    ],
  },
  {
    key: 'ticketTypes', idPrefix: 'ticketTypes', icon: 'bx bx-category me-2', title: 'Ticket Types',
    items: [
      { name: 'ticketTypes_view', label: 'View', createId: 'ticketTypesViewCreate', editId: 'ticketTypesViewEdit' },
      { name: 'ticketTypes_create', label: 'Create', createId: 'ticketTypesCreateCreate', editId: 'ticketTypesCreateEdit' },
      { name: 'ticketTypes_update', label: 'Edit', createId: 'ticketTypesUpdateCreate', editId: 'ticketTypesUpdateEdit' },
      { name: 'ticketTypes_delete', label: 'Delete', createId: 'ticketTypesDeleteCreate', editId: 'ticketTypesDeleteEdit' },
    ],
  },
  {
    key: 'suggestions', idPrefix: 'suggestions', icon: 'bx bx-message-rounded-dots me-2', title: 'Suggestions',
    items: [
      { name: 'suggestions_view', label: 'View', createId: 'suggestionsViewCreate', editId: 'suggestionsViewEdit' },
    ],
  },
  {
    key: 'syncHealth', idPrefix: 'syncHealth', icon: 'bx bx-pulse me-2', title: 'System Incidents',
    items: [
      { name: 'syncHealth_view', label: 'View', createId: 'syncHealthViewCreate', editId: 'syncHealthViewEdit' },
    ],
  },
  {
    key: 'ticketNotification', idPrefix: 'ticketNotification', icon: 'bx bx-bell me-2', title: 'Ticket Notification',
    items: [
      { name: 'ticketNotification_view', label: 'View', createId: 'ticketNotificationViewCreate', editId: 'ticketNotificationViewEdit' },
    ],
  },
  {
    key: 'sapTicketNotification', idPrefix: 'sapTicketNotification', icon: 'bx bx-bell-plus me-2', title: 'SAP Ticket Notification',
    items: [
      { name: 'sapTicketNotification_view', label: 'View', createId: 'sapTicketNotificationViewCreate', editId: 'sapTicketNotificationViewEdit' },
    ],
  },
  {
    key: 'escalationNotification', idPrefix: 'escalationNotification', icon: 'bx bx-bell-off me-2', title: 'Escalation Notification',
    items: [
      { name: 'escalationNotification_view', label: 'View', createId: 'escalationNotificationViewCreate', editId: 'escalationNotificationViewEdit' },
    ],
  },
];

/**
 * Every permission sent to the server when a role is saved, in this order.
 * Permissions without a check box in the form (financial_*) are sent as false.
 */
export const PERMISSION_KEYS = [
  'admindashboard_view', 'directorDashboard_view', 'userDashboard_view', 'user_view', 'user_create',
  'user_update', 'user_delete', 'role_view', 'role_create',
  'role_update', 'role_delete', 'systemConfig_view', 'systemConfig_create',
  'systemConfig_update', 'systemConfig_delete', 'client_view', 'client_create',
  'client_update', 'client_delete', 'project_view', 'project_create',
  'project_update', 'project_delete', 'task_view', 'task_create',
  'task_update', 'employeeTaskReport_view', 'clientTaskReport_view', 'attendance_view',
  'attendance_viewAll', 'leaveRequest_approve', 'ganttChart_view', 'allAccounts_view',
  'ticket_view', 'ticket_create', 'ticket_update', 'ticketTypes_view',
  'ticketTypes_create', 'ticketTypes_update', 'ticketTypes_delete', 'suggestions_view',
  'syncHealth_view', 'ticketNotification_view', 'sapTicketNotification_view', 'escalationNotification_view',
  'financial_view', 'financial_create', 'financial_update',
];

/**
 * Cards whose "Select All" box ticks or unticks itself when one of their boxes is changed.
 * (The Client Task Report card is not in this list.)
 */
export const AUTO_SELECT_ALL_SECTIONS = [
  'admin', 'directorDashboard', 'userDashboard', 'user', 'role', 'systemConfig', 'client', 'project', 'task',
  'employeeTaskReport', 'allAccounts', 'attendance', 'leaveRequest', 'ganttChart', 'ticket',
  'ticketTypes', 'suggestions', 'syncHealth', 'ticketNotification', 'sapTicketNotification',
  'escalationNotification',
];

/** Cards whose boxes are unticked before the permissions of a role are loaded into the edit modal. */
export const EDIT_RESET_SECTIONS = [
  'admin', 'directorDashboard', 'userDashboard', 'user', 'role', 'systemConfig', 'client', 'project', 'task',
  'employeeTaskReport', 'allAccounts', 'attendance', 'leaveRequest', 'ganttChart', 'ticket',
  'ticketTypes', 'suggestions', 'syncHealth',
];

/** Cards whose "Select All" box is worked out after the permissions of a role were loaded into the edit modal. */
export const EDIT_SELECT_ALL_SECTIONS = [
  'admin', 'directorDashboard', 'userDashboard', 'user', 'role', 'systemConfig', 'client', 'project', 'task',
  'employeeTaskReport', 'allAccounts', 'attendance', 'leaveRequest', 'ganttChart', 'ticket',
  'ticketTypes', 'suggestions', 'ticketNotification', 'sapTicketNotification',
];

/**
 * Get list of all available pages for home page selection
 * @returns {Array} Array of page objects with url and name
 */
export const AVAILABLE_PAGES = [
  { url: '/admin/dashboard', name: 'Admin Dashboard' },
  { url: '/client/dashboard', name: 'Client Dashboard' },
  { url: '/director/dashboard', name: 'Directors Dashboard' },
  { url: '/user/dashboard', name: 'My Dashboard (User Dashboard)' },
  { url: '/user/list', name: 'User Management' },
  { url: '/role/list', name: 'Role Management' },
  { url: '/client/list', name: 'Client Management' },
  { url: '/project/list', name: 'Project Management' },
  { url: '/task/list', name: 'Task Management' },
];

/** True when every box of the card is ticked. */
export const isSectionFullyChecked = (section, permissions) => {
  return section.items.every((item) => permissions[item.name]);
};
