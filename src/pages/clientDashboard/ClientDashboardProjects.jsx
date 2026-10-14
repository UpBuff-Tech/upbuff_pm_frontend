/**
 * The "My Projects" table of the client dashboard, with its pagination.
 * Rendered once the client's id is known (the old page created its Meteor.Pagination at that moment).
 *
 *   <ClientDashboardProjects companyName={clientRecord._id} />
 */
import { Link } from 'react-router-dom';
import { usePagination } from '../../hooks/usePagination';
import Paginator from '../../components/Paginator';
import { formatDate, safeCompletionPct, badgeClass } from './utility';

const PROJECT_STATUS_BADGES = {
  'In Progress': 'bg-label-info',
  'Completed': 'bg-label-success',
  'On Hold': 'bg-label-warning'
};

/** Shown when the client has no projects. */
export function NoProjects() {
  return (
    <div className="text-center py-4">
      <i className="bx bx-folder-open text-muted" style={{ fontSize: '3rem' }}></i>
      <p className="text-muted mt-2">No projects assigned yet</p>
    </div>
  );
}

export default function ClientDashboardProjects({ companyName }) {
  const pagination = usePagination('project', {
    filters: {
      companyName: companyName,
      isDeleted: { $ne: true }
    },
    sort: { createdAt: -1 },
    perPage: 10
  });
  const projects = pagination.getPage();

  if (!projects.length) return <NoProjects />;

  return (
    <>
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Progress</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const completionPct = safeCompletionPct(project.completionPercentage);
              return (
                <tr key={project._id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <i className="bx bx-folder me-2 text-primary"></i>
                      <strong>{project.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${badgeClass(PROJECT_STATUS_BADGES, project.status, 'bg-label-secondary')}`}>{project.status}</span>
                  </td>
                  <td>{formatDate(project.startDate)}</td>
                  <td>{formatDate(project.endDate)}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="progress flex-grow-1 me-2" style={{ height: '8px', width: '80px' }}>
                        <div className="progress-bar" role="progressbar"
                          style={{ width: `${completionPct}%` }}
                          aria-valuenow={completionPct}
                          aria-valuemin="0" aria-valuemax="100"></div>
                      </div>
                      <small className="text-muted">{completionPct}%</small>
                    </div>
                  </td>
                  <td>
                    <Link to="/client/tasks" className="btn btn-sm btn-outline-primary">
                      <i className="bx bx-task"></i> View Tasks
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages() ? (
        <div className="d-flex justify-content-center mt-3">
          <Paginator pagination={pagination} onClick={(event) => event.preventDefault()} />
        </div>
      ) : null}
    </>
  );
}
