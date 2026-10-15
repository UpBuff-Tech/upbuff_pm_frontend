/**
 * Project Task Employee Analysis: employee task activity and time tracking for a date range.
 */
import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import { colorFor, initialsOf } from '../../components/detailModal/DetailModal';
import { toFileNameSlug, formatDateRangeLabel } from '../../lib/tableExport';
import { ReportLoading } from './ReportStates';
import { hasReportTasks, getReportRangeLabel, formatDate } from './utility';
import './employeeTaskReport.css';
import { destroySelect2 } from '../../lib/destroySelect2';

// Mirrors the on-screen report table, totals row included.
const EXPORT_COLUMNS = [
  { header: 'Sl No', value: r => r.slNo },
  { header: 'Date', value: r => r.workDate },
  { header: 'Employee Name', value: r => r.employeeName },
  { header: 'Project', value: r => r.projectName },
  { header: 'Task Name', value: r => r.taskName },
  { header: 'Time in Range', value: r => r.dailyTimeSpent },
  { header: 'Total Time Spent', value: r => r.timeSpent },
  { header: 'Task Status', value: r => r.status }
];

const STATUSES = [
  { key: 'Pending', cls: 'pending' },
  { key: 'In Progress', cls: 'inprogress' },
  { key: 'Testing', cls: 'testing' },
  { key: 'On Hold', cls: 'onhold' },
  { key: 'Completed', cls: 'completed' },
];
const statusClass = (status) => (STATUSES.find((s) => s.key === status) || STATUSES[0]).cls;

// Quick ranges: each returns [from, to] as YYYY-MM-DD
const PRESETS = [
  { key: 'today', label: 'Today', range: () => [moment(), moment()] },
  { key: 'yesterday', label: 'Yesterday', range: () => [moment().subtract(1, 'day'), moment().subtract(1, 'day')] },
  { key: 'week', label: 'This week', range: () => [moment().startOf('isoWeek'), moment()] },
  { key: '7d', label: 'Last 7 days', range: () => [moment().subtract(6, 'days'), moment()] },
  { key: 'month', label: 'This month', range: () => [moment().startOf('month'), moment()] },
  { key: '30d', label: 'Last 30 days', range: () => [moment().subtract(29, 'days'), moment()] },
];

const SORTS = {
  employee: (a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''),
  project: (a, b) => (a.projectName || '').localeCompare(b.projectName || ''),
  task: (a, b) => (a.taskName || '').localeCompare(b.taskName || ''),
  range: (a, b) => (a.dailyTimeSpentSeconds || 0) - (b.dailyTimeSpentSeconds || 0),
  total: (a, b) => (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0),
  status: (a, b) => (a.status || '').localeCompare(b.status || ''),
};

/**
 * The date(s) a task's in-range time was actually logged on. Shared by the
 * table, the Excel export and the PDF so all three read the same.
 */
function taskWorkDateLabel(task) {
  return formatDateRangeLabel(task.workDateFrom, task.workDateTo);
}

/** 5400 -> "1h 30m" (short form for tiles and bars) */
function formatHours(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return total ? `${total}s` : '0m';
}

/**
 * Flatten the generated report into export rows.
 *
 * There is no date filter on this export — the report was already generated for
 * a chosen range, so the rows are exported exactly as shown, closing with the
 * same totals row so the exported figures foot to the report on screen.
 */
function getReportRowsForExport(instance) {
  const data = instance.reportData;
  if (!data || !data.tasks || !data.tasks.length) return [];

  const rows = data.tasks.map((task, index) => ({
    slNo: index + 1,
    workDate: taskWorkDateLabel(task),
    // Per-employee reports carry the name on the report, not on each task.
    employeeName: task.employeeName || data.employeeName || '',
    projectName: task.projectName || '',
    taskName: task.taskName || '',
    dailyTimeSpent: task.dailyTimeSpent || '',
    timeSpent: task.timeSpent || '',
    status: task.status || ''
  }));

  rows.push({
    slNo: '',
    workDate: '',
    employeeName: 'Total',
    projectName: '',
    taskName: '',
    dailyTimeSpent: data.totalDailyTimeSpent || '',
    timeSpent: data.totalTimeSpent || '',
    status: ''
  });

  return rows;
}

function getReportScopeName(instance) {
  const data = instance.reportData || {};
  return data.employeeName || 'All Employees';
}

// No dateFilter: the report already covers a chosen range, so the buttons
// export straight away instead of opening the date dialog.
// Every function receives `instance` = { reportData }.
const EXPORT_CONFIG = {
  scope: 'employeeTaskReport',
  columns: EXPORT_COLUMNS,
  rows: getReportRowsForExport,
  fileName: instance =>
    `employee_task_report_${toFileNameSlug(getReportScopeName(instance), 'all_employees')}`
    + `_${getReportRangeLabel(instance, '_to_')}`,
  sheetName: 'Employee Task Report',
  title: 'Employee Task Report',
  subtitle: instance => `${getReportScopeName(instance)}  |  ${getReportRangeLabel(instance, ' to ')}`,
  emptyMessage: 'No data to export'
};

/** Sum the in-range seconds per key, largest first */
function groupTime(tasks, keyOf) {
  const groups = new Map();
  tasks.forEach((task) => {
    const key = keyOf(task) || 'Unknown';
    const group = groups.get(key) || { name: key, seconds: 0, tasks: 0 };
    group.seconds += task.dailyTimeSpentSeconds || 0;
    group.tasks += 1;
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => b.seconds - a.seconds);
}

/* ---------------------------------------------------------------------------
   Presentational pieces
   ------------------------------------------------------------------------- */

function Avatar({ name, size = '' }) {
  return (
    <span className={`etr-avatar ${size}`} style={{ '--c': colorFor(name || '?') }} title={name}>
      {initialsOf(name)}
    </span>
  );
}

function KpiTile({ tone, icon, label, value, caption }) {
  return (
    <div className={`etr-kpi tone-${tone}`}>
      <div className="etr-kpi-head">
        <span className="etr-kpi-icon"><i className={`bx ${icon}`}></i></span>
        <span className="etr-kpi-label">{label}</span>
      </div>
      <strong className="etr-kpi-value">{value}</strong>
      {caption && <span className="etr-kpi-caption">{caption}</span>}
    </div>
  );
}

/** Ranked horizontal bars: one hue, value labelled at the end of each bar */
function RankedBars({ rows, withAvatar, emptyText, limit = 8 }) {
  const shown = rows.slice(0, limit);
  const max = Math.max(1, ...shown.map((row) => row.seconds));
  const rest = rows.slice(limit);

  if (!shown.length) return <p className="etr-muted-note">{emptyText}</p>;

  return (
    <ul className="etr-bars">
      {shown.map((row) => (
        <li key={row.name} title={`${row.name}: ${formatHours(row.seconds)} across ${row.tasks} task${row.tasks === 1 ? '' : 's'}`}>
          <div className="etr-bars-label">
            {withAvatar && <Avatar name={row.name} size="is-sm" />}
            <span>{row.name}</span>
          </div>
          <div className="etr-bars-track">
            <span style={{ width: `${Math.max(2, row.seconds / max * 100)}%` }}></span>
          </div>
          <b>{formatHours(row.seconds)}</b>
        </li>
      ))}
      {rest.length > 0 && (
        <li className="etr-bars-more">
          + {rest.length} more · {formatHours(rest.reduce((sum, row) => sum + row.seconds, 0))}
        </li>
      )}
    </ul>
  );
}

function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey;
  return (
    <th className={className}>
      <button type="button" className={'etr-sort' + (active ? ' is-active' : '')} onClick={() => onSort(sortKey)}>
        {label}
        <i className={`bx ${active ? (sort.dir === 'asc' ? 'bx-chevron-up' : 'bx-chevron-down') : 'bx-sort-alt-2'}`}></i>
      </button>
    </th>
  );
}

export default function EmployeeTaskReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [employeeList, setEmployeeList] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');

  // The date inputs: today is the latest day that can be picked
  const [maxDate] = useState(() => moment().format('YYYY-MM-DD'));
  const [fromDateValue, setFromDateValue] = useState(maxDate);
  const [toDateValue, setToDateValue] = useState('');
  const [activePreset, setActivePreset] = useState('today');

  // Table tools (on the generated report only, nothing is fetched again)
  const [search, setSearch] = useState('');
  const [statusView, setStatusView] = useState('All');
  const [sort, setSort] = useState({ key: null, dir: 'desc' });

  const hasReportData = hasReportTasks(reportData);

  useEffect(() => {
    api.call('user.getSubordinates', (error, result) => {
      if (error) {
        console.error('Error loading employees:', error);
        toastr.error('Failed to load employee list');
      } else if (result) {
        setEmployeeList(result);
      }
    });

    api.call('project.getAllForDropdown', (error, result) => {
      if (error) {
        console.error('Error loading projects:', error);
      } else if (result) {
        setProjectList(result);
      }
    });

    // Auto-load today's data for all employees
    const timer = setTimeout(() => {
      const today = moment().startOf('day').toDate();
      setIsLoading(true);

      api.call('projectTasks.getAllEmployeesDateRangeReport', today, today, 'All', (error, result) => {
        setIsLoading(false);

        if (error) {
          console.error('Error loading initial data:', error);
          setShowEmptyState(true);
          setEmptyMessage('Error loading initial data');
        } else if (result && result.tasks && result.tasks.length > 0) {
          setReportData(result);
        } else {
          setShowEmptyState(true);
          setEmptyMessage(`No tasks found for any employee on ${moment(today).format('DD-MM-YYYY')}`);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // The three dropdowns are select2 dropdowns; their values are read from select2 on submit
  useEffect(() => {
    $('#employeeSelect').select2({ placeholder: 'Select Employee', allowClear: true, width: '100%' });
    $('#projectSelect').select2({ placeholder: 'Select Project', allowClear: true, width: '100%' });
    $('#statusFilter').select2({ placeholder: 'All Statuses', allowClear: true, width: '100%', minimumResultsForSearch: Infinity });

    return () => {
      destroySelect2('#employeeSelect, #projectSelect, #statusFilter');
    };
  }, []);

  /**
   * The callback of the three report methods: they differ only in the texts they show.
   * `successMessage` and `noDataMessage` may be functions of the result.
   */
  const showReportResult = (error, result, successMessage, noDataMessage) => {
    setIsLoading(false);
    if (error) {
      console.error('Error generating report:', error);
      toastr.error(error.reason || 'Failed to generate report');
      setShowEmptyState(true);
      setEmptyMessage('Error generating report. Please try again.');
    } else if (result && result.tasks && result.tasks.length > 0) {
      setReportData(result);
      toastr.success(typeof successMessage === 'function' ? successMessage(result) : successMessage);
    } else {
      setShowEmptyState(true);
      setEmptyMessage(noDataMessage);
      toastr.info('No data found for the selected criteria');
    }
  };

  /** Fetch the report for the filters on screen and the given dates (YYYY-MM-DD) */
  const generateReport = (fromDateStr, toDateInput) => {
    const employeeId = $('#employeeSelect').val();
    const projectId = $('#projectSelect').val();
    const statusFilter = $('#statusFilter').val() || 'All';

    if (!fromDateStr) {
      toastr.error('From date is required');
      return;
    }

    // Default to same as fromDate if To date is not selected
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

    const statusText = statusFilter !== 'All' ? ` with status "${statusFilter}"` : '';

    if (projectId) {
      api.call('projectTasks.getProjectDateRangeReport', projectId, fromDate, toDate, employeeId || null, statusFilter, (error, result) => {
        showReportResult(error, result,
          'Report generated successfully',
          'No tasks found for the selected project and date range.');
      });
    } else if (employeeId) {
      api.call('projectTasks.getEmployeeDateRangeReport', employeeId, fromDate, toDate, statusFilter, (error, result) => {
        showReportResult(error, result,
          'Report generated successfully',
          `No tasks found for the selected employee and date range${statusText}.`);
      });
    } else {
      api.call('projectTasks.getAllEmployeesDateRangeReport', fromDate, toDate, statusFilter, (error, result) => {
        showReportResult(error, result,
          (report) => `Report generated for ${report.employeeCount} employees`,
          `No tasks found for any employee in the selected date range${statusText}.`);
      });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    generateReport(fromDateValue, toDateValue);
  };

  const handlePreset = (preset) => {
    const [from, to] = preset.range().map((date) => date.format('YYYY-MM-DD'));
    setFromDateValue(from);
    setToDateValue(to === from ? '' : to);
    setActivePreset(preset.key);
    generateReport(from, to);
  };

  const handleResetFilters = (event) => {
    event.preventDefault();

    const today = moment().format('YYYY-MM-DD');
    $('#employeeSelect').val('').trigger('change');
    $('#projectSelect').val('').trigger('change');
    $('#statusFilter').val('All').trigger('change');
    setFromDateValue(today);
    setToDateValue('');
    setActivePreset('today');

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
  const withEmployee = (task) => task.employeeName || (reportData && reportData.employeeName) || 'Unassigned';

  const insights = useMemo(() => {
    const rangeSeconds = tasks.reduce((sum, task) => sum + (task.dailyTimeSpentSeconds || 0), 0);
    const byEmployee = groupTime(tasks, withEmployee);
    const byProject = groupTime(tasks, (task) => task.projectName);
    const statusCounts = Object.fromEntries(STATUSES.map((s) => [s.key, tasks.filter((t) => t.status === s.key).length]));
    const days = reportData ? Math.max(1, moment(reportData.toDate).startOf('day').diff(moment(reportData.fromDate).startOf('day'), 'days') + 1) : 1;
    const top = byEmployee[0];
    return {
      rangeSeconds,
      byEmployee,
      byProject,
      statusCounts,
      days,
      employees: byEmployee.length,
      avgPerEmployee: byEmployee.length ? rangeSeconds / byEmployee.length : 0,
      topEmployee: top && top.seconds > 0 ? top : null,
    };
  }, [reportData]);

  const maxRowSeconds = Math.max(1, ...tasks.map((task) => task.dailyTimeSpentSeconds || 0));

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = tasks
      .map((task, index) => ({ ...task, $index: index }))
      .filter((task) => (statusView === 'All' || task.status === statusView)
        && (!term || [withEmployee(task), task.projectName, task.taskName, task.taskDisplayId]
          .some((value) => (value || '').toLowerCase().includes(term))));
    if (sort.key) {
      const compare = SORTS[sort.key];
      list = [...list].sort((a, b) => (sort.dir === 'asc' ? compare(a, b) : compare(b, a)));
    }
    return list;
  }, [reportData, search, statusView, sort]);

  const visibleRangeSeconds = visibleTasks.reduce((sum, task) => sum + (task.dailyTimeSpentSeconds || 0), 0);
  const visibleTotalSeconds = visibleTasks.reduce((sum, task) => sum + (task.timeSpentSeconds || 0), 0);
  const isFiltered = visibleTasks.length !== tasks.length;

  return (
    <div className="container-xxl flex-grow-1 container-p-y etr-page">
      {/* Page header */}
      <div className="etr-header">
        <div>
          <span className="etr-eyebrow"><i className="bx bx-time-five"></i> Time tracking</span>
          <h4 className="etr-title">Employee Task Report</h4>
          <p className="etr-subtitle">See who worked on what, and how long, for any date range.</p>
        </div>
        {hasReportData && (
          /* No date pickers here — the report is already generated for a chosen range */
          <TableExportButtons scope="employeeTaskReport" config={EXPORT_CONFIG} instance={{ reportData }} />
        )}
      </div>

      {/* Filters */}
      <div className="card etr-filters">
        <form id="reportFilterForm" onSubmit={handleSubmit}>
          <div className="etr-presets">
            <span className="etr-presets-label"><i className="bx bx-calendar-event"></i> Quick range</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={'etr-preset' + (activePreset === preset.key ? ' is-active' : '')}
                onClick={() => handlePreset(preset)}
                disabled={isLoading}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="etr-filter-grid">
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
              <label htmlFor="projectSelect"><i className="bx bx-briefcase-alt-2"></i> Project</label>
              <select className="form-select select2" id="projectSelect" name="projectSelect" defaultValue="">
                <option value="">All Projects</option>
                {projectList.map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div className="etr-field">
              <label htmlFor="statusFilter"><i className="bx bx-flag"></i> Task status</label>
              <select className="form-select" id="statusFilter" name="statusFilter" style={{ width: '100%' }} defaultValue="All">
                <option value="All">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Testing">Testing</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
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
              {reportData.employeeName ? <Avatar name={reportData.employeeName} size="is-xs" /> : <i className="bx bx-group"></i>}
              {reportData.employeeName || `All employees · ${reportData.employeeCount} total`}
            </span>
            {reportData.projectName && (
              <span className="etr-context-chip"><i className="bx bx-briefcase-alt-2"></i>{reportData.projectName}</span>
            )}
            <span className="etr-context-chip">
              <i className="bx bx-calendar"></i>{formatDate(reportData.fromDate)} — {formatDate(reportData.toDate)}
              <em>{insights.days} day{insights.days === 1 ? '' : 's'}</em>
            </span>
          </div>

          {/* KPI tiles */}
          <div className="etr-kpis">
            <KpiTile tone="green" icon="bx-stopwatch" label="Time in range" value={reportData.totalDailyTimeSpent}
              caption={insights.days > 1 ? `≈ ${formatHours(insights.rangeSeconds / insights.days)} per day` : 'Logged in the selected range'} />
            <KpiTile tone="indigo" icon="bx-time" label="Total time spent" value={reportData.totalTimeSpent} caption="Lifetime on these tasks" />
            <KpiTile tone="cyan" icon="bx-task" label="Tasks worked" value={tasks.length}
              caption={`${insights.statusCounts.Completed} completed`} />
            <KpiTile tone="violet" icon="bx-group" label="Employees" value={insights.employees}
              caption={`≈ ${formatHours(insights.avgPerEmployee)} each`} />
            <KpiTile tone="amber" icon="bx-trophy" label="Most time logged"
              value={insights.topEmployee ? formatHours(insights.topEmployee.seconds) : '—'}
              caption={insights.topEmployee ? insights.topEmployee.name : 'No time logged yet'} />
          </div>

          {/* Insights */}
          <div className="row g-3 mb-3">
            <div className="col-lg-5">
              <div className="card h-100 etr-panel">
                <div className="etr-panel-head">
                  <h6><i className="bx bx-user-check"></i> Time by employee</h6>
                  <span>In range</span>
                </div>
                <RankedBars rows={insights.byEmployee} withAvatar emptyText="No time logged in this range." />
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card h-100 etr-panel">
                <div className="etr-panel-head">
                  <h6><i className="bx bx-briefcase-alt-2"></i> Time by project</h6>
                  <span>In range</span>
                </div>
                <RankedBars rows={insights.byProject} limit={6} emptyText="No time logged in this range." />
              </div>
            </div>
            <div className="col-lg-3">
              <div className="card h-100 etr-panel">
                <div className="etr-panel-head">
                  <h6><i className="bx bx-pie-chart-alt-2"></i> Task status</h6>
                  <span>{tasks.length} tasks</span>
                </div>
                <div className="etr-status">
                  <div className="etr-status-stack">
                    {STATUSES.filter((s) => insights.statusCounts[s.key]).map((s) => (
                      <span key={s.key} className={`s-${s.cls}`}
                        style={{ width: `${insights.statusCounts[s.key] / tasks.length * 100}%` }}
                        title={`${s.key}: ${insights.statusCounts[s.key]}`}></span>
                    ))}
                  </div>
                  <ul className="etr-status-list">
                    {STATUSES.map((s) => (
                      <li key={s.key} className={insights.statusCounts[s.key] ? '' : 'is-zero'}>
                        <i className={`s-${s.cls}`}></i>
                        <span>{s.key}</span>
                        <b>{insights.statusCounts[s.key]}</b>
                        <em>{Math.round(insights.statusCounts[s.key] / tasks.length * 100)}%</em>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Report table */}
          <div className="card etr-table-card">
            <div className="etr-table-toolbar">
              <div className="etr-search">
                <i className="bx bx-search"></i>
                <input type="search" placeholder="Search employee, project or task…" value={search}
                  onChange={(event) => setSearch(event.target.value)} />
              </div>
              <div className="etr-tabs" role="tablist">
                {['All', ...STATUSES.map((s) => s.key)].filter((key) => key === 'All' || insights.statusCounts[key]).map((key) => (
                  <button key={key} type="button" role="tab" aria-selected={statusView === key}
                    className={statusView === key ? 'is-active' : ''} onClick={() => setStatusView(key)}>
                    {key}<b>{key === 'All' ? tasks.length : insights.statusCounts[key]}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="table-responsive etr-table-wrap">
              <table className="table etr-table" id="reportTable">
                <thead>
                  <tr>
                    <th className="etr-col-no">#</th>
                    <th>Date</th>
                    <SortHeader label="Employee" sortKey="employee" sort={sort} onSort={handleSort} />
                    <SortHeader label="Project" sortKey="project" sort={sort} onSort={handleSort} />
                    <SortHeader label="Task" sortKey="task" sort={sort} onSort={handleSort} />
                    <SortHeader label="Time in range" sortKey="range" sort={sort} onSort={handleSort} />
                    <SortHeader label="Total time" sortKey="total" sort={sort} onSort={handleSort} />
                    <SortHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task, index) => (
                    <tr key={task.$index}>
                      <td className="etr-col-no">{index + 1}</td>
                      <td className="text-nowrap etr-date">{taskWorkDateLabel(task)}</td>
                      <td>
                        <div className="etr-person">
                          <Avatar name={withEmployee(task)} />
                          <span>{withEmployee(task)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="etr-project">
                          <i style={{ background: colorFor(task.projectName || '?') }}></i>{task.projectName}
                        </span>
                      </td>
                      <td className="etr-task">
                        <span>{task.taskName}</span>
                        {task.taskDisplayId && task.taskDisplayId !== '-' && <small>{task.taskDisplayId}</small>}
                      </td>
                      <td>
                        <div className="etr-time">
                          <b>{task.dailyTimeSpent}</b>
                          <span className="etr-time-bar">
                            <span style={{ width: `${(task.dailyTimeSpentSeconds || 0) / maxRowSeconds * 100}%` }}></span>
                          </span>
                        </div>
                      </td>
                      <td className="etr-total">{task.timeSpent}</td>
                      <td><span className={`etr-pill s-${statusClass(task.status)}`}>{task.status}</span></td>
                    </tr>
                  ))}
                  {!visibleTasks.length && (
                    <tr>
                      <td colSpan="8" className="etr-no-match">
                        <i className="bx bx-filter-alt"></i> No tasks match your search.
                        <button type="button" onClick={() => { setSearch(''); setStatusView('All'); }}>Clear</button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" className="text-end">
                      {isFiltered ? `Total (${visibleTasks.length} of ${tasks.length} tasks shown)` : 'Total'}
                    </td>
                    <td className="etr-foot-range">{isFiltered ? formatHours(visibleRangeSeconds) : reportData.totalDailyTimeSpent}</td>
                    <td className="etr-foot-total">{isFiltered ? formatHours(visibleTotalSeconds) : reportData.totalTimeSpent}</td>
                    <td></td>
                  </tr>
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
            {PRESETS.filter((preset) => ['7d', 'month'].includes(preset.key)).map((preset) => (
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
