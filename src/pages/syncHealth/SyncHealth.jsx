/**
 * Sync Health List Page
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { usePagination } from '../../hooks/usePagination';
import Paginator from '../../components/Paginator';
import { initializeSelect2 } from '../../lib/customFunctions';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const PER_PAGE = 20;

const NO_FILTERS = { search: '', issueType: '', projectId: '' };

/**
 * Escape regex metacharacters so user input is treated as a literal substring.
 * Without this, typing `(`, `.`, `[`, `?` etc. throws "Invalid regular expression".
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the Mongo `filters` query passed to the pagination.
 *
 * Uses { $regex: pattern, $options: 'i' } instead of `new RegExp(pattern, 'i')`
 * so the query is made of plain strings only.
 */
function buildFilters({ search, issueType, projectId }) {
  const filters = {};
  if (issueType) filters.issueType = issueType;
  if (projectId) filters.projectName = projectId;
  if (search && search.trim()) {
    const pattern = escapeRegex(search.trim());
    filters.$or = [
      { issueType: { $regex: pattern, $options: 'i' } },
      { issueDescription: { $regex: pattern, $options: 'i' } }
    ];
  }
  return filters;
}

function formatDateTime(date) {
  if (!date) return '-';
  return moment(date).format('DD MMM YYYY, hh:mm A');
}

function issueTypeBadgeClass(issueType) {
  switch (issueType) {
    case 'SyncFailure': return 'bg-danger';
    case 'ApiFailure': return 'bg-warning';
    case 'CronFailure': return 'bg-info';
    case 'AuthFailure': return 'bg-dark';
    default: return 'bg-secondary';
  }
}

export default function SyncHealth() {
  const [projects, setProjects] = useState([]);
  const [projectNameMap, setProjectNameMap] = useState({});
  const [stats, setStats] = useState({ total: 0, syncFailures: 0, totalFailures: 0 });
  const [filters, setFilters] = useState(NO_FILTERS);
  // What is typed in the search box; `filters.search` follows it 300ms after the last key.
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef(null);
  // The incident shown in the View Incident modal (nothing until the first "View" click)
  const [viewedIncident, setViewedIncident] = useState(null);

  const pagination = usePagination('syncHealth', {
    sort: { createdAt: -1 },
    perPage: PER_PAGE,
    filters: {}
  });

  const loadStats = () => {
    api.call('syncHealth.getStats', (error, result) => {
      if (error || !result) return;
      setStats({
        total: result.total || 0,
        syncFailures: result.byIssueType?.SyncFailure || 0,
        totalFailures: result.totalFailures || 0
      });
    });
  };

  useEffect(() => {
    // Reuse the existing project list method to populate the project filter
    // dropdown and to resolve the project _id stored in `projectName` to a
    // human-readable name in the table.
    api.call('project.getList', { page: 1, perPage: 1000 }, (error, result) => {
      if (error) return;
      const list = (result && (result.data || result)) || [];
      setProjects(list);
      const map = {};
      list.forEach(p => { map[p._id] = p.name; });
      setProjectNameMap(map);
    });

    loadStats();

    return () => clearTimeout(searchTimer.current);
  }, []);

  // Re-push filter state into the pagination engine whenever the user changes
  // a filter input. Reset to page 1 so the user doesn't land on an empty page
  // when the filtered result set has fewer pages than their current position.
  useEffect(() => {
    pagination.filters(buildFilters(filters));
    pagination.currentPage(1);
  }, [filters]);

  // The project filter is a select2 dropdown, which announces a choice through jQuery only.
  useEffect(() => {
    initializeSelect2([
      { id: 'filterProject', placeholder: 'All Projects' }
    ]);

    const select = $('#filterProject');
    const onChange = () => {
      const projectId = select.val();
      setFilters((current) => ({ ...current, projectId: projectId }));
    };
    select.on('change', onChange);
    return () => {
      select.off('change', onChange);
      select.select2('destroy');
    };
  }, []);

  const isReady = pagination.ready();
  const incidents = pagination.getPage();

  const projectDisplayName = (projectId) => {
    return projectNameMap[projectId] || projectId || 'Unknown';
  };

  const rowIndex = (index) => {
    const current = pagination.currentPage();
    return ((current - 1) * PER_PAGE) + index + 1;
  };

  /* ---------------------------------------------------------------- events */

  const handleRefresh = (event) => {
    event.preventDefault();
    // Re-applying the filters object forces the pagination to load again.
    pagination.filters(buildFilters(filters));
    loadStats();
  };

  const handleSearchInput = (event) => {
    const value = event.currentTarget.value;
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((current) => ({ ...current, search: value }));
    }, 300);
  };

  const handleResetFilters = (event) => {
    event.preventDefault();
    clearTimeout(searchTimer.current);
    setSearchInput('');
    $('#filterProject').val('').trigger('change');
    setFilters(NO_FILTERS);
  };

  const handleViewIncident = (event, id) => {
    event.preventDefault();

    // The record is already on the page, so there is no need to ask the server for it.
    const record = incidents.find((incident) => incident._id === id);
    if (!record) {
      toastr.error('Failed to load incident');
      return;
    }

    setViewedIncident(record);
    $('#viewIncidentModal').modal('show');
  };

  /* ---------------------------------------------------------------- page */

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">System &amp; Security Incidents</h4>
            <p className="text-muted mb-0">Sync failures, API errors, cron issues and unauthorized access attempts reported by connected services</p>
          </div>
          <button type="button" className="btn btn-outline-primary" id="refreshSyncHealth" onClick={handleRefresh}>
            <i className="bx bx-refresh me-1"></i> Refresh
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-0 text-white">Total Incidents</h6>
                    <h3 className="mb-0 text-white">{stats.total}</h3>
                  </div>
                  <i className="bx bx-list-ul fa-2x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-danger text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-0 text-white">Sync Failures</h6>
                    <h3 className="mb-0 text-white">{stats.syncFailures}</h3>
                  </div>
                  <i className="bx bx-error-circle fa-2x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-warning text-dark">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-0">Total Failure Count</h6>
                    <h3 className="mb-0">{stats.totalFailures}</h3>
                  </div>
                  <i className="bx bx-bar-chart-alt-2 fa-2x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <input type="text" className="form-control" id="searchIncidents" placeholder="Search type, description..."
                  value={searchInput} onChange={handleSearchInput} />
              </div>
              <div className="col-md-3">
                <select className="form-select" id="filterProject" style={{ width: '100%' }}>
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-danger w-100 fw-bold" id="resetFilters" title="Reset all filters" onClick={handleResetFilters}>
                  <i className="bx bx-revision"></i>&nbsp;Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-body">
            {!isReady ? (
              <TableSkeleton rows={8} columns={6} />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Project</th>
                      <th>Issue Type</th>
                      <th>Failures</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Next Retry</th>
                      <th width="80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident, index) => (
                      <tr key={incident._id}>
                        <td>{rowIndex(index)}</td>
                        <td><span className="fw-semibold">{projectDisplayName(incident.projectName)}</span></td>
                        <td>
                          <span className={'badge ' + issueTypeBadgeClass(incident.issueType)}>{incident.issueType}</span>
                        </td>
                        <td>
                          <span className="badge bg-label-danger">{incident.failureCount}</span>
                        </td>
                        <td><small className="text-muted">{formatDateTime(incident.startTime)}</small></td>
                        <td><small className="text-muted">{formatDateTime(incident.endTime)}</small></td>
                        <td><small className="text-muted">{formatDateTime(incident.nextCronCallAt)}</small></td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary viewIncidentBtn" data-id={incident._id} title="View Details"
                            onClick={(event) => handleViewIncident(event, incident._id)}>
                            <i className="bx bx-show"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {incidents.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center text-muted py-5">
                          <i className="bx bx-check-shield" style={{ fontSize: '48px' }}></i>
                          <p className="mb-0 mt-2">No incidents reported.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {isReady && (
          <div className="mt-3 d-flex justify-content-center">
            <Paginator pagination={pagination} limit={10} />
          </div>
        )}
      </div>

      {/* View Incident Modal */}
      <div className="modal fade" id="viewIncidentModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bx bx-error-circle me-2"></i>Incident Details
              </h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Project</label>
                  <p id="viewProject" className="mb-0">{viewedIncident ? projectDisplayName(viewedIncident.projectName) : '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Issue Type</label>
                  <p id="viewIssueType" className="mb-0">
                    {viewedIncident ? <span className="badge bg-danger">{viewedIncident.issueType || '-'}</span> : '-'}
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Failure Count</label>
                  <p id="viewFailureCount" className="mb-0">{viewedIncident && viewedIncident.failureCount != null ? viewedIncident.failureCount : '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Start Time</label>
                  <p id="viewStartTime" className="mb-0">{formatDateTime(viewedIncident && viewedIncident.startTime)}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">End Time</label>
                  <p id="viewEndTime" className="mb-0">{formatDateTime(viewedIncident && viewedIncident.endTime)}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Next Retry</label>
                  <p id="viewNextCronCallAt" className="mb-0">{formatDateTime(viewedIncident && viewedIncident.nextCronCallAt)}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Created At</label>
                  <p id="viewCreatedAt" className="mb-0">{formatDateTime(viewedIncident && viewedIncident.createdAt)}</p>
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold">Issue Description</label>
                  <pre id="viewIssueDescription" className="bg-light p-3 rounded small" style={{ whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto' }}>
                    {(viewedIncident && viewedIncident.issueDescription) || '-'}
                  </pre>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
