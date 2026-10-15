/**
 * Client Task Page ("My Tasks"): all tasks of the client's projects, with filters, a page bar
 * and an Excel / PDF export.
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import TableExportModal from '../../components/exportButtons/TableExportModal';
import { getTaskTotalSeconds, getTaskDurationDays, formatHoursMinutes, taskDurationDays, taskTotalHours } from '../../lib/taskHours';
import { formatExportDate, TASK_DATE_FIELDS } from '../../lib/tableExport';
import { StatCardsSkeleton, TableSkeleton } from '../../components/skeleton/Skeleton';

const PROJECT_COLORS = [
  { bg: '#4f46e5', text: '#fff' },
  { bg: '#0891b2', text: '#fff' },
  { bg: '#16a34a', text: '#fff' },
  { bg: '#dc2626', text: '#fff' },
  { bg: '#d97706', text: '#fff' },
  { bg: '#64748b', text: '#fff' },
  { bg: '#e83e8c', text: '#fff' },
  { bg: '#20c997', text: '#fff' },
  { bg: '#6610f2', text: '#fff' },
  { bg: '#fd7e14', text: '#fff' },
  { bg: '#17a2b8', text: '#fff' },
  { bg: '#28a745', text: '#fff' },
];

/** The colours of a project's badge: always the same colour for the same project. */
function projectColorStyle(projectId) {
  if (!projectId) return { backgroundColor: '#6c757d', color: '#fff' };
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
  return { backgroundColor: c.bg, color: c.text };
}

// The status cards above the filters. A click on a card filters the list by that status.
const STATUS_CARDS = [
  { status: '', label: 'All Tasks', activeClass: 'border-primary shadow-sm', labelClass: 'text-muted', countClass: '' },
  { status: 'Pending', label: 'Pending', activeClass: 'border-warning shadow-sm', labelClass: 'text-warning', countClass: ' text-warning' },
  { status: 'In Progress', label: 'In Progress', activeClass: 'border-dark shadow-sm', labelClass: 'text-dark', countClass: '' },
  { status: 'Testing', label: 'Testing', activeClass: 'border-info shadow-sm', labelClass: 'text-info', countClass: ' text-info' },
  { status: 'On Hold', label: 'On Hold', activeClass: 'border-secondary shadow-sm', labelClass: 'text-muted', countClass: '' },
  { status: 'Completed', label: 'Completed', activeClass: 'border-success shadow-sm', labelClass: 'text-success', countClass: ' text-success' },
];

const STATUS_CARD_LABEL_STYLE = { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' };

// The badge colour of a task status in the table (any other status is grey).
const STATUS_BADGE_CLASSES = {
  'In Progress': 'bg-dark',
  'Pending': 'bg-label-warning',
  'Completed': 'bg-success',
  'On Hold': 'bg-label-secondary',
  'Testing': 'bg-label-info'
};

// Mirrors the on-screen table so the exported file matches what the user sees.
const EXPORT_COLUMNS = [
  { header: 'Task ID', value: t => t.taskId || '' },
  { header: 'Task Name', value: t => t.taskName || '' },
  { header: 'Project', value: t => t.projectName || '' },
  { header: 'Phase', value: t => t.phase || '-' },
  { header: 'Status', value: t => t.status || '' },
  { header: 'Duration', value: t => `${getTaskDurationDays(t)}d` },
  { header: 'Total Hours', value: t => formatHoursMinutes(getTaskTotalSeconds(t)) },
  { header: 'Responsibility', value: t => t.responsibility || '-' },
  { header: 'Baseline Start', value: t => formatExportDate(t.baselineStart) },
  { header: 'Baseline Finish', value: t => formatExportDate(t.baselineFinish) },
  { header: 'Actual Start', value: t => formatExportDate(t.actualStart) },
  { header: 'Actual Finish', value: t => formatExportDate(t.actualFinish) }
];

const PER_PAGE = 20;

export default function ClientTask() {
  const [isReady, setIsReady] = useState(false);
  const [allTasks, setAllTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  // What is typed in the search box; `searchText` follows it 300ms after the last key.
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef(null);

  // Load the projects and the tasks; the page is ready when both calls are back.
  useEffect(() => {
    let projectsDone = false;
    let tasksDone = false;

    const checkReady = () => {
      if (projectsDone && tasksDone) setIsReady(true);
    };

    api.call('project.getByClient', (err, result) => {
      if (!err && result) setProjects(result);
      projectsDone = true;
      checkReady();
    });

    api.call('projectTasks.getMyTasks', (err, tasks) => {
      if (!err && tasks) {
        // Deduplicate by taskId + projectId — keeps the latest copy when duplicates exist
        const seen = new Set();
        const sorted = tasks.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const unique = sorted.filter(t => {
          const key = `${t.projectId}__${t.taskId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAllTasks(unique);
      } else if (err) {
        toastr.error('Failed to load tasks');
      }
      tasksDone = true;
      checkReady();
    });

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // The two filter dropdowns are select2 dropdowns; they exist once the page is ready.
  useEffect(() => {
    if (!isReady) return undefined;

    const projectFilter = $('#clientProjectFilter');
    const statusFilter = $('#clientStatusFilter');

    projectFilter.select2({
      placeholder: 'All Projects',
      allowClear: true,
      width: '100%'
    });
    statusFilter.select2({
      placeholder: 'All Status',
      allowClear: true,
      width: '100%'
    });

    projectFilter.on('change.clientTask', function () {
      setSelectedProject($(this).val() || '');
      setCurrentPage(1);
    });

    statusFilter.on('change.clientTask', function () {
      setSelectedStatus($(this).val() || '');
      setCurrentPage(1);
    });

    return () => {
      projectFilter.off('change.clientTask');
      statusFilter.off('change.clientTask');
      [projectFilter, statusFilter].forEach(select => {
        if (select.hasClass('select2-hidden-accessible')) select.select2('destroy');
      });
    };
  }, [isReady]);

  /* ---------------------------------------------------------------- filtered lists */

  // Tasks of the selected project (the status cards count these).
  const baseFiltered = selectedProject ? allTasks.filter(t => t.projectId === selectedProject) : allTasks;

  // Tasks after all three filters (project, status, search).
  const getFullFiltered = () => {
    const search = searchText.toLowerCase().trim();
    let result = baseFiltered;
    if (selectedStatus) result = result.filter(t => t.status === selectedStatus);
    if (search) result = result.filter(t => (t.taskName || '').toLowerCase().includes(search));
    return result;
  };
  const fullFiltered = getFullFiltered();

  /** A copy of the tasks with the project name resolved. */
  const withProjectName = (taskList) => {
    const projectMap = {};
    projects.forEach(p => { projectMap[p._id] = p.name; });
    return taskList.map(t =>
      Object.assign({}, t, { projectName: projectMap[t.projectId] || '' })
    );
  };

  const pageStart = (currentPage - 1) * PER_PAGE;
  const tasks = withProjectName(fullFiltered.slice(pageStart, pageStart + PER_PAGE));
  const hasTasks = fullFiltered.length > 0;
  const totalTasks = fullFiltered.length;

  const countByStatus = (status) => {
    if (!status) return baseFiltered.length;
    return baseFiltered.filter(t => t.status === status).length;
  };

  /* ---------------------------------------------------------------- page bar */

  const showPagination = totalTasks > PER_PAGE;
  const paginationFrom = totalTasks === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const paginationTo = Math.min(currentPage * PER_PAGE, totalTasks);
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage * PER_PAGE < totalTasks;

  const getPageNumbers = () => {
    const totalPages = Math.ceil(totalTasks / PER_PAGE);
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push({ num: i, active: i === currentPage });
    }
    return pages;
  };

  /* ---------------------------------------------------------------- export */

  /**
   * Label describing the active project filter, used as the PDF subtitle.
   */
  const getExportSubtitle = () => {
    if (!selectedProject) return 'All Projects';
    const project = projects.find(p => p._id === selectedProject);
    return project ? project.name : 'All Projects';
  };

  const taskExport = {
    scope: 'clientTask',
    columns: EXPORT_COLUMNS,
    // Currently filtered tasks (all pages), with the project name resolved — the
    // export always covers the full filtered set, not just the visible page.
    rows: () => withProjectName(fullFiltered),
    fileName: 'my_tasks',
    sheetName: 'My Tasks',
    title: 'My Tasks',
    subtitle: getExportSubtitle,
    emptyMessage: 'No tasks to export',
    dateFilter: { fields: TASK_DATE_FIELDS }
  };

  /* ---------------------------------------------------------------- events */

  const handleResetFilters = () => {
    setSelectedProject('');
    setSelectedStatus('');
    setSearchText('');
    setCurrentPage(1);
    $('#clientProjectFilter').val(null).trigger('change');
    $('#clientStatusFilter').val(null).trigger('change');
    setSearchInput('');
  };

  const handleSearchInput = (event) => {
    clearTimeout(searchTimer.current);
    const val = event.target.value;
    setSearchInput(val);
    searchTimer.current = setTimeout(() => {
      setSearchText(val);
      setCurrentPage(1);
    }, 300);
  };

  const handleStatusCardClick = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    $('#clientStatusFilter').val(status || null).trigger('change');
  };

  const handlePrevPage = (event) => {
    event.preventDefault();
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = (event) => {
    event.preventDefault();
    if (currentPage * PER_PAGE < totalTasks) setCurrentPage(currentPage + 1);
  };

  const handlePageClick = (event, page) => {
    event.preventDefault();
    if (page) setCurrentPage(page);
  };

  /* ---------------------------------------------------------------- page */

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">

        {/* Header */}
        <div className="row mb-4 align-items-center">
          <div className="col-12 col-md">
            <h4 className="fw-bold mb-1">My Tasks</h4>
            <p className="text-muted mb-0">View all tasks from your projects</p>
          </div>
          {isReady && (
            <div className="col-12 col-md-auto mt-3 mt-md-0">
              <TableExportButtons scope="clientTask" config={taskExport} />
            </div>
          )}
        </div>

        {isReady ? (
          <>
            {/* Status Count Cards */}
            <div className="row g-3 mb-4">
              {STATUS_CARDS.map((card) => (
                <div className="col-6 col-md-4 col-xl-2" key={card.status}>
                  <div className={'card h-100 client-status-card ' + (selectedStatus === card.status ? card.activeClass : '')}
                    data-status={card.status} style={{ cursor: 'pointer' }} onClick={() => handleStatusCardClick(card.status)}>
                    <div className="card-body p-3 text-center">
                      <span className={card.labelClass + ' d-block mb-1'} style={STATUS_CARD_LABEL_STYLE}>{card.label}</span>
                      <h4 className={'mb-0 fw-bold' + card.countClass}>{countByStatus(card.status)}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="card mb-4">
              <div className="card-body py-3">
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label mb-1 fw-semibold">Project</label>
                    <select className="form-select" id="clientProjectFilter">
                      <option value="">All Projects</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project._id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label mb-1 fw-semibold">Status</label>
                    <select className="form-select" id="clientStatusFilter">
                      <option value="">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Testing">Testing</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label mb-1 fw-semibold">Search</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className="bx bx-search"></i></span>
                      <input type="text" className="form-control" id="clientTaskSearch" placeholder="Search task name..."
                        value={searchInput} onChange={handleSearchInput} />
                    </div>
                  </div>
                  <div className="col-md-auto">
                    <label className="form-label mb-1 d-block invisible">Reset</label>
                    <button type="button" className="btn btn-danger" id="clientResetFilters" onClick={handleResetFilters}>
                      <i className="bx bx-reset me-1"></i>Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="card">
              <div className="card-body p-0">
                {hasTasks ? (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-4">Task ID</th>
                            <th>Task Name</th>
                            <th>Project</th>
                            <th>Phase</th>
                            <th>Status</th>
                            <th>Duration</th>
                            <th>Total Hours</th>
                            <th>Responsibility</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map((task) => (
                            <tr key={task._id}>
                              <td className="ps-4">
                                <span className="badge bg-label-secondary">{task.taskId}</span>
                              </td>
                              <td>
                                <span className="fw-medium">{task.taskName}</span>
                              </td>
                              <td>
                                {task.projectName ? (
                                  <span className="badge" style={projectColorStyle(task.projectId)}>{task.projectName}</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td>
                                <span className="text-muted">{task.phase ? task.phase : '-'}</span>
                              </td>
                              <td>
                                <span className={'badge ' + (STATUS_BADGE_CLASSES[task.status] || 'bg-label-secondary')}>{task.status}</span>
                              </td>
                              <td>
                                <span className="text-muted">
                                  <i className="bx bx-time-five me-1"></i>{taskDurationDays(task)}d
                                </span>
                              </td>
                              <td>
                                <span className="fw-medium">
                                  <i className="bx bx-hourglass me-1 text-muted"></i>{taskTotalHours(task)}
                                </span>
                              </td>
                              <td>
                                {task.responsibility ? (
                                  <span><i className="bx bx-user me-1 text-muted"></i>{task.responsibility}</span>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {showPagination && (
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-4 py-3 border-top">
                        <span className="text-muted small">
                          Showing {paginationFrom}–{paginationTo} of {totalTasks} tasks
                        </span>
                        <nav aria-label="Task pagination">
                          <ul className="pagination pagination-sm m-0">
                            <li className={'page-item ' + (hasPrevPage ? '' : 'disabled')}>
                              <a className="page-link" href="#" id="clientPrevPage" onClick={handlePrevPage}>
                                <i className="bx bx-chevron-left"></i>
                              </a>
                            </li>
                            {getPageNumbers().map((page) => (
                              <li className={'page-item ' + (page.active ? 'active' : '')} key={page.num}>
                                <a className="page-link client-page-link" href="#" data-page={page.num}
                                  onClick={(event) => handlePageClick(event, page.num)}>{page.num}</a>
                              </li>
                            ))}
                            <li className={'page-item ' + (hasNextPage ? '' : 'disabled')}>
                              <a className="page-link" href="#" id="clientNextPage" onClick={handleNextPage}>
                                <i className="bx bx-chevron-right"></i>
                              </a>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-5">
                    <i className="bx bx-task text-muted" style={{ fontSize: '3.5rem', opacity: 0.35 }}></i>
                    <p className="text-muted mt-3 mb-0 fw-medium">No tasks found</p>
                    <p className="text-muted small">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Initial page loader */
          <>
            <div className="mb-4">
              <StatCardsSkeleton count={6} colClass="col-6 col-md-4 col-xl-2" />
            </div>
            <div className="card">
              <div className="card-body">
                <TableSkeleton rows={8} columns={6} label="Loading your tasks…" />
              </div>
            </div>
          </>
        )}

      </div>

      <TableExportModal scope="clientTask" dateFields="task" config={taskExport} />
    </>
  );
}
