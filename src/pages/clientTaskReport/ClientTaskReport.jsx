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
import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import TaskRequestTypeBadge from '../../components/TaskRequestTypeBadge';
import { TASK_REQUEST_TYPES } from '../../lib/taskRequestType';
import { toFileNameSlug, formatDateRangeLabel } from '../../lib/tableExport';
import {
  REPORT_MODES,
  CLIENT_SUMMARY_COLUMNS,
  DATE_WISE_CLIENT_COLUMNS,
  toDateWiseRows
} from '../../lib/taskDailyHours';
import { ReportLoading, ReportEmptyState } from '../employeeTaskReport/ReportStates';
import { getStatusBadge, hasReportTasks, getReportRangeLabel, formatDate } from '../employeeTaskReport/utility';

const FULL_WIDTH = { width: '100%' };
const TOTAL_FONT = { fontSize: '1.1rem' };
const BIG_FONT = { fontSize: '1.25rem' };

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

  const instance = { reportData };
  const hasReportData = hasReportTasks(reportData);
  const isDateWiseReport = isDateWise(instance);

  /** Only the chosen client's projects, so the two filters can't contradict. */
  const projectList = selectedClientId ? allProjects.filter(p => p.clientId === selectedClientId) : allProjects;

  /** Per-client subtotals are only worth showing when more than one appears. */
  const showClientSummaries = reportData && reportData.clientSummaries && reportData.clientSummaries.length > 1;

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
    $('#clientSelect').select2({ placeholder: 'All Clients', allowClear: true, width: '100%' });
    $('#projectSelect').select2({ placeholder: 'All Projects', allowClear: true, width: '100%' });
    $('#employeeSelect').select2({ placeholder: 'All Employees', allowClear: true, width: '100%' });

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
      $('#clientSelect, #projectSelect, #employeeSelect').select2('destroy');
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    const clientId = $('#clientSelect').val() || null;
    const projectId = $('#projectSelect').val() || null;
    const employeeId = $('#employeeSelect').val() || null;
    const statusFilter = statusFilterValue || 'All';
    const requestType = requestTypeValue || null;
    const mode = reportModeValue || REPORT_MODES.summary;

    const fromDateStr = fromDateValue;
    if (!fromDateStr) {
      toastr.error('From date is required');
      return;
    }
    const toDateStr = toDateValue || fromDateStr;

    if (moment(fromDateStr).isAfter(moment(toDateStr))) {
      toastr.error('From date cannot be after To date');
      return;
    }

    const fromDate = moment(fromDateStr, 'YYYY-MM-DD').startOf('day').toDate();
    const toDate = moment(toDateStr, 'YYYY-MM-DD').endOf('day').toDate();

    setIsLoading(true);
    setShowEmptyState(false);
    setReportData(null);

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

    setReportData(null);
    setShowEmptyState(false);
    setEmptyMessage('');

    toastr.info('Filters reset');
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Client Task Report</h4>
          <p className="text-muted mb-0">Task activity and tracked hours across all of a client&apos;s projects</p>
        </div>
        <div className="d-flex gap-2">
          {hasReportData && (
            /* No date pickers here — the report is already generated for a chosen range */
            <TableExportButtons scope="clientTaskReport" config={EXPORT_CONFIG} instance={instance} />
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="card mb-4">
        <div className="card-body">
          <form id="reportFilterForm" onSubmit={handleSubmit}>
            <div className="row g-3 align-items-end">
              <div className="col-md-2">
                <label htmlFor="clientSelect" className="form-label">Client</label>
                <select className="form-select select2" id="clientSelect" name="clientSelect" defaultValue="">
                  <option value="">All Clients</option>
                  {clientList.map((client) => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label htmlFor="projectSelect" className="form-label">Project</label>
                {/* Narrowed to the chosen client, so the two filters can't contradict */}
                <select className="form-select select2" id="projectSelect" name="projectSelect" defaultValue="">
                  <option value="">All Projects</option>
                  {projectList.map((project) => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label htmlFor="employeeSelect" className="form-label">Employee</label>
                <select className="form-select select2" id="employeeSelect" name="employeeSelect" defaultValue="">
                  <option value="">All Employees</option>
                  {employeeList.map((employee) => (
                    <option key={employee._id} value={employee._id}>{employee.profile && employee.profile.firstName} {employee.profile && employee.profile.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label htmlFor="statusFilter" className="form-label">Task Status</label>
                <select className="form-select" id="statusFilter" name="statusFilter" style={FULL_WIDTH}
                  value={statusFilterValue} onChange={(event) => setStatusFilterValue(event.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Testing">Testing</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="col-md-2">
                <label htmlFor="requestTypeFilter" className="form-label">Request Type</label>
                <select className="form-select" id="requestTypeFilter" name="requestTypeFilter" style={FULL_WIDTH}
                  value={requestTypeValue} onChange={(event) => setRequestTypeValue(event.target.value)}>
                  <option value="">All Types</option>
                  {TASK_REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label htmlFor="reportMode" className="form-label">Report type</label>
                <select className="form-select" id="reportMode" name="reportMode" style={FULL_WIDTH}
                  value={reportModeValue} onChange={(event) => setReportModeValue(event.target.value)}>
                  <option value="summary">Task summary</option>
                  <option value="dateWise">Date-wise hours</option>
                </select>
              </div>

              <div className="col-md-2">
                <label htmlFor="fromDate" className="form-label">From <span className="text-danger">*</span></label>
                <input type="date" className="form-control" id="fromDate" name="fromDate" required max={maxDate}
                  value={fromDateValue} onChange={(event) => setFromDateValue(event.target.value)} />
              </div>

              <div className="col-md-2">
                <label htmlFor="toDate" className="form-label">To</label>
                <input type="date" className="form-control" id="toDate" name="toDate" placeholder="Today" max={maxDate}
                  value={toDateValue} onChange={(event) => setToDateValue(event.target.value)} />
              </div>

              <div className="col-md-2">
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary flex-fill">
                    <i className="bx bx-search me-1"></i> Generate
                  </button>
                  <button type="button" className="btn btn-outline-secondary" id="resetFilters" onClick={handleResetFilters}>
                    <i className="bx bx-reset"></i>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Report Content */}
      {isLoading && <ReportLoading />}

      {!isLoading && hasReportData && (
        <>
          {/* Report Header */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <h6 className="text-muted mb-1">Client</h6>
                  {reportData.clientName ? (
                    <p className="mb-0 fw-bold">{reportData.clientName}</p>
                  ) : (
                    <p className="mb-0 fw-bold">All Clients ({reportData.clientCount} total)</p>
                  )}
                </div>
                <div className="col-md-3">
                  <h6 className="text-muted mb-1">Projects</h6>
                  <p className="mb-0 fw-bold">
                    {reportData.projectName ? reportData.projectName : `${reportData.projectCount} project(s)`}
                  </p>
                </div>
                <div className="col-md-3">
                  <h6 className="text-muted mb-1">Date Range</h6>
                  <p className="mb-0 fw-bold">{formatDate(reportData.fromDate)} — {formatDate(reportData.toDate)}</p>
                </div>
                {isDateWiseReport ? (
                  <div className="col-md-3">
                    <h6 className="text-muted mb-1">Total Hours</h6>
                    <p className="mb-0 fw-bold text-success" style={BIG_FONT}>{reportData.totalHours}</p>
                  </div>
                ) : (
                  <>
                    <div className="col-md-3">
                      <h6 className="text-muted mb-1">Time in Range</h6>
                      <p className="mb-0 fw-bold text-success" style={BIG_FONT}>{reportData.totalDailyTimeSpent}</p>
                    </div>
                    <div className="col-md-3">
                      <h6 className="text-muted mb-1">Total Time Spent</h6>
                      <p className="mb-0 fw-bold text-primary" style={BIG_FONT}>{reportData.totalTimeSpent}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Per-client subtotals, when the report spans more than one client */}
          {showClientSummaries && (
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">By Client</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Client</th>
                        <th className="text-center" style={{ width: '15%' }}>Tasks</th>
                        <th className="text-end" style={{ width: '20%' }}>{isDateWiseReport ? 'Hours' : 'Time in Range'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.clientSummaries.map((summary, index) => (
                        <tr key={index}>
                          <td>{summary.clientName}</td>
                          <td className="text-center">{summary.taskCount}</td>
                          <td className="text-end fw-semibold text-success">{summary.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Report Table */}
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                {isDateWiseReport ? (
                  <table className="table table-hover table-bordered" id="reportTable">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '5%' }}>Sl No</th>
                        <th style={{ width: '11%' }}>Date</th>
                        <th style={{ width: '14%' }}>Client</th>
                        <th style={{ width: '14%' }}>Project</th>
                        <th style={{ width: '22%' }}>Task</th>
                        <th style={{ width: '11%' }}>Request Type</th>
                        <th style={{ width: '14%' }}>Employee</th>
                        <th style={{ width: '9%' }}>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.tasks.map((task, index) => (
                        <tr key={index}>
                          <td className="text-center">{index + 1}</td>
                          <td className="text-nowrap">{dayLabel(task.day)}</td>
                          <td>{task.clientName}</td>
                          <td>{task.projectName}</td>
                          <td>{task.taskName}</td>
                          <td><TaskRequestTypeBadge requestType={task.requestType} fallback="-" /></td>
                          <td>{task.employeeName}</td>
                          <td className="fw-semibold text-success">{task.hours}</td>
                        </tr>
                      ))}
                      <tr className="table-primary fw-bold">
                        <td colSpan="7" className="text-end">Total:</td>
                        <td className="text-start text-success" style={TOTAL_FONT}>{reportData.totalHours}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <table className="table table-hover table-bordered" id="reportTable">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '5%' }}>Sl No</th>
                        <th style={{ width: '10%' }}>Date</th>
                        <th style={{ width: '12%' }}>Client</th>
                        <th style={{ width: '11%' }}>Project</th>
                        <th style={{ width: '17%' }}>Task Name</th>
                        <th style={{ width: '10%' }}>Request Type</th>
                        <th style={{ width: '11%' }}>Employee</th>
                        <th style={{ width: '8%' }}>Time in Range</th>
                        <th style={{ width: '8%' }}>Total Time</th>
                        <th style={{ width: '8%' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.tasks.map((task, index) => (
                        <tr key={index}>
                          <td className="text-center">{index + 1}</td>
                          <td className="text-nowrap">{formatDateRangeLabel(task.workDateFrom, task.workDateTo)}</td>
                          <td>{task.clientName}</td>
                          <td>{task.projectName}</td>
                          <td>{task.taskName}</td>
                          <td><TaskRequestTypeBadge requestType={task.requestType} fallback="-" /></td>
                          <td>{task.employeeName}</td>
                          <td className="fw-semibold text-success">{task.dailyTimeSpent}</td>
                          <td className="fw-semibold">{task.timeSpent}</td>
                          <td>
                            <span className={`badge ${getStatusBadge(task.status)}`}>{task.status}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="table-primary fw-bold">
                        <td colSpan="7" className="text-end">Total:</td>
                        <td className="text-start text-success" style={TOTAL_FONT}>{reportData.totalDailyTimeSpent}</td>
                        <td className="text-start" style={TOTAL_FONT}>{reportData.totalTimeSpent}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {!isLoading && !hasReportData && showEmptyState && <ReportEmptyState message={emptyMessage} />}

    </div>
  );
}
