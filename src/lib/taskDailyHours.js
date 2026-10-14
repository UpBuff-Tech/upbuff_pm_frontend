/**
 * The "date-wise hours" report mode, shared by every page that offers it.
 *
 * A task summary answers "what is the state of each task"; it cannot answer
 * "how many hours went in on Tuesday", because a task's time is one lump on
 * one row. The date-wise mode splits that lump the way the timer recorded it:
 * one row per task per day worked, footed by a totals row.
 *
 * Pages don't reimplement any of this — they hand dateWiseExportConfig() their
 * summary columns and a way to get their tasks, and get back the three config
 * fields (columns, rows, dateFilter) that switch on the selected mode.
 */
import moment from 'moment';
import api from '../api/client';
import {
  TASK_DATE_FIELDS,
  readExportDateRange,
  readExportReportType
} from './tableExport';

/** The two report shapes offered wherever this mode is available. */
export const REPORT_MODES = {
  summary: 'summary',
  dateWise: 'dateWise'
};

export const TASK_HOURS_REPORT_TYPES = [
  { value: REPORT_MODES.summary, label: 'Task summary' },
  { value: REPORT_MODES.dateWise, label: 'Date-wise hours' }
];

/** True when the export control for `scope` currently has date-wise selected. */
export function isDateWiseMode(scope) {
  return readExportReportType(scope, REPORT_MODES.summary) === REPORT_MODES.dateWise;
}

/**
 * A descriptive cell: "-" for a missing value on a data row, but blank on the
 * totals row — a row reading "Total | - | - | - | 12.00" looks like it lost
 * its data rather than like a total.
 */
const cell = getter => r => (r.isTotal ? '' : (getter(r) || '-'));

/**
 * Columns of the date-wise report. Deliberately narrow: the question it
 * answers is "how many hours, on what, on which day".
 */
export const DATE_WISE_COLUMNS = [
  { header: 'Date', value: r => r.dateLabel },
  { header: 'Phase/Activity', value: cell(r => r.phase) },
  { header: 'Task', value: cell(r => r.taskName) },
  { header: 'Employee', value: cell(r => r.employeeName) },
  { header: 'Hours', value: r => r.hours }
];

/**
 * The same report scoped across clients and projects. A phase means nothing
 * outside a single project, so the client and project each row belongs to
 * take its place.
 */
export const DATE_WISE_CLIENT_COLUMNS = [
  { header: 'Date', value: r => r.dateLabel },
  { header: 'Client', value: cell(r => r.clientName) },
  { header: 'Project', value: cell(r => r.projectName) },
  { header: 'Task', value: cell(r => r.taskName) },
  { header: 'Request Type', value: cell(r => r.requestType) },
  { header: 'Employee', value: cell(r => r.employeeName) },
  { header: 'Hours', value: r => r.hours }
];

/**
 * Task-summary columns for the client report — the employee report's shape
 * with the client added, since this one spans clients.
 */
export const CLIENT_SUMMARY_COLUMNS = [
  { header: 'Sl No', value: r => r.slNo },
  { header: 'Date', value: r => r.workDate },
  { header: 'Client', value: cell(r => r.clientName) },
  { header: 'Project', value: cell(r => r.projectName) },
  { header: 'Task Name', value: cell(r => r.taskName) },
  { header: 'Request Type', value: cell(r => r.requestType) },
  { header: 'Employee', value: cell(r => r.employeeName) },
  { header: 'Time in Range', value: r => r.dailyTimeSpent },
  { header: 'Total Time Spent', value: r => r.timeSpent },
  { header: 'Task Status', value: r => (r.isTotal ? '' : (r.status || '')) }
];

/**
 * Turn a getTaskDailyHours() result into export rows, closing with a totals
 * row so the exported figures foot to the report.
 */
export function toDateWiseRows(result) {
  const rows = ((result && result.rows) || []).map(row => Object.assign({}, row, {
    dateLabel: moment(row.day, 'YYYY-MM-DD').format('DD-MM-YYYY')
  }));

  if (!rows.length) return rows;

  // Foot the total to the column rather than to the underlying seconds. Each
  // row's hours are rounded to 2dp for display, so the exact total drifts from
  // the sum of what is printed — over 50 rows that showed as a total three
  // hundredths short of the column, which is the first thing anyone checking a
  // billing report notices.
  const displayedTotal = rows.reduce((sum, row) => sum + (parseFloat(row.hours) || 0), 0);

  rows.push({
    isTotal: true,
    dateLabel: 'Total',
    hours: displayedTotal.toFixed(2)
  });

  return rows;
}

/**
 * Fetch the date-wise rows for a set of tasks, over the range currently in the
 * export dialog's date inputs.
 */
export function fetchDateWiseRows(scope, tasks) {
  const taskIds = (tasks || []).map(t => t._id).filter(Boolean);
  if (!taskIds.length) return Promise.resolve([]);

  const { from, to } = readExportDateRange(scope);

  return new Promise((resolve, reject) => {
    api.call('projectTasks.getTaskDailyHours', taskIds, from, to, (error, result) => {
      if (error) return reject(error);
      resolve(toDateWiseRows(result));
    });
  });
}

/**
 * The mode-dependent half of an export config (see lib/tableExport.js).
 *
 * In date-wise mode the date inputs define the range the hours are summed
 * over, so the row-level date filter is switched off — the rows the server
 * returns are already scoped to it, and filtering them again against a task
 * date field would drop every one of them.
 *
 * @param {Object} options
 * @param {String} options.scope - the export control's scope name
 * @param {Array} options.summaryColumns - columns for the task-summary mode
 * @param {Function} options.getTasks - fn(instance) -> tasks or Promise of tasks
 * @param {Array} [options.dateWiseColumns] - override the date-wise columns
 * @returns {{columns: Function, rows: Function, dateFilter: Function}}
 */
export function dateWiseExportConfig({ scope, summaryColumns, getTasks, dateWiseColumns = DATE_WISE_COLUMNS }) {
  return {
    columns: () => (isDateWiseMode(scope) ? dateWiseColumns : summaryColumns),

    rows: (instance) => {
      const tasks = getTasks(instance);
      if (!isDateWiseMode(scope)) return tasks;
      return Promise.resolve(tasks).then(list => fetchDateWiseRows(scope, list));
    },

    dateFilter: () => (isDateWiseMode(scope) ? null : { fields: TASK_DATE_FIELDS })
  };
}
