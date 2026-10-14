/**
 * Task Detail modal for the rebuilt board.
 *
 *   <TaskDetailModalUpdated board={board} />
 *
 * State lives on the Task page (set by board.openTaskDetail):
 *   board.detailTask      slim card doc (instant display on click)
 *   board.detailFullTask  full doc via projectTasks.getById (comments, attachments,
 *                         activity log, dependencies, dates ...)
 *   board.detailTicket    linked ticket via tickets.getById, when the task has one
 *   board.detailLoading   true while the full doc is being fetched
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';

import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { formatRelativeTime } from '../../lib/customFunctions';
import { TASK_REQUEST_TYPES } from '../../lib/taskRequestType';
import TaskRequestTypeBadge from '../../components/TaskRequestTypeBadge';
import { DetailHeader, DetailSection, DetailGrid, DetailField, StatTile, Pill, Person, EmptyState } from '../../components/detailModal/DetailModal';
import { ListSkeleton } from '../../components/skeleton/Skeleton';
import { formatSeconds, clearLegacyTimerShadow, refreshTaskDetail, userFullName } from './updatedTaskUtils';
import TaskAttachmentsUpdated from './TaskAttachmentsUpdated';

const TICKET_STATUS = {
  open: { label: 'Open', tone: 'gray' },
  assigned: { label: 'Assigned', tone: 'blue' },
  in_progress: { label: 'In Progress', tone: 'blue' },
  on_hold: { label: 'On Hold', tone: 'amber' },
  in_review: { label: 'In Review', tone: 'purple' },
  closed: { label: 'Closed', tone: 'green' }
};

const TICKET_PRIORITY_TONE = {
  critical: 'red',
  high: 'amber',
  medium: 'cyan',
  low: 'green'
};

const TASK_PRIORITY_META = {
  Critical: { tone: 'red', icon: 'bx-error-circle' },
  High: { tone: 'amber', icon: 'bx-up-arrow-alt' },
  Medium: { tone: 'cyan', icon: 'bx-minus' },
  Low: { tone: 'gray', icon: 'bx-down-arrow-alt' }
};

const TASK_STATUS_COLOR = {
  Completed: 'success',
  'In Progress': 'primary',
  Testing: 'info',
  'On Hold': 'secondary'
};

// Bootstrap badge colour -> detail-modal pill tone
const BADGE_TONES = {
  success: 'green',
  warning: 'amber',
  danger: 'red',
  info: 'cyan',
  primary: 'indigo',
  secondary: 'gray'
};

// Activity log entry type -> timeline dot tone
const ACTIVITY_TONES = {
  status: 'cyan',
  comment: 'green',
  assignment: 'amber',
  timer: 'gray',
  field_update: 'purple'
};

function hoursText(value) {
  return value ? `${value} hrs` : '—';
}

function dateTimeText(value) {
  return value ? moment(value).format('DD-MM-YY hh:mm A') : '—';
}

function dateInputValue(value) {
  return value ? moment(value).format('YYYY-MM-DD') : '';
}

function commentTime(comment) {
  return comment && comment.createdAt ? moment(comment.createdAt).format('MMM DD, YYYY h:mm A') : '';
}

function userOptionName(user) {
  const name = userFullName(user);
  const email = user.emails && user.emails.length > 0 ? user.emails[0].address : '';
  return email ? `${name} (${email})` : name;
}

/** A value as the text an input shows (nothing for a missing value). */
function inputText(value) {
  return (value === undefined || value === null) ? '' : String(value);
}

/**
 * What the Edit and Assignment forms show for a task, keyed by the id of the
 * form field.
 */
function formFieldsFromTask(task) {
  const timeSpent = (task && task.timeSpent) || 0;
  return {
    editProjectId: inputText(task && task.projectId),
    editTaskName: inputText(task && task.taskName),
    editRequestType: inputText(task && task.requestType),
    editPhase: inputText(task && task.phase),
    editDuration: inputText(task && task.duration),
    editResponsibility: inputText(task && task.responsibility),
    editStatus: (task && task.status) || 'Pending',
    editPriority: (task && task.priority) || 'Low',
    editPlannedHours: inputText(task && task.plannedHours),
    editActualHours: inputText(task && task.actualHours),
    editTimeSpentHours: String(Math.floor(timeSpent / 3600)),
    editTimeSpentMinutes: String(Math.floor((timeSpent % 3600) / 60)),
    editTimeSpentSeconds: String(timeSpent % 60),
    editBaselineStart: dateInputValue(task && task.baselineStart),
    editBaselineFinish: dateInputValue(task && task.baselineFinish),
    editActualStart: dateInputValue(task && task.actualStart),
    editActualFinish: dateInputValue(task && task.actualFinish),
    assignUser: inputText(task && task.assignedTo)
  };
}

/** The activity log, newest first, ready for display. */
function buildActivityEntries(fullTask) {
  if (!fullTask || !Array.isArray(fullTask.activityLog)) return [];
  return fullTask.activityLog
    .slice()
    .sort((a, x) => new Date(x.timestamp) - new Date(a.timestamp))
    .map(log => {
      let actionText = log.action;
      if (log.type === 'timer' && log.duration) {
        const mins = Math.floor(log.duration / 60);
        const secs = log.duration % 60;
        actionText += ` (${mins}m ${secs}s)`;
      }
      return {
        tone: ACTIVITY_TONES[log.type] || 'indigo',
        actionText,
        performedByName: log.performedByName || 'Unknown',
        relativeTime: formatRelativeTime(log.timestamp),
        fullTime: moment(log.timestamp).format('MMM DD, YYYY h:mm A')
      };
    });
}

export default function TaskDetailModalUpdated({ board }) {
  const { userCan } = useAuth();
  const assignUserRef = useRef(null);

  /** Merged task for display: full doc when loaded, else the slim card doc. */
  const detail = board ? (board.detailFullTask || board.detailTask) : null;
  const fullTask = board ? board.detailFullTask : null;
  const ticket = board ? board.detailTicket : null;
  const loadingFull = board ? board.detailLoading : false;

  const projectOptions = board ? (board.projectsList || []) : [];
  const userOptions = board ? (board.usersList || []) : [];

  // The Edit / Assignment form fields. They start from the task's values; when
  // the task doc changes, only the fields whose task value changed are
  // replaced, so what the user is typing in the other fields stays.
  const taskFields = formFieldsFromTask(detail);
  const taskFieldsKey = JSON.stringify(taskFields);
  const [formFields, setFormFields] = useState(taskFields);
  const shownTaskFieldsRef = useRef(taskFields);
  useEffect(() => {
    const previous = shownTaskFieldsRef.current;
    shownTaskFieldsRef.current = taskFields;
    setFormFields(current => {
      const next = { ...current };
      Object.keys(taskFields).forEach(name => {
        if (taskFields[name] !== previous[name]) next[name] = taskFields[name];
      });
      return next;
    });
  }, [taskFieldsKey]);

  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [commenting, setCommenting] = useState(false);

  /** A form field changed: its id is its name in formFields. */
  const handleFieldChange = (event) => {
    const { id, value } = event.target;
    setFormFields(current => ({ ...current, [id]: value }));
  };

  // --- Details tab values ---
  const detailProjectName = () => {
    if (!board || !detail || !detail.projectId) return '-';
    const project = (board.projectMap || {})[detail.projectId];
    return project ? project.name : 'Unknown Project';
  };

  const assignedToName = () => {
    if (!board || !detail || !detail.assignedTo) return '-';
    const user = (board.userMap || {})[detail.assignedTo];
    if (!user) return '-';
    return userFullName(user) || '-';
  };

  const assignedToEmail = () => {
    if (!board || !detail || !detail.assignedTo) return '';
    const user = (board.userMap || {})[detail.assignedTo];
    return user && user.emails && user.emails.length > 0 ? user.emails[0].address : 'No email';
  };

  const durationText = detail && detail.duration ? `${detail.duration} days` : '—';
  const timeSpentText = formatSeconds(detail ? detail.timeSpent : 0);
  const statusLabel = (detail && detail.status) || 'Pending';
  const statusColor = TASK_STATUS_COLOR[detail && detail.status] || 'warning';
  const priorityLabel = (detail && detail.priority) || 'Low';
  const priorityMeta = TASK_PRIORITY_META[priorityLabel] || TASK_PRIORITY_META.Low;

  // --- Linked ticket ---
  const ticketStatusMeta = ticket && TICKET_STATUS[ticket.status];
  const ticketStatusLabel = !ticket ? '' : (ticketStatusMeta ? ticketStatusMeta.label : ticket.status);
  const ticketStatusTone = ticketStatusMeta ? ticketStatusMeta.tone : 'gray';
  const ticketPriorityLabel = (!ticket || !ticket.priority)
    ? ''
    : ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1);
  const ticketPriorityTone = (ticket && TICKET_PRIORITY_TONE[ticket.priority]) || 'gray';

  // --- Comments / attachments / activity (from the full doc) ---
  const comments = (fullTask && fullTask.comments) || [];
  const commentsCount = fullTask && fullTask.comments ? fullTask.comments.length : 0;
  const attachmentsCount = fullTask && fullTask.attachments ? fullTask.attachments.length : 0;
  const activityEntries = buildActivityEntries(fullTask);

  /**
   * Edit tab save. Calls projectTasks.updateWithDetails — the server logs the
   * activity, stops the timer when the status leaves In Progress/Testing,
   * notifies a new assignee, and (when Time Spent was edited) records both
   * the legacy manual_edit log AND the taskAdjustment for the sessions model.
   */
  const handleEditSubmit = (event) => {
    event.preventDefault();

    if (!board || !detail) return;
    const taskId = detail._id;
    const previousStatus = detail.status || 'Pending';

    // Editing Time Spent while a timer runs would fight the session's own
    // commit — require a stopped timer first (fresh check from the board's columns).
    const liveDoc = board.findLiveTask(taskId);
    const timerState = liveDoc && liveDoc.timerState;
    if (timerState && typeof timerState === 'object' && (timerState.isRunning || timerState.isPaused)) {
      toastr.warning('Please stop the timer before saving changes so your tracked time is preserved.');
      return;
    }

    // Read the fields from the form itself (a dropdown whose task value is
    // not among its options shows - and sends - its first option).
    const form = event.currentTarget;
    const fieldValue = (id) => form.querySelector('#' + id).value;

    const hours = parseInt(fieldValue('editTimeSpentHours'), 10) || 0;
    const minutes = parseInt(fieldValue('editTimeSpentMinutes'), 10) || 0;
    const seconds = parseInt(fieldValue('editTimeSpentSeconds'), 10) || 0;

    const updateData = {
      projectId: fieldValue('editProjectId'),
      taskName: fieldValue('editTaskName').trim(),
      phase: fieldValue('editPhase').trim(),
      duration: parseFloat(fieldValue('editDuration')) || 0,
      responsibility: fieldValue('editResponsibility').trim(),
      status: fieldValue('editStatus'),
      priority: fieldValue('editPriority'),
      plannedHours: parseFloat(fieldValue('editPlannedHours')) || 0,
      actualHours: parseFloat(fieldValue('editActualHours')) || 0,
      timeSpent: hours * 3600 + minutes * 60 + seconds,
      baselineStart: fieldValue('editBaselineStart') || null,
      baselineFinish: fieldValue('editBaselineFinish') || null,
      actualStart: fieldValue('editActualStart') || null,
      actualFinish: fieldValue('editActualFinish') || null
    };

    // Only sent once chosen: a task from before the field existed stays
    // unset rather than logging a "-" → "-" change on every save.
    const requestType = fieldValue('editRequestType');
    if (requestType) updateData.requestType = requestType;

    if (!updateData.taskName) {
      toastr.error('Task name is required');
      return;
    }
    if (!updateData.projectId) {
      toastr.error('Project is required');
      return;
    }

    setSaving(true);

    api.call('projectTasks.updateWithDetails', taskId, updateData, (error, result) => {
      setSaving(false);

      if (error) {
        toastr.error(error.reason || 'Failed to update task');
        return;
      }

      if (result && result.changed) {
        toastr.success('Task updated successfully');
      } else {
        toastr.info('No changes to save');
      }

      // A timeSpent edit changed today's totals; a status change may have
      // moved the task to another column (board lists update by themselves).
      board.refreshTodayHours();
      board.refreshColumnCounts();
      clearLegacyTimerShadow(taskId);

      if (updateData.status && updateData.status !== previousStatus) {
        api.call('tickets.syncFromTaskStatus', taskId, updateData.status, () => {});
        if (updateData.status === 'In Progress') {
          board.autoStartTimerIfFree(taskId);
        }
      }

      // Refresh the modal's data and land on the Details tab with new values
      refreshTaskDetail(board, taskId);
      $('#taskDetailModal .nav-link').removeClass('active');
      $('#taskDetailModal .tab-pane').removeClass('show active');
      $('#details-tab').addClass('active');
      $('#details').addClass('show active');
    });
  };

  /**
   * Assignment tab: assign the selected user. The server records the activity
   * and notifies the new assignee; the board card updates by itself (and the
   * task leaves the column if the user filter no longer matches it).
   */
  const handleSaveAssignment = (event) => {
    event.preventDefault();

    if (!board || !detail) return;

    const userId = assignUserRef.current.value;
    if (!userId) {
      toastr.error('Please select a user');
      return;
    }

    setAssigning(true);

    api.call('projectTasks.assign', detail._id, userId, (error) => {
      setAssigning(false);
      if (error) {
        toastr.error(error.reason || 'Failed to assign user');
        return;
      }
      toastr.success('User assigned successfully');
      board.refreshColumnCounts();
      refreshTaskDetail(board, detail._id);
    });
  };

  /**
   * Comments tab: post a comment. The list re-renders from the refreshed
   * full doc.
   */
  const handleAddComment = (event) => {
    event.preventDefault();

    if (!board || !detail) return;

    const comment = (newComment || '').trim();
    if (!comment) {
      toastr.error('Please enter a comment');
      return;
    }

    setCommenting(true);

    api.call('projectTasks.addComment', detail._id, comment, (error) => {
      setCommenting(false);
      if (error) {
        toastr.error(error.reason || 'Failed to add comment');
        return;
      }
      toastr.success('Comment added');
      setNewComment('');
      refreshTaskDetail(board, detail._id);
    });
  };

  const statusTone = BADGE_TONES[statusColor] || 'amber';
  const tabLink = (id, pane, icon, label, count) => (
    <li className="nav-item" role="presentation">
      <a className={'nav-link' + (id === 'details-tab' ? ' active' : '')} id={id} data-bs-toggle="tab" href={'#' + pane} role="tab" aria-controls={pane}>
        <i className={'bx ' + icon}></i>
        <span className="d-none d-md-inline">{label}</span>
        {count !== undefined && <span className="td-tab-count">{count}</span>}
      </a>
    </li>
  );

  return (
    <div className="modal fade dm-modal td-modal" id="taskDetailModal" tabIndex="-1" aria-hidden="true" aria-labelledby="taskDetailTitle">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <DetailHeader
            icon="bx-task"
            tone={statusTone}
            eyebrow={(detail && detail.taskId) || 'Task Details'}
            title={(detail && detail.taskName) || 'Task Details'}
            titleId="taskDetailTitle"
            meta={detail && (
              <>
                <Pill tone={statusTone} dot>{statusLabel}</Pill>
                <Pill tone={priorityMeta.tone} icon={priorityMeta.icon}>{priorityLabel}</Pill>
                {detail.projectId && <span className="dm-meta"><i className="bx bx-briefcase"></i>{detailProjectName()}</span>}
              </>
            )}
            closeProps={{ 'data-dismiss': undefined, 'data-bs-dismiss': 'modal' }}
          />
          <div className="modal-body p-0">
            {/* Nav Tabs */}
            <ul className="nav task-detail-tabs td-tabs" role="tablist">
              {tabLink('details-tab', 'details', 'bx-info-circle', 'Details')}
              {userCan('task_update') && tabLink('edit-tab', 'editTask', 'bx-edit', 'Edit')}
              {tabLink('assignment-tab', 'assignment', 'bx-user', 'Assignment')}
              {tabLink('comments-tab', 'comments', 'bx-message-square-dots', 'Comments', commentsCount)}
              {tabLink('attachments-tab', 'attachments', 'bx-paperclip', 'Attachments', attachmentsCount)}
              {tabLink('activity-tab', 'activity', 'bx-history', 'Activity')}
            </ul>

            {/* Tab Content */}
            <div className="tab-content task-detail-content td-content">
              {/* Details Tab */}
              <div className="tab-pane fade show active" id="details" role="tabpanel" aria-labelledby="details-tab">
                <div className="td-stack">
                  {/* Task Metrics */}
                  <div className="dm-stats">
                    <StatTile icon="bx-stopwatch" tone="indigo" label="Time spent" value={timeSpentText} />
                    <StatTile icon="bx-time-five" tone="cyan" label="Planned hours" value={hoursText(detail && detail.plannedHours)} />
                    <StatTile icon="bx-timer" tone="amber" label="Actual hours" value={hoursText(detail && detail.actualHours)} />
                    <StatTile icon="bx-calendar" tone="green" label="Duration" value={durationText} />
                  </div>

                  {/* Task Overview */}
                  <DetailSection title="Overview" icon="bx-detail">
                    <DetailGrid>
                      <DetailField label="Task ID">{detail && detail.taskId}</DetailField>
                      <DetailField label="Project">{detailProjectName()}</DetailField>
                      <DetailField label="Task Name" wide>{detail && detail.taskName}</DetailField>
                      <DetailField label="Status"><Pill tone={statusTone} dot>{statusLabel}</Pill></DetailField>
                      <DetailField label="Priority"><Pill tone={priorityMeta.tone} icon={priorityMeta.icon}>{priorityLabel}</Pill></DetailField>
                      <DetailField label="Request Type">
                        {detail && detail.requestType ? <TaskRequestTypeBadge requestType={detail.requestType} /> : null}
                      </DetailField>
                      <DetailField label="Responsibility">{detail && detail.responsibility}</DetailField>
                      <DetailField label="Assigned To" empty="Not assigned">
                        {assignedToName() !== '-' ? <Person name={assignedToName()} inline /> : null}
                      </DetailField>
                      <DetailField label="Dependencies" empty="None">{detail && detail.dependencies}</DetailField>
                      <DetailField label="Phase/Activity" wide text>
                        {detail && detail.phase ? <span className="detail-phase-text">{detail.phase}</span> : null}
                      </DetailField>
                    </DetailGrid>
                  </DetailSection>

                  {/* Linked Ticket Info (shown if task is linked to a ticket) */}
                  {ticket && (
                    <DetailSection title="Linked Ticket" icon="bx-receipt" className="td-ticket">
                      <DetailGrid cols={3}>
                        <DetailField label="Ticket ID">
                          {ticket.ticketId ? <span className="td-ticket-id">{ticket.ticketId}</span> : null}
                        </DetailField>
                        <DetailField label="Status">
                          {ticketStatusLabel ? <Pill tone={ticketStatusTone} dot>{ticketStatusLabel}</Pill> : null}
                        </DetailField>
                        <DetailField label="Priority">
                          {ticketPriorityLabel ? <Pill tone={ticketPriorityTone}>{ticketPriorityLabel}</Pill> : null}
                        </DetailField>
                        <DetailField label="Subject" wide>{ticket.subject}</DetailField>
                        <DetailField label="Client">{ticket.clientName}</DetailField>
                        <DetailField label="Type">{ticket.typeCode}</DetailField>
                        {ticket.description && (
                          <div className="dm-field is-wide">
                            <div className="dm-label">Description</div>
                            <div className="dm-callout td-ticket-desc">{ticket.description}</div>
                          </div>
                        )}
                      </DetailGrid>
                    </DetailSection>
                  )}

                  {/* Dates */}
                  <DetailSection title="Schedule" icon="bx-calendar-event" flush>
                    <div className="dm-table-wrap">
                      <table className="dm-table">
                        <thead>
                          <tr>
                            <th></th>
                            <th>Start</th>
                            <th>Finish</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="td-row-label">Baseline</td>
                            <td>{dateTimeText(detail && detail.baselineStart)}</td>
                            <td>{dateTimeText(detail && detail.baselineFinish)}</td>
                          </tr>
                          <tr>
                            <td className="td-row-label">Actual</td>
                            <td>{dateTimeText(detail && detail.actualStart)}</td>
                            <td>{dateTimeText(detail && detail.actualFinish)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </DetailSection>

                </div>
              </div>

              {/* Edit Tab */}
              <div className="tab-pane fade" id="editTask" role="tabpanel">
                <form id="editTaskForm" className="td-stack" onSubmit={handleEditSubmit}>

                  {/* Basic Info */}
                  <section className="dm-section">
                    <div className="dm-section-head">
                      <h6 className="dm-section-title"><i className="bx bx-info-circle"></i>Basic Information</h6>
                    </div>
                    <div>
                      <div className="row g-2">
                        <div className="col-md-12">
                          <label className="form-label td-label">Project <span className="text-danger">*</span></label>
                          <select className="form-select form-select-sm" id="editProjectId" style={{ width: '100%' }}
                            value={formFields.editProjectId} onChange={handleFieldChange}>
                            {projectOptions.map(project => (
                              <option key={project._id} value={project._id}>{project.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-12">
                          <label className="form-label td-label">Task Name <span className="text-danger">*</span></label>
                          <input type="text" className="form-control form-control-sm" id="editTaskName"
                            value={formFields.editTaskName} onChange={handleFieldChange} />
                        </div>
                        <div className="col-md-12">
                          <label className="form-label td-label">Request Type</label>
                          <select className="form-select form-select-sm" id="editRequestType" style={{ width: '100%' }}
                            value={formFields.editRequestType} onChange={handleFieldChange}>
                            {!(detail && detail.requestType) && (
                              <option value="">Not set</option>
                            )}
                            {TASK_REQUEST_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-12">
                          <label className="form-label td-label">Phase/Activity</label>
                          <textarea className="form-control form-control-sm" id="editPhase" rows="3"
                            placeholder="Enter phase/activity details..."
                            value={formFields.editPhase} onChange={handleFieldChange}></textarea>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label td-label">Duration (days)</label>
                          <input className="form-control form-control-sm" id="editDuration" min="0"
                            value={formFields.editDuration} onChange={handleFieldChange} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label td-label">Responsibility</label>
                          <input type="text" className="form-control form-control-sm" id="editResponsibility"
                            value={formFields.editResponsibility} onChange={handleFieldChange} />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Status & Priority */}
                  <section className="dm-section">
                    <div className="dm-section-head">
                      <h6 className="dm-section-title"><i className="bx bx-flag"></i>Status &amp; Priority</h6>
                    </div>
                    <div>
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label className="form-label td-label">Status</label>
                          <select className="form-select form-select-sm" id="editStatus" style={{ width: '100%' }}
                            value={formFields.editStatus} onChange={handleFieldChange}>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Testing">Testing</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label td-label">Priority</label>
                          <select className="form-select form-select-sm" id="editPriority" style={{ width: '100%' }}
                            value={formFields.editPriority} onChange={handleFieldChange}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Hours */}
                  <section className="dm-section">
                    <div className="dm-section-head">
                      <h6 className="dm-section-title"><i className="bx bx-time-five"></i>Hours Tracking</h6>
                    </div>
                    <div>
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label className="form-label td-label">Planned Hours</label>
                          <input type="number" className="form-control form-control-sm" id="editPlannedHours" min="0"
                            step="any" value={formFields.editPlannedHours} onChange={handleFieldChange} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label td-label">Actual Hours</label>
                          <input type="number" className="form-control form-control-sm" id="editActualHours" min="0"
                            step="any" value={formFields.editActualHours} onChange={handleFieldChange} />
                        </div>
                        <div className="col-md-12">
                          <label className="form-label td-label">Time Spent</label>
                          <div className="row g-1">
                            <div className="col-4">
                              <div className="input-group input-group-sm">
                                <input type="number" className="form-control form-control-sm" id="editTimeSpentHours"
                                  min="0" value={formFields.editTimeSpentHours} onChange={handleFieldChange} />
                                <span className="input-group-text">hr</span>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="input-group input-group-sm">
                                <input type="number" className="form-control form-control-sm" id="editTimeSpentMinutes"
                                  min="0" max="59" value={formFields.editTimeSpentMinutes} onChange={handleFieldChange} />
                                <span className="input-group-text">min</span>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="input-group input-group-sm">
                                <input type="number" className="form-control form-control-sm" id="editTimeSpentSeconds"
                                  min="0" max="59" value={formFields.editTimeSpentSeconds} onChange={handleFieldChange} />
                                <span className="input-group-text">sec</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Dates */}
                  <section className="dm-section">
                    <div className="dm-section-head">
                      <h6 className="dm-section-title"><i className="bx bx-calendar"></i>Dates</h6>
                    </div>
                    <div>
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label className="form-label td-label">Baseline Start</label>
                          <input type="date" className="form-control form-control-sm" id="editBaselineStart"
                            value={formFields.editBaselineStart} onChange={handleFieldChange} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label td-label">Baseline Finish</label>
                          <input type="date" className="form-control form-control-sm" id="editBaselineFinish"
                            value={formFields.editBaselineFinish} onChange={handleFieldChange} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label td-label">Actual Start</label>
                          <input type="date" className="form-control form-control-sm" id="editActualStart"
                            value={formFields.editActualStart} onChange={handleFieldChange} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label td-label">Actual Finish</label>
                          <input type="date" className="form-control form-control-sm" id="editActualFinish"
                            value={formFields.editActualFinish} onChange={handleFieldChange} />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Save Button */}
                  <div className="d-grid td-form-actions">
                    <button type="submit" className="btn btn-primary" id="saveEditedTask" disabled={saving}>
                      {saving
                        ? <><i className="fa fa-spinner fa-spin me-2"></i>Saving...</>
                        : <><i className="fa fa-save me-2"></i>Save All Changes</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Assignment Tab */}
              <div className="tab-pane fade" id="assignment" role="tabpanel" aria-labelledby="assignment-tab">
                <div className="td-stack">
                  <DetailSection title="Currently Assigned To" icon="bx-user-check">
                    {detail && detail.assignedTo ? (
                      <Person name={assignedToName() !== '-' ? assignedToName() : ''} sub={assignedToEmail()} />
                    ) : (
                      <p className="td-muted mb-0">Not assigned</p>
                    )}
                  </DetailSection>
                  <DetailSection title="Assign User" icon="bx-user-plus">
                    <label className="form-label td-label" htmlFor="assignUser">User</label>
                    <select className="form-select" id="assignUser" style={{ width: '100%' }} ref={assignUserRef}
                      value={formFields.assignUser} onChange={handleFieldChange}>
                      <option value="">-- Select User --</option>
                      {userOptions.map(user => (
                        <option key={user._id} value={user._id}>{userOptionName(user)}</option>
                      ))}
                    </select>
                    <div className="td-form-actions">
                      <button type="button" className="btn btn-primary" id="saveAssignment" disabled={assigning} onClick={handleSaveAssignment}>
                        <i className="fa fa-user-plus me-1"></i>Assign User
                      </button>
                    </div>
                  </DetailSection>
                </div>
              </div>

              {/* Comments Tab */}
              <div className="tab-pane fade" id="comments" role="tabpanel" aria-labelledby="comments-tab">
                <div className="td-stack">
                  <DetailSection title="Add Comment" icon="bx-comment-add">
                    <textarea className="form-control" id="newComment" rows="3" aria-label="Add Comment"
                      placeholder="Type your comment here..."
                      value={newComment} onChange={(event) => setNewComment(event.target.value)}></textarea>
                    <div className="td-form-actions">
                      <button type="button" className="btn btn-primary" id="addComment" disabled={commenting} onClick={handleAddComment}>
                        <i className="fa fa-comment me-1"></i>Post Comment
                      </button>
                    </div>
                  </DetailSection>
                  <DetailSection title="Comments" icon="bx-message-square-dots" count={commentsCount}>
                    <div id="commentsList">
                      {loadingFull ? (
                        <ListSkeleton rows={3} label="Loading comments…" />
                      ) : comments.length > 0 ? (
                        <ul className="dm-timeline td-comments">
                          {comments.map((comment, index) => (
                            <li className="dm-tone-indigo" key={index}>
                              <div className="td-entry-head">
                                <span className="comment-author">{comment.userName}</span>
                                <span className="comment-time">{commentTime(comment)}</span>
                              </div>
                              <div className="comment-text td-entry-text">{comment.text}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyState icon="bx-message-square">No comments yet</EmptyState>
                      )}
                    </div>
                  </DetailSection>
                </div>
              </div>

              {/* Attachments Tab (self-contained widget) */}
              <div className="tab-pane fade" id="attachments" role="tabpanel" aria-labelledby="attachments-tab">
                <TaskAttachmentsUpdated board={board} />
              </div>

              {/* Activity Log Tab */}
              <div className="tab-pane fade" id="activity" role="tabpanel" aria-labelledby="activity-tab">
                <DetailSection title="Activity" icon="bx-history" count={loadingFull ? undefined : activityEntries.length}>
                  {loadingFull ? (
                    <ListSkeleton rows={4} label="Loading activity…" />
                  ) : activityEntries.length > 0 ? (
                    <ul className="dm-timeline">
                      {activityEntries.map((entry, index) => (
                        <li className={'dm-tone-' + entry.tone} key={index}>
                          <div className="td-entry-head">
                            <strong>{entry.actionText}</strong>
                            <span title={entry.fullTime}>{entry.relativeTime}</span>
                          </div>
                          <div className="td-entry-sub">
                            by {entry.performedByName} • {entry.fullTime}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon="bx-history">No activity recorded yet</EmptyState>
                  )}
                </DetailSection>
              </div>
            </div>
          </div>
          <div className="dm-footer">
            <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
