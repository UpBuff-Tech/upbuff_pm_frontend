/**
 * Client Dashboard
 * Shows project statistics and list for logged-in client
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { currentUserId } from '../../lib/customFunctions';
import ClientDashboardProjects, { NoProjects } from './ClientDashboardProjects';
import { formatDate, badgeClass } from './utility';
import { StatCardsSkeleton, ListSkeleton } from '../../components/skeleton/Skeleton';
import PeriodFilter from '../../components/PeriodFilter';
import { periodInfo, periodPayload, savedPeriod, savePeriod } from '../../lib/dashboardPeriod';

const PERIOD_STORAGE_KEY = 'clientDashboard.period';

const ICON_SIZE = { fontSize: '1.5rem' };

// Badge colours of the upcoming tasks table
const TASK_STATUS_BADGES = {
  'In Progress': 'bg-label-info',
  'Pending': 'bg-label-warning',
  'On Hold': 'bg-label-secondary'
};

const TASK_PRIORITY_BADGES = {
  'High': 'bg-danger',
  'Medium': 'bg-warning'
};

/**
 * Check if task is due within 2 days (for highlighting)
 */
function isDueSoon(date) {
  if (!date) return false;
  const dueDate = moment(date);
  const today = moment();
  const diffDays = dueDate.diff(today, 'days');
  return diffDays >= 0 && diffDays <= 2;
}

/** One of the four statistics cards at the top of the dashboard. */
function StatCard({ label, value, color, icon }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between">
            <div className="content-left">
              <span className="text-muted d-block mb-1">{label}</span>
              <div className="d-flex align-items-center">
                <h3 className="mb-0 me-2">{value}</h3>
              </div>
            </div>
            <div className="avatar">
              <span className="avatar-initial rounded" style={{ backgroundColor: color }}>
                <i className={icon} style={ICON_SIZE}></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One period number (hours, tasks completed, tickets raised) with its change vs the previous period. */
function ActivityCard({ label, value, previous, prevLabel, icon, color, loading }) {
  let change = null;
  if (!loading && previous) {
    const percent = Math.round(((value - previous) / previous) * 100);
    change = (
      <small className={percent >= 0 ? 'text-success' : 'text-danger'}>
        <i className={'bx ' + (percent >= 0 ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt')}></i>{Math.abs(percent)}% vs {prevLabel}
      </small>
    );
  }
  return (
    <div className="col-md-4">
      <div className="card h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <span className="avatar-initial rounded d-inline-flex align-items-center justify-content-center"
            style={{ backgroundColor: color, width: 42, height: 42, flexShrink: 0 }}>
            <i className={icon} style={ICON_SIZE}></i>
          </span>
          <div>
            <span className="text-muted d-block small">{label}</span>
            <h4 className="mb-0">{loading ? '–' : value.toLocaleString()}</h4>
            {change}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const [isReady, setIsReady] = useState(false);
  // The client's id; the project list is loaded once it is known
  const [companyName, setCompanyName] = useState('');
  const [clientDisplayName, setClientDisplayName] = useState('Client');
  const [clientStats, setClientStats] = useState({});

  // Upcoming tasks
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [upcomingTasks, setUpcomingTasks] = useState([]);

  // Activity in the chosen period (hours on their projects, tasks completed, tickets raised)
  const [periodKey, setPeriodKey] = useState(() => savedPeriod(PERIOD_STORAGE_KEY));
  const [activity, setActivity] = useState(null);
  const period = periodInfo(periodKey);

  useEffect(() => {
    setActivity(null);
    api.call('project.getClientActivity', periodPayload(periodKey), (err, data) => {
      if (!currentUserId()) return;
      setActivity(!err && data ? data : { totals: {}, previous: null });
    });
  }, [periodKey]);

  const changePeriod = (key) => {
    setPeriodKey(key);
    savePeriod(PERIOD_STORAGE_KEY, key);
  };
  const activityTotals = (activity && activity.totals) || {};
  const activityPrevious = (activity && activity.previous) || {};

  useEffect(() => {
    // Fetch client dashboard stats
    api.call('project.getClientDashboardStats', (err, stats) => {
      if (!currentUserId()) return;
      if (err) {
        toastr.error('Failed to load dashboard statistics');
        return;
      }

      if (stats) {
        setClientStats(stats);
      }
    });

    // Fetch upcoming tasks for the week
    api.call('projectTasks.getClientUpcomingTasks', (err, tasks) => {
      if (!currentUserId()) return;
      setIsLoadingTasks(false);
      if (err) {
        toastr.error('Failed to load upcoming tasks');
        return;
      }
      setUpcomingTasks(tasks || []);
    });

    // Fetch client info
    api.call('clients.getMyInfo', (err, clientRecord) => {
      if (!currentUserId()) return;
      if (err) {
        toastr.error('Failed to load client information');
        setIsReady(true);
        return;
      }

      if (clientRecord) {
        // Store client display name
        if (clientRecord.name) {
          setClientDisplayName(clientRecord.name);
        }

        // The project list starts loading once we have the company name
        if (clientRecord._id) {
          setCompanyName(clientRecord._id);
        }
      }

      setIsReady(true);
    });
  }, []);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">

      {/* Header */}
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold">Client Dashboard</h4>
          <p className="text-muted mb-0">Welcome, {clientDisplayName || 'Client'}! View your project status and progress</p>
        </div>
        <PeriodFilter value={periodKey} onChange={changePeriod} />
      </div>

      {isReady ? (
        <>
          {/* Statistics Cards */}
          <div className="row g-3 mb-4">
            <StatCard label="Total Projects" value={clientStats.totalProjects || 0} color="#696cff20" icon="bx bx-folder text-primary" />
            <StatCard label="In Progress" value={clientStats.inProgressProjects || 0} color="#03c3ec20" icon="bx bx-play-circle text-info" />
            <StatCard label="Completed" value={clientStats.completedProjects || 0} color="#71dd3720" icon="bx bx-check-circle text-success" />
            <StatCard label="On Hold" value={clientStats.onHoldProjects || 0} color="#ffab0020" icon="bx bx-pause-circle text-warning" />
          </div>

          {/* Activity in the chosen period */}
          <h6 className="text-muted text-uppercase small fw-semibold mb-2">Activity · {period.label.toLowerCase()}</h6>
          <div className="row g-3 mb-4">
            <ActivityCard label="Hours worked on your projects" value={activityTotals.hours || 0} previous={activityPrevious.hours}
              prevLabel={period.prevLabel} icon="bx bx-time-five text-primary" color="#696cff20" loading={activity === null} />
            <ActivityCard label="Tasks completed" value={activityTotals.completedTasks || 0} previous={activityPrevious.completedTasks}
              prevLabel={period.prevLabel} icon="bx bx-check-circle text-success" color="#71dd3720" loading={activity === null} />
            <ActivityCard label="Tickets raised" value={activityTotals.ticketsRaised || 0} previous={activityPrevious.ticketsRaised}
              prevLabel={period.prevLabel} icon="bx bx-support text-info" color="#03c3ec20" loading={activity === null} />
          </div>

          {/* Upcoming Tasks This Week */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="bx bx-calendar-check me-2"></i>Upcoming Tasks This Week
                  </h5>
                  <span className="badge bg-primary">{upcomingTasks ? upcomingTasks.length : 0} tasks</span>
                </div>
                <div className="card-body">
                  {isLoadingTasks ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span className="ms-2 text-muted">Loading upcoming tasks...</span>
                    </div>
                  ) : upcomingTasks.length ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Task ID</th>
                            <th>Task Name</th>
                            <th>Project</th>
                            <th>Start Date</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingTasks.map((task, index) => (
                            <tr key={task._id || index}>
                              <td>
                                <span className="badge bg-label-secondary">{task.taskId}</span>
                              </td>
                              <td>
                                <strong>{task.taskName}</strong>
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <i className="bx bx-folder me-1 text-primary"></i>
                                  <span>{task.projectName}</span>
                                </div>
                              </td>
                              <td>{formatDate(task.baselineStart)}</td>
                              <td>
                                {isDueSoon(task.baselineFinish) ? (
                                  <span className="text-danger fw-bold">{formatDate(task.baselineFinish)}</span>
                                ) : (
                                  formatDate(task.baselineFinish)
                                )}
                              </td>
                              <td>
                                <span className={`badge ${badgeClass(TASK_STATUS_BADGES, task.status, 'bg-label-secondary')}`}>{task.status}</span>
                              </td>
                              <td>
                                <span className={`badge ${badgeClass(TASK_PRIORITY_BADGES, task.priority, 'bg-secondary')}`}>{task.priority}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bx bx-calendar-check text-muted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                      <p className="text-muted mt-2 mb-0">No upcoming tasks for this week</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Projects List */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">My Projects</h5>
                </div>
                <div className="card-body">
                  {companyName ? (
                    <ClientDashboardProjects companyName={companyName} />
                  ) : (
                    <NoProjects />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <StatCardsSkeleton count={4} />
          </div>
          <div className="card">
            <div className="card-body">
              <ListSkeleton rows={5} label="Loading your dashboard…" />
            </div>
          </div>
        </>
      )}

    </div>
  );
}
