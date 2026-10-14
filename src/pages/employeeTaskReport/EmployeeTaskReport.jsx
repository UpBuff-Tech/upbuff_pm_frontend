/**
 * Project Task Employee Analysis: employee task activity and time tracking for a date range.
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import { toFileNameSlug, formatDateRangeLabel } from '../../lib/tableExport';
import { ReportLoading, ReportEmptyState } from './ReportStates';
import { getStatusBadge, hasReportTasks, getReportRangeLabel, formatDate } from './utility';

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

const TOTAL_FONT = { fontSize: '1.1rem' };
const BIG_FONT = { fontSize: '1.25rem' };

/**
 * The date(s) a task's in-range time was actually logged on. Shared by the
 * table, the Excel export and the PDF so all three read the same.
 */
function taskWorkDateLabel(task) {
  return formatDateRangeLabel(task.workDateFrom, task.workDateTo);
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
    $('#statusFilter').select2({ placeholder: 'All Statuses', allowClear: true, width: '100%' });

    return () => {
      $('#employeeSelect, #projectSelect, #statusFilter').select2('destroy');
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

  const handleSubmit = (event) => {
    event.preventDefault();

    const employeeId = $('#employeeSelect').val();
    const projectId = $('#projectSelect').val();
    const statusFilter = $('#statusFilter').val() || 'All';

    const fromDateStr = fromDateValue;
    if (!fromDateStr) {
      toastr.error('From date is required');
      return;
    }

    // Default to same as fromDate if To date is not selected
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

  const handleResetFilters = (event) => {
    event.preventDefault();

    const today = moment().format('YYYY-MM-DD');
    $('#employeeSelect').val('').trigger('change');
    $('#projectSelect').val('').trigger('change');
    $('#statusFilter').val('All');
    setFromDateValue(today);
    setToDateValue('');

    setReportData(null);
    setShowEmptyState(false);
    setEmptyMessage('');

    toastr.info('Filters reset');
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Project Task Employee Analysis</h4>
          <p className="text-muted mb-0">Daily report showing employee task activity and time tracking</p>
        </div>
        <div className="d-flex gap-2">
          {hasReportData && (
            /* No date pickers here — the report is already generated for a chosen range */
            <TableExportButtons scope="employeeTaskReport" config={EXPORT_CONFIG} instance={{ reportData }} />
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="card mb-4">
        <div className="card-body">
          <form id="reportFilterForm" onSubmit={handleSubmit}>
            <div className="row g-3 align-items-end">
              {/* Employee: col-md-2 */}
              <div className="col-md-2">
                <label htmlFor="employeeSelect" className="form-label">Employee</label>
                <select className="form-select select2" id="employeeSelect" name="employeeSelect" defaultValue="">
                  <option value="">All Employees</option>
                  {employeeList.map((employee) => (
                    <option key={employee._id} value={employee._id}>{employee.profile && employee.profile.firstName} {employee.profile && employee.profile.lastName}</option>
                  ))}
                </select>
              </div>

              {/* Project: col-md-2 */}
              <div className="col-md-2">
                <label htmlFor="projectSelect" className="form-label">Project</label>
                <select className="form-select select2" id="projectSelect" name="projectSelect" defaultValue="">
                  <option value="">All Projects</option>
                  {projectList.map((project) => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Status: col-md-2 */}
              <div className="col-md-2">
                <label htmlFor="statusFilter" className="form-label">Task Status</label>
                <select className="form-select" id="statusFilter" name="statusFilter" style={{ width: '100%' }} defaultValue="All">
                  <option value="All">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Testing">Testing</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* From date (always visible, mandatory) */}
              <div className="col-md-2">
                <label htmlFor="fromDate" className="form-label">From <span className="text-danger">*</span></label>
                <input type="date" className="form-control" id="fromDate" name="fromDate" required max={maxDate}
                  value={fromDateValue} onChange={(event) => setFromDateValue(event.target.value)} />
              </div>

              {/* To date (always visible, optional — defaults to today) */}
              <div className="col-md-2">
                <label htmlFor="toDate" className="form-label">To</label>
                <input type="date" className="form-control" id="toDate" name="toDate" placeholder="Today" max={maxDate}
                  value={toDateValue} onChange={(event) => setToDateValue(event.target.value)} />
              </div>

              {/* Buttons: always col-md-2 */}
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
                {reportData.employeeName ? (
                  <div className="col-md-3">
                    <h6 className="text-muted mb-1">Employee Name</h6>
                    <p className="mb-0 fw-bold">{reportData.employeeName}</p>
                  </div>
                ) : (
                  <div className="col-md-3">
                    <h6 className="text-muted mb-1">Report Type</h6>
                    <p className="mb-0 fw-bold">All Employees ({reportData.employeeCount} total)</p>
                  </div>
                )}
                {reportData.projectName && (
                  <div className="col-md-3">
                    <h6 className="text-muted mb-1">Project</h6>
                    <p className="mb-0 fw-bold">{reportData.projectName}</p>
                  </div>
                )}
                <div className="col-md-3">
                  <h6 className="text-muted mb-1">Date Range</h6>
                  <p className="mb-0 fw-bold">{formatDate(reportData.fromDate)} — {formatDate(reportData.toDate)}</p>
                </div>
                <div className="col-md-3">
                  <h6 className="text-muted mb-1">Time in Range</h6>
                  <p className="mb-0 fw-bold text-success" style={BIG_FONT}>{reportData.totalDailyTimeSpent}</p>
                </div>
                <div className="col-md-3">
                  <h6 className="text-muted mb-1">Total Time Spent</h6>
                  <p className="mb-0 fw-bold text-primary" style={BIG_FONT}>{reportData.totalTimeSpent}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Report Table */}
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover table-bordered" id="reportTable">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '5%' }}>Sl No</th>
                      <th style={{ width: '10%' }}>Date</th>
                      <th style={{ width: '16%' }}>Employee Name</th>
                      <th style={{ width: '13%' }}>Project</th>
                      <th style={{ width: '20%' }}>Task Name</th>
                      <th style={{ width: '11%' }}>Time in Range</th>
                      <th style={{ width: '11%' }}>Total Time</th>
                      <th style={{ width: '14%' }}>Task Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tasks.map((task, index) => (
                      <tr key={index}>
                        <td className="text-center">{index + 1}</td>
                        <td className="text-nowrap">{taskWorkDateLabel(task)}</td>
                        <td>{task.employeeName}</td>
                        <td>{task.projectName}</td>
                        <td>{task.taskName}</td>
                        <td className="fw-semibold text-success">{task.dailyTimeSpent}</td>
                        <td className="fw-semibold">{task.timeSpent}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(task.status)}`}>{task.status}</span>
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="table-primary fw-bold">
                      <td colSpan="5" className="text-end">Total:</td>
                      <td className="text-start text-success" style={TOTAL_FONT}>{reportData.totalDailyTimeSpent}</td>
                      <td className="text-start" style={TOTAL_FONT}>{reportData.totalTimeSpent}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!isLoading && !hasReportData && showEmptyState && <ReportEmptyState message={emptyMessage} />}

    </div>
  );
}
