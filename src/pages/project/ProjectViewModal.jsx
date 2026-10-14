/**
 * Project View Modal (#projectViewModal): the read-only "Project Details" of one project,
 * with its summary tiles, team members, attachments and task table.
 *
 *   <ProjectViewModal exportConfig={viewTasksExport} onTasksLoaded={setViewedProjectTasks} />
 *
 *   openProjectViewModal(projectId);
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import { Skeleton, StatCardsSkeleton, TableSkeleton } from '../../components/skeleton/Skeleton';
import { getTaskTotalSeconds, getTaskDurationDays, formatHoursMinutes } from '../../lib/taskHours';
import {
  avatarColor,
  createComponentHandle,
  downloadExistingAttachment,
  formatFileSize,
  getAttachmentId,
  getFileIcon,
  getProjectStatus,
  getTimelineStatus,
  initials,
  profileFullName,
  statusKey
} from './projectHelpers';
import { enrichViewTasks } from './projectTaskDates';
import { openProjectTaskDetailModal } from './ProjectTaskDetailModal';

const handle = createComponentHandle();

/** View project details */
export function openProjectViewModal(projectId) {
  handle.call('open', projectId);
}

/** "05 Mar 2026" ('—' for an empty date) */
function formatDate(date) {
  return date ? moment(date).format('DD MMM YYYY') : '—';
}

/** "05 Mar" for the compact date ranges in the task table */
function formatShort(date) {
  return date ? moment(date).format('DD MMM') : '—';
}

const callAsync = (method, ...args) => new Promise((resolve) => {
  api.call(method, ...args, (error, result) => resolve(error ? null : result));
});

// Team users are the same for every project: load them once per page visit.
let usersPromise = null;
const loadUsers = () => {
  if (!usersPromise) {
    usersPromise = callAsync('user.getAllForAssignment').then((users) => {
      if (!users) usersPromise = null; // try again next time
      return users || [];
    });
  }
  return usersPromise;
};

const userName = (u) => (u && u.profile ? profileFullName(u.profile) : '') || u?.emails?.[0]?.address || 'Unknown user';

const TASK_STATUS_KEYS = {
  'Completed': 'completed',
  'In Progress': 'inprogress',
  'Pending': 'pending',
  'On Hold': 'onhold',
  'Cancelled': 'cancelled',
  'Testing': 'testing'
};
const taskStatusKey = (status) => TASK_STATUS_KEYS[status || 'Pending'] || 'onhold';

/** Where today falls in the schedule */
function scheduleOf(project) {
  if (!project.startDate || !project.endDate) return { percent: 0, text: 'No dates set', days: null };
  const start = moment(project.startDate).startOf('day');
  const end = moment(project.endDate).startOf('day');
  const today = moment().startOf('day');
  const days = end.diff(start, 'days') + 1;
  if (today.isBefore(start)) return { percent: 0, text: `Starts in ${start.diff(today, 'days')} days`, days };
  if (today.isAfter(end)) {
    const ago = today.diff(end, 'days');
    return { percent: 100, text: `Ended ${ago} day${ago === 1 ? '' : 's'} ago`, days };
  }
  const left = end.diff(today, 'days');
  return { percent: Math.round((today.diff(start, 'days') / Math.max(days - 1, 1)) * 100), text: `${left} day${left === 1 ? '' : 's'} left`, days };
}

function Tile({ icon, tone, label, children }) {
  return (
    <div className="pv-tile">
      <span className={'pv-tile-icon pv-tone-' + tone}><i className={'bx ' + icon}></i></span>
      <div className="pv-tile-body">
        <span className="pv-tile-label">{label}</span>
        {children}
      </div>
    </div>
  );
}

function ViewAttachment({ attachment, projectId }) {
  const attachmentId = getAttachmentId(attachment);
  const body = (
    <>
      <span className="pv-file-icon"><i className={getFileIcon(attachment.type)}></i></span>
      <span className="pv-file-meta">
        <strong title={attachment.name}>{attachment.name}</strong>
        <small>{formatFileSize(attachment.size)}</small>
      </span>
      <i className="bx bx-download pv-file-action"></i>
    </>
  );

  return attachment.data ? (
    <a href={attachment.data} download={attachment.name} target="_blank" rel="noreferrer" className="pv-file" title="Open / download">
      {body}
    </a>
  ) : (
    <button type="button" className="pv-file" title="Open / download"
      onClick={(event) => downloadExistingAttachment(event, projectId, attachmentId)}>
      {body}
    </button>
  );
}

function ViewTaskRow({ task }) {
  const timeline = getTimelineStatus(task);
  const workCompletion = typeof task.workCompletion === 'number' ? task.workCompletion : (parseInt(task.workCompletion) || 0);
  const attachmentCount = task.attachments ? task.attachments.length : 0;
  const sKey = taskStatusKey(task.status);

  const viewTaskDetail = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProjectTaskDetailModal(task._id);
  };

  return (
    <tr className="pv-task-row" onClick={viewTaskDetail} tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter') viewTaskDetail(event); }}>
      <td className="pv-col-task">
        <div className="pv-task-name">
          {task.taskId && <span className="pv-task-id">{task.taskId}</span>}
          <span>{task.taskName || 'Untitled task'}</span>
        </div>
        <div className="pv-task-sub">
          {task.phase && <span><i className="bx bx-layer"></i>{task.phase}</span>}
          {task.responsibility && <span><i className="bx bx-user"></i>{task.responsibility}</span>}
          {attachmentCount > 0 && <span><i className="bx bx-paperclip"></i>{attachmentCount}</span>}
        </div>
      </td>
      <td><span className={'pv-pill t-' + sKey}>{task.status || 'Pending'}</span></td>
      <td>
        <div className="pv-progress">
          <span className="pv-bar"><span className={'t-' + sKey} style={{ width: `${workCompletion}%` }}></span></span>
          <small>{workCompletion}%</small>
        </div>
      </td>
      <td className="pv-num">
        <strong>{formatHoursMinutes(getTaskTotalSeconds(task))}</strong>
        <small>{getTaskDurationDays(task)}d · {task.plannedHours || 0}h planned</small>
      </td>
      <td className="pv-dates">
        <span>{formatShort(task.baselineStart)} <i className="bx bx-right-arrow-alt"></i> {formatShort(task.baselineFinish)}</span>
      </td>
      <td className="pv-dates">
        <span>{formatShort(task.actualStart)} <i className="bx bx-right-arrow-alt"></i> {formatShort(task.actualFinish)}</span>
      </td>
      <td>
        {timeline.text === '-' ? <span className="text-muted">—</span>
          : <span className={'pv-timeline is-' + (timeline.color === 'danger' ? 'late' : 'ok')}>{timeline.text}</span>}
      </td>
      <td className="text-end">
        <button type="button" className="pv-row-btn" title="View task" onClick={viewTaskDetail}>
          <i className="bx bx-chevron-right"></i>
        </button>
      </td>
    </tr>
  );
}

function LoadingBody() {
  return (
    <div className="pv-body">
      <StatCardsSkeleton count={4} colClass="col-sm-6 col-xl-3" />
      <div className="pv-section">
        <Skeleton className="sk-text" width={120} />
        <Skeleton className="sk-text mt-3" width="70%" />
      </div>
      <div className="pv-section">
        <TableSkeleton rows={6} columns={6} label="Loading project details…" />
      </div>
    </div>
  );
}

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'On Hold'];

export default function ProjectViewModal({ exportConfig, onTasksLoaded }) {
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [clientName, setClientName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const latestOpen = useRef(0);

  const open = async (id) => {
    const openNumber = ++latestOpen.current;
    const isCurrent = () => openNumber === latestOpen.current;

    setLoading(true);
    setStatusFilter('All');
    setSearch('');
    $('#projectViewModal').modal('show');

    const loaded = await callAsync('project.getById', id);
    if (!isCurrent()) return;
    if (!loaded) {
      toastr.error('Failed to load project');
      $('#projectViewModal').modal('hide');
      return;
    }

    const [list, users, client] = await Promise.all([
      callAsync('projectTasks.getByProject', id),
      loadUsers(),
      loaded.companyName ? callAsync('clients.getById', loaded.companyName) : Promise.resolve(null)
    ]);
    if (!isCurrent()) return;

    const byId = new Map(users.map((u) => [u._id, u]));
    const enrichedTasks = list && list.length ? enrichViewTasks(list) : [];

    setProjectId(id);
    setProject(loaded);
    setClientName(client ? client.clientName || client.name || '' : '');
    setManagerName(loaded.assignedTo ? (loaded.assignedToName || userName(byId.get(loaded.assignedTo))) : '');
    setMembers((loaded.members || []).map((memberId) => byId.get(memberId) || { _id: memberId }));
    setTasks(enrichedTasks);
    // Keep the rendered rows around for the Excel/PDF export.
    onTasksLoaded({ projectName: loaded.name || '', tasks: enrichedTasks });
    setLoading(false);
  };

  // Let openProjectViewModal() reach this modal
  useEffect(() => handle.register({ open }));

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => (t.status || '').toLowerCase() === 'completed').length;
    const seconds = tasks.reduce((sum, t) => sum + (getTaskTotalSeconds(t) || 0), 0);
    const counts = tasks.reduce((acc, t) => {
      const s = t.status || 'Pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    return {
      completed,
      total: tasks.length,
      percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      hours: formatHoursMinutes(seconds),
      counts
    };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => (statusFilter === 'All' || (t.status || 'Pending') === statusFilter)
      && (!q || [t.taskName, t.taskId, t.phase, t.responsibility].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [tasks, statusFilter, search]);

  const status = project ? getProjectStatus(project) : '';
  const schedule = project ? scheduleOf(project) : null;
  const attachments = project?.attachments || [];

  return (
    <div className="modal fade pv-modal" id="projectViewModal" tabIndex="-1" aria-hidden="true" aria-labelledby="projectViewTitle">
      <div className="modal-dialog modal-xl modal-dialog-scrollable" role="document">
        <div className="modal-content">
          {/* Header */}
          <div className="pv-header">
            {loading || !project ? (
              <div className="pv-header-main">
                <Skeleton width={52} height={52} radius={14} />
                <div className="sk-stack" style={{ gap: 8, flex: 1 }}>
                  <Skeleton className="sk-title" width="40%" height={22} />
                  <Skeleton className="sk-text" width="25%" />
                </div>
              </div>
            ) : (
              <div className="pv-header-main">
                <span className="pj-avatar pv-avatar" style={{ '--c': avatarColor(project.name) }}>{initials(project.name)}</span>
                <div className="pv-header-text">
                  <h5 className="pv-title" id="projectViewTitle">{project.name}</h5>
                  <div className="pv-header-meta">
                    <span className={'pj-status s-' + statusKey(status)}>{status}</span>
                    <span className={'pv-meta' + (clientName ? '' : ' is-empty')}><i className="bx bx-buildings"></i>{clientName || 'No client'}</span>
                    {schedule && schedule.days && <span className="pv-meta"><i className="bx bx-time-five"></i>{schedule.days} days</span>}
                  </div>
                </div>
              </div>
            )}
            <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>

          <div className="modal-body p-0">
            {loading || !project ? <LoadingBody /> : (
              <div className="pv-body">
                {/* Summary tiles */}
                <div className="row g-3">
                  <div className="col-sm-6 col-xl-3">
                    <Tile icon="bx-check-circle" tone="green" label="Completion">
                      <div className="pv-tile-value">{stats.percent}%</div>
                      <span className="pj-track pj-track-green pv-tile-track"><span style={{ width: `${stats.percent}%` }}></span></span>
                      <small>{stats.total ? `${stats.completed} of ${stats.total} tasks done` : 'No tasks yet'}</small>
                    </Tile>
                  </div>
                  <div className="col-sm-6 col-xl-3">
                    <Tile icon="bx-calendar" tone="indigo" label="Schedule">
                      <div className="pv-tile-value pv-tile-dates">
                        {formatDate(project.startDate)} <i className="bx bx-right-arrow-alt"></i> {formatDate(project.endDate)}
                      </div>
                      <span className={'pj-track pv-tile-track s-' + statusKey(status)}><span style={{ width: `${schedule.percent}%` }}></span></span>
                      <small>{schedule.text}</small>
                    </Tile>
                  </div>
                  <div className="col-sm-6 col-xl-3">
                    <Tile icon="bx-stopwatch" tone="amber" label="Time logged">
                      <div className="pv-tile-value">{stats.hours}</div>
                      <small>across {stats.total} task{stats.total === 1 ? '' : 's'}</small>
                    </Tile>
                  </div>
                  <div className="col-sm-6 col-xl-3">
                    <Tile icon="bx-user-pin" tone="cyan" label="Project manager">
                      {managerName ? (
                        <div className="pv-person">
                          <span className="pj-mini-avatar">{initials(managerName)}</span>
                          <strong>{managerName}</strong>
                        </div>
                      ) : <div className="pv-tile-value is-empty">Not assigned</div>}
                      <small>{members.length} team member{members.length === 1 ? '' : 's'}</small>
                    </Tile>
                  </div>
                </div>

                {/* Overview: description, team, attachments */}
                <div className="pv-overview">
                  <section className="pv-section">
                    <h6 className="pv-section-title">Description</h6>
                    {project.description
                      ? <p className="pv-description">{project.description}</p>
                      : <p className="pv-empty-text">No description provided.</p>}
                  </section>

                  <section className="pv-section">
                    <h6 className="pv-section-title">Team <span className="pv-count">{members.length}</span></h6>
                    {members.length === 0 ? (
                      <p className="pv-empty-text">No team members assigned.</p>
                    ) : (
                      <div className="pv-members">
                        {members.map((member) => {
                          const name = member.profile ? userName(member) : 'Unknown user';
                          return (
                            <div className="pv-member" key={member._id} title={member?.emails?.[0]?.address || name}>
                              <span className="pv-member-avatar" style={{ '--c': avatarColor(name) }}>{initials(name)}</span>
                              <span className="pv-member-text">
                                <strong>{name}</strong>
                                {member?.emails?.[0]?.address && <small>{member.emails[0].address}</small>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {attachments.length > 0 && (
                    <section className="pv-section">
                      <h6 className="pv-section-title">Attachments <span className="pv-count">{attachments.length}</span></h6>
                      <div className="pv-files">
                        {attachments.map((attachment, index) => (
                          <ViewAttachment key={index} attachment={attachment} projectId={projectId} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Tasks */}
                <section className="pv-section pv-tasks">
                  <div className="pv-tasks-head">
                    <h6 className="pv-section-title mb-0">Tasks <span className="pv-count">{stats.total}</span></h6>
                    {stats.total > 0 && <TableExportButtons scope="viewProjectTasks" size="btn-sm" config={exportConfig} />}
                  </div>

                  {stats.total === 0 ? (
                    <div className="pv-empty">
                      <i className="bx bx-task"></i>
                      <p>No tasks have been added to this project yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="pv-tasks-toolbar">
                        <div className="pv-filters" role="tablist" aria-label="Filter tasks by status">
                          {STATUS_FILTERS.filter((f) => f === 'All' || stats.counts[f]).map((f) => (
                            <button type="button" key={f} role="tab" aria-selected={statusFilter === f}
                              className={'pv-filter' + (statusFilter === f ? ' active' : '')} onClick={() => setStatusFilter(f)}>
                              {f}<span>{f === 'All' ? stats.total : stats.counts[f]}</span>
                            </button>
                          ))}
                        </div>
                        <div className="pv-search">
                          <i className="bx bx-search"></i>
                          <input type="search" className="form-control form-control-sm" placeholder="Search tasks…"
                            value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search tasks" />
                        </div>
                      </div>

                      <div className="pv-table-wrap">
                        <table className="pv-table">
                          <thead>
                            <tr>
                              <th>Task</th>
                              <th>Status</th>
                              <th>Progress</th>
                              <th>Time</th>
                              <th>Baseline</th>
                              <th>Actual</th>
                              <th>Timeline</th>
                              <th aria-label="Open"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleTasks.map((task) => <ViewTaskRow key={task._id} task={task} />)}
                          </tbody>
                        </table>
                        {visibleTasks.length === 0 && (
                          <div className="pv-empty is-compact"><p>No tasks match this filter.</p></div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
