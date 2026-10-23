/**
 * Client-wise task report.
 *
 * The employee report answers "what did this person do"; this one answers
 * "where did the work go" — by default across every client's projects at
 * once, with a per-client subtotal so a portfolio reads client by client,
 * and narrowed to one client's work when the client filter is set.
 *
 * Picking a client also narrows the project dropdown to that client's
 * projects, since a project belongs to exactly one client and the two
 * filters would otherwise combine into an empty report.
 *
 * The employee filter lists everyone, not the caller's subordinates: unlike
 * the employee reports, this one is read client-side of the org chart, so
 * scoping it to a reporting line would leave a client's hours incomplete.
 * Who may open the page at all is the clientTaskReport_view permission's job.
 *
 * It offers the same two shapes as the project exports, importing those
 * column sets rather than restating them, so a client report and a project
 * report of the same work read identically.
 */
import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import TaskRequestTypeBadge from '../../components/TaskRequestTypeBadge';
import { colorFor } from '../../components/detailModal/DetailModal';
import { TASK_REQUEST_TYPES } from '../../lib/taskRequestType';
import { toFileNameSlug, formatDateRangeLabel } from '../../lib/tableExport';
import {
  REPORT_MODES,
  CLIENT_SUMMARY_COLUMNS,
  DATE_WISE_CLIENT_COLUMNS,
  toDateWiseRows
} from '../../lib/taskDailyHours';
import { ReportLoading } from '../employeeTaskReport/ReportStates';
import { hasReportTasks, getReportRangeLabel, formatDate } from '../employeeTaskReport/utility';
import { STATUSES, statusClass, PRESETS, formatHours, groupTime, Avatar, KpiTile, RankedBars, SortHeader } from '../employeeTaskReport/reportUi';
import { destroySelect2 } from '../../lib/destroySelect2';
import '../employeeTaskReport/employeeTaskReport.css';
import './clientTaskReport.css';
import { hideEmptyOption } from '../../lib/select2Options';

const FULL_WIDTH = { width: '100%' };

// In the functions below `instance` is { reportData }: the report that is on screen.

/** The report is generated for a chosen mode; the export mirrors what's shown. */
function currentMode(instance) {
  const data = instance.reportData;
  return (data && data.mode) || REPORT_MODES.summary;
}

function isDateWise(instance) {
  return currentMode(instance) === REPORT_MODES.dateWise;
}

/**
 * Flatten the generated report into export rows, closing with a totals row so
 * the exported figures foot to the report on screen.
 */
function getReportRowsForExport(instance) {
  const data = instance.reportData;
  if (!data || !data.tasks || !data.tasks.length) return [];

  if (isDateWise(instance)) {
    // Reuse the shared date-wise shaping so this report and the project
    // exports produce byte-identical rows for the same work.
    return toDateWiseRows({ rows: data.tasks, totalHours: data.totalHours });
  }

  const rows = data.tasks.map((task, index) => ({
    slNo: index + 1,
    workDate: formatDateRangeLabel(task.workDateFrom, task.workDateTo),
    clientName: task.clientName || '',
    projectName: task.projectName || '',
    taskName: task.taskName || '',
    requestType: task.requestType || '',
    employeeName: task.employeeName || '',
    dailyTimeSpent: task.dailyTimeSpent || '',
    timeSpent: task.timeSpent || '',
    status: task.status || ''
  }));

  rows.push({
    isTotal: true,
    slNo: '',
    workDate: '',
    clientName: 'Total',
    dailyTimeSpent: data.totalDailyTimeSpent || '',
    timeSpent: data.totalTimeSpent || ''
  });

  return rows;
}

/** What the export is scoped to — whichever of client/project were picked. */
function getReportScopeName(instance) {
  const data = instance.reportData || {};
  return [data.clientName, data.projectName].filter(Boolean).join(' - ') || 'All Clients';
}

// No dateFilter: the report already covers a chosen range and mode, so the
// buttons export exactly what is on screen instead of reopening a dialog.
const EXPORT_CONFIG = {
  scope: 'clientTaskReport',
  columns: instance => (isDateWise(instance) ? DATE_WISE_CLIENT_COLUMNS : CLIENT_SUMMARY_COLUMNS),
  rows: getReportRowsForExport,
  fileName: instance =>
    `client_task_report_${toFileNameSlug(getReportScopeName(instance), 'all_clients')}`
    + `${isDateWise(instance) ? '_hours_by_date' : ''}`
    + `_${getReportRangeLabel(instance, '_to_')}`,
  sheetName: instance => (isDateWise(instance) ? 'Hours by Date' : 'Client Task Report'),
  title: instance => (isDateWise(instance) ? 'Client Hours by Date' : 'Client Task Report'),
  subtitle: instance => `${getReportScopeName(instance)}  |  ${getReportRangeLabel(instance, ' to ')}`,
  emptyMessage: 'No data to export'
};

function dayLabel(day) {
  return moment(day, 'YYYY-MM-DD').format('DD-MM-YYYY');
}

const SORTS = {
  day: (a, b) => (a.day || '').localeCompare(b.day || ''),
  client: (a, b) => (a.clientName || '').localeCompare(b.clientName || ''),
  employee: (a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''),
  task: (a, b) => (a.taskName || '').localeCompare(b.taskName || ''),
  range: (a, b) => (a.$seconds || 0) - (b.$seconds || 0),
  total: (a, b) => (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0),
  status: (a, b) => (a.status || '').localeCompare(b.status || ''),
};

const PAGE_SIZES = [25, 50, 100];

const MODES = [
  { key: REPORT_MODES.summary, label: 'Task summary', icon: 'bx-list-ul' },
  { key: REPORT_MODES.dateWise, label: 'Date-wise hours', icon: 'bx-calendar' },
];

/** The page numbers to show: always the first and last, the current one and its neighbours, '…' between. */
function pageItems(current, count) {
  const pages = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((page) => page >= 1 && page <= count)
    .sort((a, b) => a - b);
  const items = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push('gap-' + page);
    items.push(page);
  });
  return items;
}

/** Logged seconds of a row: in-range time in the summary, the day's time in the date-wise report. */
const secondsOf = (row) => (row.seconds !== undefined ? row.seconds : row.dailyTimeSpentSeconds) || 0;

export default function ClientTaskReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [clientList, setClientList] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  // Mirrors #clientSelect so the project options can react to it.
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');

  // The plain (not select2) filter fields
  const [maxDate] = useState(() => moment().format('YYYY-MM-DD'));
  const [statusFilterValue, setStatusFilterValue] = useState('All');
  const [requestTypeValue, setRequestTypeValue] = useState('');
  const [reportModeValue, setReportModeValue] = useState(REPORT_MODES.summary);
  const [fromDateValue, setFromDateValue] = useState(() => moment().startOf('month').format('YYYY-MM-DD'));
  const [toDateValue, setToDateValue] = useState(maxDate);
  const [activePreset, setActivePreset] = useState('month');

  // Table tools (on the generated report only, nothing is fetched again)
  const [search, setSearch] = useState('');
  const [statusView, setStatusView] = useState('All');
  const [sort, setSort] = useState({ key: null, dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const instance = { reportData };
  const hasReportData = hasReportTasks(reportData);
  const isDateWiseReport = isDateWise(instance);

  /** Only the chosen client's projects, so the two filters can't contradict. */
  const projectList = selectedClientId ? allProjects.filter(p => p.clientId === selectedClientId) : allProjects;

  useEffect(() => {
    api.call('clients.list', (error, result) => {
      if (error) {
        console.error('Error loading clients:', error);
        toastr.error('Failed to load client list');
      } else if (result) {
        setClientList(result);
      }
    });

    // Every current employee, not just the caller's subordinates: this report is
    // read client-side of the org chart, so who reports to whom is not a useful
    // way to narrow it.
    //
    // Only the dropdown hides deactivated staff. The report itself is unscoped,
    // so a departed employee's hours still land in the rows and totals — they
    // just can't be singled out by a filter that no longer lists them.
    api.call('user.getEmployeesForDropdown', (error, result) => {
      if (error) console.error('Error loading employees:', error);
      else if (result) setEmployeeList(result);
    });

    api.call('project.getAllForDropdown', (error, result) => {
      if (error) console.error('Error loading projects:', error);
      else if (result) setAllProjects(result);
    });
  }, []);

  // The three dropdowns are select2 dropdowns; their values are read from select2 on submit
  useEffect(() => {
    $('#clientSelect').select2({ placeholder: 'All Clients', allowClear: true, width: '100%', templateResult: hideEmptyOption });
    $('#projectSelect').select2({ placeholder: 'All Projects', allowClear: true, width: '100%', templateResult: hideEmptyOption });
    $('#employeeSelect').select2({ placeholder: 'All Employees', allowClear: true, width: '100%', templateResult: hideEmptyOption });

    /**
     * Re-scope the project dropdown to the chosen client, dropping a project
     * selection that no longer belongs to it — the change also resyncs the
     * select2 label with the options that are rendered again.
     */
    const onClientChange = (event) => {
      setSelectedClientId($(event.currentTarget).val() || '');
      $('#projectSelect').val('').trigger('change');
    };
    $('#clientSelect').on('change', onClientChange);

    return () => {
      $('#clientSelect').off('change', onClientChange);
      destroySelect2('#clientSelect, #projectSelect, #employeeSelect');
    };
  }, []);

  /** Runs the report for a range; `mode` overrides the chosen report type (the toggle passes it). */
  const generateReport = (fromDateStr, toDateInput, mode = reportModeValue || REPORT_MODES.summary) => {
    const clientId = $('#clientSelect').val() || null;
    const projectId = $('#projectSelect').val() || null;
    const employeeId = $('#employeeSelect').val() || null;
    const statusFilter = statusFilterValue || 'All';
    const requestType = requestTypeValue || null;

    if (!fromDateStr) {
      toastr.error('From date is required');
      return;
    }
    const toDateStr = toDateInput || fromDateStr;

    if (moment(fromDateStr).isAfter(moment(toDateStr))) {
      toastr.error('From date cannot be after To date');
      return;
    }

    const fromDate = moment(fromDateStr, 'YYYY-MM-DD').startOf('day').toDate();
    const toDate = moment(toDateStr, 'YYYY-MM-DD').endOf('day').toDate();

    setIsLoading(true);
    setShowEmptyState(false);
    setReportData(null);
    setSearch('');
    setStatusView('All');
    setSort({ key: null, dir: 'desc' });

    // A null clientId means every client the caller can see; the method takes
    // the filters as an explicit null rather than an absent key.
    api.call(
      'projectTasks.getClientDateRangeReport',
      clientId, fromDate, toDate,
      { projectId, employeeId, statusFilter, requestType, mode },
      (error, result) => {
        setIsLoading(false);

        if (error) {
          console.error('Error generating report:', error);
          toastr.error(error.reason || 'Failed to generate report');
          setShowEmptyState(true);
          setEmptyMessage('Error generating report. Please try again.');
          return;
        }

        if (result && result.tasks && result.tasks.length > 0) {
          setReportData(result);
          toastr.success('Report generated successfully');
        } else {
          setShowEmptyState(true);
          // Name the narrowest filter that was set, so the message points at
          // the thing most likely to be why nothing came back.
          let scope = 'any client';
          if (projectId) scope = 'the selected project';
          else if (clientId) scope = 'the selected client';
          const statusText = statusFilter !== 'All' ? ` with status "${statusFilter}"` : '';
          const typeText = requestType ? ` of type "${requestType}"` : '';
          setEmptyMessage(`No tasks found for ${scope} in the selected date range${statusText}${typeText}.`);
          toastr.info('No data found for the selected criteria');
        }
      }
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    generateReport(fromDateValue, toDateValue);
  };

  const handlePreset = (preset) => {
    const [from, to] = preset.range().map((date) => date.format('YYYY-MM-DD'));
    setFromDateValue(from);
    setToDateValue(to);
    setActivePreset(preset.key);
    generateReport(from, to);
  };

  /** Switching the report type re-runs a report that is already on screen. */
  const handleMode = (mode) => {
    if (mode === reportModeValue) return;
    setReportModeValue(mode);
    if (hasReportData) generateReport(fromDateValue, toDateValue, mode);
  };

  const handleResetFilters = (event) => {
    event.preventDefault();

    $('#clientSelect').val('').trigger('change');
    $('#projectSelect').val('').trigger('change');
    $('#employeeSelect').val('').trigger('change');
    setStatusFilterValue('All');
    setRequestTypeValue('');
    setReportModeValue(REPORT_MODES.summary);
    setFromDateValue(moment().startOf('month').format('YYYY-MM-DD'));
    setToDateValue(moment().format('YYYY-MM-DD'));
    setActivePreset('month');

    setReportData(null);
    setShowEmptyState(false);
    setEmptyMessage('');

    toastr.info('Filters reset');
  };

  const handleSort = (key) => {
    setSort((current) => (current.key === key
      ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'range' || key === 'total' ? 'desc' : 'asc' }));
  };

  /* ---- Figures derived from the report ---- */
  const tasks = hasReportData ? reportData.tasks : [];

  const insights = useMemo(() => {
    const seconds = tasks.reduce((sum, row) => sum + secondsOf(row), 0);
    const byClient = groupTime(tasks, (row) => row.clientName || 'No Client', secondsOf);
    const byProject = groupTime(tasks, (row) => row.projectName, secondsOf);
    const byEmployee = groupTime(tasks, (row) => row.employeeName || 'Unassigned', secondsOf);
    const statusCounts = Object.fromEntries(STATUSES.map((s) => [s.key, tasks.filter((t) => t.status === s.key).length]));
    const taskCount = new Set(tasks.map((row) => row.taskId || row.taskName)).size;
    const workedDays = new Set(tasks.map((row) => row.day).filter(Boolean)).size;
    const days = reportData ? Math.max(1, moment(reportData.toDate).startOf('day').diff(moment(reportData.fromDate).startOf('day'), 'days') + 1) : 1;
    const top = byClient[0];
    return {
      seconds, byClient, byProject, byEmployee, statusCounts, taskCount, workedDays, days,
      topClient: top && top.seconds > 0 ? top : null,
    };
  }, [reportData]);

  const maxRowSeconds = Math.max(1, ...tasks.map(secondsOf));

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = tasks
      .map((row, index) => ({ ...row, $index: index, $seconds: secondsOf(row) }))
      .filter((row) => (statusView === 'All' || row.status === statusView)
        && (!term || [row.clientName, row.projectName, row.taskName, row.taskDisplayId, row.employeeName, row.requestType]
          .some((value) => (value || '').toLowerCase().includes(term))));
    if (sort.key) {
      const compare = SORTS[sort.key];
      list = [...list].sort((a, b) => (sort.dir === 'asc' ? compare(a, b) : compare(b, a)));
    }
    return list;
  }, [reportData, search, statusView, sort]);

  const visibleSeconds = visibleTasks.reduce((sum, row) => sum + row.$seconds, 0);
  const visibleTotalSeconds = visibleTasks.reduce((sum, row) => sum + (row.timeSpentSeconds || 0), 0);
  const isFiltered = visibleTasks.length !== tasks.length;
  const columnCount = isDateWiseReport ? 6 : 8;

  // Back to the first page whenever the rows change
  useEffect(() => setPage(1), [reportData, search, statusView, sort, pageSize]);

  const pageCount = Math.max(1, Math.ceil(visibleTasks.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstRow = (currentPage - 1) * pageSize;
  const pageTasks = visibleTasks.slice(firstRow, firstRow + pageSize);
  const goToPage = (value) => setPage(Math.min(Math.max(1, value), pageCount));

  // The first panel: clients when the report spans several, else the employees
  const multiClient = insights.byClient.length > 1;

  return (
    <div className="container-xxl flex-grow-1 container-p-y etr-page">
      {/* Page header */}
      <div className="etr-header">
        <div>
          <span className="etr-eyebrow"><i className="bx bx-buildings"></i> Client time</span>
          <h4 className="etr-title">Client Task Report</h4>
          <p className="etr-subtitle">Task activity and tracked hours across all of a client&apos;s projects</p>
        </div>
        {hasReportData && (
          /* No date pickers here — the report is already generated for a chosen range */
          <TableExportButtons scope="clientTaskReport" config={EXPORT_CONFIG} instance={instance} />
        )}
      </div>

      {/* Filters */}
      <div className="card etr-filters">
        <form id="reportFilterForm" onSubmit={handleSubmit}>
          <div className="etr-presets">
            <span className="etr-presets-label"><i className="bx bx-calendar-event"></i> Quick range</span>
            {PRESETS.map((preset) => (
              <button key={preset.key} type="button"
                className={'etr-preset' + (activePreset === preset.key ? ' is-active' : '')}
                onClick={() => handlePreset(preset)} disabled={isLoading}>
                {preset.label}
              </button>
            ))}
            <div className="etr-tabs ctr-mode" role="tablist" aria-label="Report type">
              {MODES.map((mode) => (
                <button key={mode.key} type="button" role="tab" aria-selected={reportModeValue === mode.key}
                  className={reportModeValue === mode.key ? 'is-active' : ''} disabled={isLoading}
                  onClick={() => handleMode(mode.key)}>
                  <i className={'bx ' + mode.icon}></i>{mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="etr-filter-grid ctr-filter-grid">
            <div className="etr-field">
              <label htmlFor="clientSelect"><i className="bx bx-buildings"></i> Client</label>
              <select className="form-select select2" id="clientSelect" name="clientSelect" defaultValue="">
                <option value="">All Clients</option>
                {clientList.map((client) => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div className="etr-field">
              <label htmlFor="projectSelect"><i className="bx bx-briefcase-alt-2"></i> Project</label>
              {/* Narrowed to the chosen client, so the two filters can't contradict */}
              <select className="form-select select2" id="projectSelect" name="projectSelect" defaultValue="">
                <option value="">All Projects</option>
                {projectList.map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div className="etr-field">
              <label htmlFor="employeeSelect"><i className="bx bx-user"></i> Employee</label>
              <select className="form-select select2" id="employeeSelect" name="employeeSelect" defaultValue="">
                <option value="">All Employees</option>
                {employeeList.map((employee) => (
                  <option key={employee._id} value={employee._id}>{employee.profile && employee.profile.firstName} {employee.profile && employee.profile.lastName}</option>
                ))}
              </select>
            </div>

            <div className="etr-field">
              <label htmlFor="statusFilter"><i className="bx bx-flag"></i> Task status</label>
              <select className="form-select" id="statusFilter" name="statusFilter" style={FULL_WIDTH}
                value={statusFilterValue} onChange={(event) => setStatusFilterValue(event.target.value)}>
                <option value="All">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Testing">Testing</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="etr-field">
              <label htmlFor="requestTypeFilter"><i className="bx bx-category"></i> Request type</label>
              <select className="form-select" id="requestTypeFilter" name="requestTypeFilter" style={FULL_WIDTH}
                value={requestTypeValue} onChange={(event) => setRequestTypeValue(event.target.value)}>
                <option value="">All Types</option>
                {TASK_REQUEST_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="etr-field etr-field-dates">
              <label htmlFor="fromDate"><i className="bx bx-calendar"></i> Date range <span className="text-danger">*</span></label>
              <div className="etr-daterange">
                <input type="date" className="form-control" id="fromDate" name="fromDate" required max={maxDate}
                  value={fromDateValue} onChange={(event) => { setFromDateValue(event.target.value); setActivePreset(null); }} />
                <i className="bx bx-right-arrow-alt"></i>
                <input type="date" className="form-control" id="toDate" name="toDate" placeholder="Today" max={maxDate}
                  value={toDateValue} onChange={(event) => { setToDateValue(event.target.value); setActivePreset(null); }} />
              </div>
            </div>

            <div className="etr-field etr-field-actions">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                <i className={`bx ${isLoading ? 'bx-loader-alt bx-spin' : 'bx-bar-chart-alt-2'} me-1`}></i> Generate
              </button>
              <button type="button" className="btn btn-outline-secondary etr-icon-btn" id="resetFilters" title="Reset filters" onClick={handleResetFilters}>
                <i className="bx bx-reset"></i>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Report Content */}
      {isLoading && <ReportLoading />}

      {!isLoading && hasReportData && (
        <>
          {/* Report context */}
          <div className="etr-context">
            <span className="etr-context-chip">
              <i className="bx bx-buildings"></i>
              {reportData.clientName || `All clients · ${reportData.clientCount} total`}
            </span>
            <span className="etr-context-chip">
              <i className="bx bx-briefcase-alt-2"></i>
              {reportData.projectName || `${reportData.projectCount} project${reportData.projectCount === 1 ? '' : 's'}`}
            </span>
            <span className="etr-context-chip">
              <i className="bx bx-calendar"></i>{formatDate(reportData.fromDate)} — {formatDate(reportData.toDate)}
              <em>{insights.days} day{insights.days === 1 ? '' : 's'}</em>
            </span>
            <span className="etr-context-chip">
              <i className={'bx ' + (isDateWiseReport ? 'bx-calendar' : 'bx-list-ul')}></i>
              {isDateWiseReport ? 'Date-wise hours' : 'Task summary'}
            </span>
          </div>

          {/* KPI tiles */}
          <div className="etr-kpis">
            {isDateWiseReport ? (
              <>
                <KpiTile tone="green" icon="bx-stopwatch" label="Hours logged" value={reportData.totalHours}
                  caption={insights.workedDays ? `≈ ${formatHours(insights.seconds / insights.workedDays)} per worked day` : 'In the selected range'} />
                <KpiTile tone="indigo" icon="bx-calendar-check" label="Days worked" value={insights.workedDays}
                  caption={`of ${insights.days} day${insights.days === 1 ? '' : 's'} in range`} />
              </>
            ) : (
              <>
                <KpiTile tone="green" icon="bx-stopwatch" label="Time in range" value={reportData.totalDailyTimeSpent}
                  caption={insights.days > 1 ? `≈ ${formatHours(insights.seconds / insights.days)} per day` : 'Logged in the selected range'} />
                <KpiTile tone="indigo" icon="bx-time" label="Total time spent" value={reportData.totalTimeSpent} caption="Lifetime on these tasks" />
              </>
            )}
            <KpiTile tone="cyan" icon="bx-task" label="Tasks worked" value={insights.taskCount}
              caption={isDateWiseReport ? `${tasks.length} day entries` : `${insights.statusCounts.Completed} completed`} />
            <KpiTile tone="violet" icon="bx-group" label="Employees" value={insights.byEmployee.length}
              caption={`${insights.byProject.length} project${insights.byProject.length === 1 ? '' : 's'}`} />
            <KpiTile tone="amber" icon="bx-trophy" label={multiClient ? 'Top client' : 'Client'}
              value={insights.topClient ? formatHours(insights.topClient.seconds) : '—'}
              caption={insights.topClient ? insights.topClient.name : 'No time logged yet'} />
          </div>

          {/* Insights */}
          <div className="row g-3 mb-3">
            {multiClient && (
              <div className="col-lg-4">
                <div className="card h-100 etr-panel">
                  <div className="etr-panel-head">
                    <h6><i className="bx bx-buildings"></i> Time by client</h6>
                    <span>{insights.byClient.length} clients</span>
                  </div>
                  <RankedBars rows={insights.byClient} limit={6} unit="entry" emptyText="No time logged in this range." />
                </div>
              </div>
            )}
            <div className={multiClient ? 'col-lg-4' : 'col-lg-6'}>
              <div className="card h-100 etr-panel">
                <div className="etr-panel-head">
                  <h6><i className="bx bx-briefcase-alt-2"></i> Time by project</h6>
                  <span>In range</span>
                </div>
                <RankedBars rows={insights.byProject} limit={6} unit="entry" emptyText="No time logged in this range." />
              </div>
            </div>
            <div className={multiClient ? 'col-lg-4' : 'col-lg-6'}>
              <div className="card h-100 etr-panel">
                <div className="etr-panel-head">
                  <h6><i className="bx bx-user-check"></i> Time by employee</h6>
                  <span>In range</span>
                </div>
                <RankedBars rows={insights.byEmployee} limit={6} unit="entry" withAvatar emptyText="No time logged in this range." />
              </div>
            </div>
          </div>

          {/* Report table */}
          <div className="card etr-table-card">
            <div className="etr-table-toolbar">
              <div className="ctr-toolbar-left">
                <div className="etr-search">
                  <i className="bx bx-search"></i>
                  <input type="search" placeholder="Search client, project, task or employee…" value={search}
                    onChange={(event) => setSearch(event.target.value)} />
                </div>
                {!isDateWiseReport && (
                  <div className="etr-tabs" role="tablist">
                    {['All', ...STATUSES.map((s) => s.key)].filter((key) => key === 'All' || insights.statusCounts[key]).map((key) => (
                      <button key={key} type="button" role="tab" aria-selected={statusView === key}
                        className={statusView === key ? 'is-active' : ''} onClick={() => setStatusView(key)}>
                        {key}<b>{key === 'All' ? tasks.length : insights.statusCounts[key]}</b>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals of every row that matches the search and status tab, across all pages */}
              <div className="ctr-totals" title={isFiltered ? `${visibleTasks.length} of ${tasks.length} rows match` : `All ${tasks.length} rows`}>
                <span className="ctr-totals-label">
                  <i className="bx bx-calculator"></i>
                  <span>
                    Total
                    <small>{isFiltered ? `${visibleTasks.length} of ${tasks.length} rows` : `${tasks.length} rows`}</small>
                  </span>
                </span>
                <span className="ctr-totals-figure is-range">
                  <small>{isDateWiseReport ? 'Hours logged' : 'In range'}</small>
                  <b>
                    {isFiltered
                      ? formatHours(visibleSeconds)
                      : (isDateWiseReport ? reportData.totalHours : reportData.totalDailyTimeSpent)}
                  </b>
                </span>
                {!isDateWiseReport && (
                  <span className="ctr-totals-figure is-total">
                    <small>Total time</small>
                    <b>{isFiltered ? formatHours(visibleTotalSeconds) : reportData.totalTimeSpent}</b>
                  </span>
                )}
              </div>
            </div>

            <div className="table-responsive ctr-table-wrap">
              <table className="table etr-table" id="reportTable">
                <thead>
                  <tr>
                    <th className="etr-col-no">#</th>
                    {isDateWiseReport
                      ? <SortHeader label="Date" sortKey="day" sort={sort} onSort={handleSort} />
                      : <th>Date</th>}
                    <SortHeader label="Client / Project" sortKey="client" sort={sort} onSort={handleSort} />
                    <SortHeader label="Task" sortKey="task" sort={sort} onSort={handleSort} />
                    <SortHeader label="Employee" sortKey="employee" sort={sort} onSort={handleSort} />
                    <SortHeader label={isDateWiseReport ? 'Hours' : 'Time in range'} sortKey="range" sort={sort} onSort={handleSort} />
                    {!isDateWiseReport && <SortHeader label="Total time" sortKey="total" sort={sort} onSort={handleSort} />}
                    {!isDateWiseReport && <SortHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />}
                  </tr>
                </thead>
                <tbody>
                  {pageTasks.map((task, index) => (
                    <tr key={task.$index}>
                      <td className="etr-col-no">{firstRow + index + 1}</td>
                      <td className="text-nowrap etr-date">
                        {isDateWiseReport ? (
                          <span className="ctr-day">{dayLabel(task.day)}<small>{moment(task.day, 'YYYY-MM-DD').format('dddd')}</small></span>
                        ) : formatDateRangeLabel(task.workDateFrom, task.workDateTo)}
                      </td>
                      <td>
                        <div className="ctr-where">
                          <strong title={task.clientName}>{task.clientName || 'No Client'}</strong>
                          <span className="ctr-project" title={task.projectName}>
                            <i style={{ background: colorFor(task.projectName || '?') }}></i>{task.projectName}
                          </span>
                        </div>
                      </td>
                      <td className="ctr-task">
                        <span className="ctr-task-name" title={task.taskName}>{task.taskName}</span>
                        {((task.taskDisplayId && task.taskDisplayId !== '-') || task.requestType) && (
                          <span className="ctr-task-meta">
                            {task.taskDisplayId && task.taskDisplayId !== '-' && <small>{task.taskDisplayId}</small>}
                            {task.requestType && <TaskRequestTypeBadge requestType={task.requestType} />}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="etr-person">
                          <Avatar name={task.employeeName || 'Unassigned'} />
                          <span>{task.employeeName || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="etr-time">
                          <b>{isDateWiseReport ? task.hours : task.dailyTimeSpent}</b>
                          <span className="etr-time-bar">
                            <span style={{ width: `${task.$seconds / maxRowSeconds * 100}%` }}></span>
                          </span>
                        </div>
                      </td>
                      {!isDateWiseReport && <td className="etr-total">{task.timeSpent}</td>}
                      {!isDateWiseReport && <td><span className={`etr-pill s-${statusClass(task.status)}`}>{task.status}</span></td>}
                    </tr>
                  ))}
                  {!visibleTasks.length && (
                    <tr>
                      <td colSpan={columnCount} className="etr-no-match">
                        <i className="bx bx-filter-alt"></i> No tasks match your search.
                        <button type="button" onClick={() => { setSearch(''); setStatusView('All'); }}>Clear</button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  {visibleTasks.length > 0 && (
                    <tr className="ctr-pager-row">
                      <td colSpan={columnCount}>
                        <div className="ctr-pager">
                          <span className="ctr-pager-info">
                            Showing <b>{firstRow + 1}–{firstRow + pageTasks.length}</b> of <b>{visibleTasks.length}</b>
                          </span>

                          {pageCount > 1 && (
                            <nav className="ctr-pages" aria-label="Pages">
                              <button type="button" className="ctr-page is-arrow" disabled={currentPage === 1}
                                onClick={() => goToPage(currentPage - 1)} aria-label="Previous page">
                                <i className="bx bx-chevron-left"></i>
                              </button>
                              {pageItems(currentPage, pageCount).map((item) => (
                                typeof item === 'number' ? (
                                  <button key={item} type="button" className={'ctr-page' + (item === currentPage ? ' is-active' : '')}
                                    aria-current={item === currentPage ? 'page' : undefined} onClick={() => goToPage(item)}>
                                    {item}
                                  </button>
                                ) : <span key={item} className="ctr-page-gap">…</span>
                              ))}
                              <button type="button" className="ctr-page is-arrow" disabled={currentPage === pageCount}
                                onClick={() => goToPage(currentPage + 1)} aria-label="Next page">
                                <i className="bx bx-chevron-right"></i>
                              </button>
                            </nav>
                          )}

                          <label className="ctr-pager-size">
                            Rows
                            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                            </select>
                          </label>
                        </div>
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {!isLoading && !hasReportData && showEmptyState && (
        <div className="card etr-empty">
          <div className="etr-empty-art"><i className="bx bx-calendar-x"></i></div>
          <h5>No activity found</h5>
          <p>{emptyMessage || 'Please select filters and generate the report.'}</p>
          <div className="etr-empty-actions">
            {PRESETS.filter((preset) => ['month', '30d'].includes(preset.key)).map((preset) => (
              <button key={preset.key} type="button" className="etr-preset" onClick={() => handlePreset(preset)}>
                Try {preset.label.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !hasReportData && !showEmptyState && (
        <div className="card etr-empty">
          <div className="etr-empty-art"><i className="bx bx-bar-chart-alt-2"></i></div>
          <h5>Generate a report</h5>
          <p>Pick a quick range above, or set the filters and press Generate.</p>
        </div>
      )}
    </div>
  );
}
