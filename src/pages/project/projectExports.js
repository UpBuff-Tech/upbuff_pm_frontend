/**
 * @author Visakh
 */

// Excel / PDF export descriptions of the two task tables of the Project page
// (see lib/tableExport.js and components/exportButtons).

import api from '../../api/client';
import { getTaskTotalSeconds, getTaskDurationDays, formatHoursMinutes } from '../../lib/taskHours';
import { formatHours } from '../../lib/shared/timeAggregation';
import { formatExportDate, toFileNameSlug } from '../../lib/tableExport';
import { dateWiseExportConfig, isDateWiseMode } from '../../lib/taskDailyHours';
import { getTimelineStatus } from './projectHelpers';

// Mirrors the "Project Details" view modal task table.
const VIEW_TASKS_EXPORT_COLUMNS = [
  { header: 'ID', value: t => t.taskId || '-' },
  { header: 'Phase/Activity', value: t => t.phase || '-' },
  { header: 'Detailed Task', value: t => t.taskName || 'N/A' },
  { header: 'Duration', value: t => `${getTaskDurationDays(t)}d` },
  { header: 'Total Hours', value: t => formatHoursMinutes(getTaskTotalSeconds(t)) },
  { header: 'Responsibility', value: t => t.responsibility || '-' },
  { header: 'Status', value: t => t.status || 'Pending' },
  { header: 'Baseline Start', value: t => formatExportDate(t.baselineStart) },
  { header: 'Baseline Finish', value: t => formatExportDate(t.baselineFinish) },
  { header: 'Actual Start', value: t => formatExportDate(t.actualStart) },
  { header: 'Actual Finish', value: t => formatExportDate(t.actualFinish) },
  { header: 'Progress', value: t => `${parseInt(t.workCompletion, 10) || 0}%` },
  { header: 'Planned Hrs', value: t => `${t.plannedHours || 0}h` },
  // Real tracked time, not the calendar span between the actual dates — a task
  // left open over a weekend is not 72 hours of work.
  { header: 'Actual Hrs', value: t => `${formatHours(t.timeSpent)}h` },
  { header: 'Timeline Status', value: t => getTimelineStatus(t).text },
  { header: 'Attachments', value: t => (t.attachments ? t.attachments.length : 0) }
];

// Mirrors the Tasks tab of the project create/edit modal.
const FORM_TASKS_EXPORT_COLUMNS = [
  { header: 'ID', value: t => t.taskId || '-' },
  { header: 'Phase/Activity', value: t => t.phase || '-' },
  { header: 'Task Name', value: t => t.taskName || '-' },
  { header: 'Duration', value: t => `${getTaskDurationDays(t)}d` },
  { header: 'Total Hours', value: t => formatHoursMinutes(getTaskTotalSeconds(t)) },
  { header: 'Baseline Start', value: t => formatExportDate(t.baselineStart) },
  { header: 'Baseline Finish', value: t => formatExportDate(t.baselineFinish) },
  { header: 'Actual Start', value: t => formatExportDate(t.actualStart) },
  { header: 'Actual Finish', value: t => formatExportDate(t.actualFinish) },
  { header: 'Assigned To', value: t => t.assignedToName || '-' },
  { header: 'Responsibility', value: t => t.responsibility || '-' },
  { header: 'Dependencies', value: t => t.dependenciesText || '-' },
  { header: 'Status', value: t => t.status || 'Pending' }
];

/**
 * Tasks of the project open in the create/edit modal.
 *
 * The export refetches rather than reusing the rows on screen, then
 * resolves the two lookup columns (assignee, dependencies) the same way the
 * table does.
 */
function getFormProjectTasks(projectId, users) {
  if (!projectId) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    api.call('projectTasks.getByProject', projectId, (error, tasks) => {
      if (error) return reject(error);

      const list = tasks || [];
      resolve(list.map(task => {
        const user = users.find(u => u._id === task.assignedTo);
        // Not every user document carries a profile — reading through it blindly
        // would throw and fail the whole export.
        const profile = (user && user.profile) || null;
        const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];

        return Object.assign({}, task, {
          assignedToName: profile
            ? (`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || '-')
            : '-',
          dependenciesText: dependencies
            .map(depId => {
              const depTask = list.find(t => t._id === depId);
              return depTask ? depTask.taskId : depId;
            })
            .join(', ')
        });
      }));
    });
  });
}

// The file and sheet say which report they hold, so the two exports of one
// project don't land in the downloads folder under the same name.
const reportSuffix = scope => (isDateWiseMode(scope) ? '_hours_by_date' : '_tasks');
const reportTitle = scope => (isDateWiseMode(scope) ? 'Hours by Date' : 'Project Tasks');

/**
 * Both project task exports offer the same two report shapes, so they differ
 * only in their summary columns, their row source and their naming.
 *
 * @param {String} options.scope - the export control's scope name
 * @param {Array} options.summaryColumns - columns for the task-summary mode
 * @param {Function} options.getTasks - fn() -> tasks or Promise of tasks
 * @param {Function} options.getProjectName - fn() -> name of the project being exported
 */
function projectTasksExportConfig({ scope, summaryColumns, getTasks, getProjectName }) {
  return Object.assign({
    scope: scope,
    fileName: () => `${toFileNameSlug(getProjectName(), 'project')}` + reportSuffix(scope),
    sheetName: () => reportTitle(scope),
    title: () => reportTitle(scope),
    subtitle: () => getProjectName() || '',
    emptyMessage: 'No tasks to export'
  }, dateWiseExportConfig({ scope, summaryColumns, getTasks }));
}

/**
 * Export of the tasks currently shown in the "Project Details" view modal.
 * @param {Object} viewedProjectTasks - { projectName, tasks } as rendered in the modal
 */
export function viewTasksExportConfig(viewedProjectTasks) {
  return projectTasksExportConfig({
    scope: 'viewProjectTasks',
    summaryColumns: VIEW_TASKS_EXPORT_COLUMNS,
    getTasks: () => viewedProjectTasks.tasks,
    getProjectName: () => viewedProjectTasks.projectName
  });
}

/**
 * Export of the Tasks tab of the project create/edit modal.
 * @param {Array} allUsersList - the users loaded for the form (to name the assignees)
 */
export function formTasksExportConfig(allUsersList) {
  return projectTasksExportConfig({
    scope: 'projectTasks',
    summaryColumns: FORM_TASKS_EXPORT_COLUMNS,
    getTasks: () => getFormProjectTasks($('#editProjectId').val(), allUsersList || []),
    getProjectName: () => $('#projectName').val()
  });
}
