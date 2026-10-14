/**
 * View Ticket Modal (#ticketDetailModal): details, attachments, comments, quick actions,
 * activity log and linked tasks of one ticket.
 *
 *   openTicketDetailModal(ticketId);   // loads the ticket and shows it
 *   clearTicketComment();              // empties the "Add a comment..." box
 */
import { useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DetailHeader, DetailSection, DetailGrid, DetailField, Pill, Person, EmptyState, colorFor, initialsOf } from '../../components/detailModal/DetailModal';
import { requestTypeBadgeClass } from '../../lib/taskRequestType';
import Select2 from './Select2';
import Select2DataLoad from './Select2DataLoad';
import TicketAttachmentRow from './TicketAttachmentRow';
import { openCommentEmailConfirm } from './CommentEmailConfirmModal';
import { openCreateTaskModal } from './CreateTaskModal';
import { openStaffSendEmailModal } from './StaffSendEmailModal';
import { openEditTicketModal } from './TicketFormModal';
import { createModalHandle, useModalHandle } from './modalHandle';
import { TICKET_STATUS_LABELS, getTaskStatusBadgeClass } from './ticketHelpers';
import './ticketDetail.css';

const modal = createModalHandle();

export function openTicketDetailModal(ticketId) {
  modal.call('open', ticketId);
}

export function clearTicketComment() {
  modal.call('clearComment');
}

const FULL_WIDTH = { width: '100%' };
const HIDDEN = { display: 'none' };

// Status pill tones (same hues as the old inline colours)
const STATUS_TONES = {
  open: 'gray',
  assigned: 'cyan',
  in_progress: 'blue',
  on_hold: 'amber',
  in_review: 'purple',
  closed: 'green'
};

const PRIORITIES = {
  critical: { tone: 'red', label: 'Critical' },
  high: { tone: 'amber', label: 'High' },
  medium: { tone: 'blue', label: 'Medium' },
  low: { tone: 'gray', label: 'Low' }
};

// Bootstrap badge class ("bg-success", "bg-label-info", ...) -> Pill tone
const BADGE_TONES = { success: 'green', warning: 'amber', danger: 'red', info: 'cyan', primary: 'indigo', secondary: 'gray', dark: 'gray' };

function toneOf(badgeClass) {
  const match = /bg-(?:label-)?(\w+)/.exec(badgeClass || '');
  return (match && BADGE_TONES[match[1]]) || 'gray';
}

function DetailStatusBadge({ status }) {
  return <Pill tone={STATUS_TONES[status] || 'gray'} dot>{TICKET_STATUS_LABELS[status] || status || 'Not set'}</Pill>;
}

/** Nothing for an unknown priority (as before). */
function DetailPriorityBadge({ priority }) {
  const badge = PRIORITIES[priority];
  if (!badge) return null;
  return <Pill tone={badge.tone} icon="bx-flag">{badge.label}</Pill>;
}

const CHECK_ICON = <i className="fa fa-check"></i>;
const SPINNER_ICON = <i className="fa fa-spinner fa-spin"></i>;

/**
 * currentTicket / setCurrentTicket = the ticket shown here (kept by the page, other modals read it).
 * onStatusChanged / onAssignmentChanged = the page reloads its list.
 */
export default function TicketDetailModal({ currentTicket, setCurrentTicket, assignableUsers, onStatusChanged, onAssignmentChanged }) {
  const { userCan } = useAuth();
  const ticket = currentTicket;

  const [linkedTasks, setLinkedTasks] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Quick Actions
  const [quickStatus, setQuickStatus] = useState('');
  const [statusChangeDisabled, setStatusChangeDisabled] = useState(true);
  const [statusChanging, setStatusChanging] = useState(false);
  const [quickUsers, setQuickUsers] = useState([]);
  const [quickAssignee, setQuickAssignee] = useState('');
  const [assignChangeDisabled, setAssignChangeDisabled] = useState(true);
  const [assignChanging, setAssignChanging] = useState(false);

  /**
   * Open detail modal for a ticket
   */
  const open = (ticketId) => {
    api.call('tickets.getById', ticketId, (error, loadedTicket) => {
      if (error || !loadedTicket) {
        toastr.error('Failed to load ticket');
        return;
      }

      setCurrentTicket(loadedTicket);

      // Load linked tasks
      api.call('tickets.getLinkedTasks', loadedTicket._id, (err, tasks) => {
        setLinkedTasks(!err && tasks && tasks.length > 0 ? tasks : []);
      });

      // Quick Actions: nothing chosen, confirm buttons disabled
      setQuickStatus('');
      setStatusChangeDisabled(true);
      setStatusChanging(false);

      // Build list = "Unassign" pseudo-entry + real assignable users.
      setQuickUsers([
        { _id: 'unassign', profile: { firstName: 'Unassign', lastName: '' } },
        ...(assignableUsers || [])
      ]);
      setQuickAssignee('');
      setAssignChangeDisabled(true);
      setAssignChanging(false);

      $('#ticketDetailModal').modal('show');
    });
  };

  const clearComment = () => setNewComment('');

  useModalHandle(modal, { open, clearComment });

  /* ---------------------------------------------------------------- events */

  // Add comment - show email confirmation first
  const addComment = (event) => {
    event.preventDefault();
    const ticketId = ticket ? ticket._id : null;
    const comment = newComment.trim();

    if (!ticketId || !comment) return;

    openCommentEmailConfirm(ticketId, comment);
  };

  // Enter key to add comment
  const handleCommentKeyPress = (event) => {
    if (event.key === 'Enter') {
      addComment(event);
    }
  };

  // Quick status change - only enable/disable the confirm button; the actual
  // update happens when the user clicks #confirmStatusChange.
  const handleQuickStatusChange = (value) => {
    setQuickStatus(value);
    setStatusChangeDisabled(!value);
  };

  // Quick assign change - only enable/disable the confirm button; the actual
  // update happens when the user clicks #confirmAssignChange.
  const handleQuickAssignChange = (value) => {
    setQuickAssignee(value);
    setAssignChangeDisabled(!value);
  };

  // Confirm status change
  const confirmStatusChange = (event) => {
    event.preventDefault();
    const newStatus = quickStatus;
    const ticketId = ticket ? ticket._id : null;
    if (!newStatus || !ticketId) return;

    setStatusChangeDisabled(true);
    setStatusChanging(true);

    api.call('tickets.changeStatus', ticketId, newStatus, (error) => {
      setStatusChanging(false);
      if (error) {
        setStatusChangeDisabled(false);
        toastr.error(error.reason || 'Failed to change status');
        return;
      }
      toastr.success('Status updated');
      open(ticketId);
      onStatusChanged();
    });
  };

  // Confirm assignment change
  const confirmAssignChange = (event) => {
    event.preventDefault();
    const assignee = quickAssignee;
    const ticketId = ticket ? ticket._id : null;
    if (!assignee || !ticketId) return;

    setAssignChangeDisabled(true);
    setAssignChanging(true);

    const assigneeId = assignee === 'unassign' ? null : assignee;
    api.call('tickets.assign', ticketId, assigneeId, (error) => {
      setAssignChanging(false);
      if (error) {
        setAssignChangeDisabled(false);
        toastr.error(error.reason || 'Failed to change assignee');
        return;
      }
      toastr.success('Assignment updated');
      open(ticketId);
      onAssignmentChanged();
    });
  };

  // Edit from detail modal
  const editFromDetail = (event) => {
    event.preventDefault();
    const ticketId = ticket ? ticket._id : null;
    if (ticketId) {
      $('#ticketDetailModal').modal('hide');
      setTimeout(() => {
        openEditTicketModal(ticketId);
      }, 300);
    }
  };

  // Open Send Email modal from detail modal footer
  const sendEmailFromDetail = (event) => {
    event.preventDefault();
    if (!ticket) return;
    $('#ticketDetailModal').modal('hide');
    setTimeout(() => openStaffSendEmailModal(ticket), 300);
  };

  // Create Task from Ticket
  const createTaskFromTicket = (event) => {
    event.preventDefault();
    if (!ticket) return;
    openCreateTaskModal(ticket);
  };

  /* ---------------------------------------------------------------- markup */

  const attachments = (ticket && ticket.attachments) || [];
  const comments = (ticket && ticket.comments) || [];
  const activityLog = ((ticket && ticket.activityLog) || []).slice(-10).reverse();

  return (
    <div className="modal fade dm-modal" id="ticketDetailModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <DetailHeader
            icon="bx-support"
            tone={(ticket && STATUS_TONES[ticket.status]) || 'indigo'}
            eyebrow={<span id="detailTicketId">{ticket && ticket.ticketId}</span>}
            title={<span id="detailSubject">{ticket && ticket.subject}</span>}
            meta={ticket && (
              <>
                <span id="ticketDetailStatus"><DetailStatusBadge status={ticket.status} /></span>
                <span id="detailPriority"><DetailPriorityBadge priority={ticket.priority} /></span>
                {ticket.clientName && <span className="dm-meta"><i className="bx bx-buildings"></i>{ticket.clientName}</span>}
                <span className="dm-meta"><i className="bx bx-calendar"></i>{moment(ticket.createdAt).format('MMM DD, YYYY')}</span>
              </>
            )}
          />
          <div className="modal-body p-0">
            <div className="dm-body">
              <div className="row g-3">
                {/* Left Column - Ticket Info */}
                <div className="col-lg-8 d-flex flex-column gap-3">
                  {/* Description */}
                  <DetailSection title="Description" icon="bx-message-detail">
                    {ticket && ticket.description ? (
                      <p id="detailDescription" className="dm-callout mb-0">{ticket.description}</p>
                    ) : (
                      <p id="detailDescription" className="dm-value is-empty mb-0">{ticket && 'No description provided.'}</p>
                    )}
                  </DetailSection>

                  {/* Attachments */}
                  <div id="attachmentsCard" style={attachments.length > 0 ? undefined : HIDDEN}>
                    <DetailSection title="Attachments" icon="bx-paperclip" count={<span id="attachmentsCount">{attachments.length}</span>}>
                      <div id="attachmentsContainer" className="dm-files">
                        {attachments.map((attachment, index) => (
                          <TicketAttachmentRow key={`${attachment.path}-${index}`} attachment={attachment} />
                        ))}
                      </div>
                    </DetailSection>
                  </div>

                  {/* Comments */}
                  <DetailSection title="Comments" icon="bx-comment-detail" count={<span id="commentsCount">{comments.length}</span>}>
                    <div id="commentsContainer" className="tdm-comments">
                      {comments.map((comment, index) => (
                        <div className="tdm-comment" key={index}>
                          <span className="dm-person-avatar" style={{ '--c': colorFor(comment.userName) }}>{initialsOf(comment.userName)}</span>
                          <div className="tdm-comment-bubble">
                            <div className="tdm-comment-head">
                              <strong>{comment.userName}</strong>
                              <small>{moment(comment.createdAt).format('MMM DD, hh:mm A')}</small>
                            </div>
                            <p className="tdm-comment-text">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                      {ticket && comments.length === 0 && (
                        <EmptyState icon="bx-message-rounded">No comments yet</EmptyState>
                      )}
                    </div>

                    <div className="tdm-comment-box">
                      <div className="input-group">
                        <input type="text" className="form-control" id="newComment" placeholder="Add a comment..."
                          value={newComment} onChange={(event) => setNewComment(event.target.value)} onKeyPress={handleCommentKeyPress} />
                        <button className="btn btn-primary" type="button" id="addComment" onClick={addComment} title="Add comment">
                          <i className="fa fa-paper-plane"></i>
                        </button>
                      </div>
                    </div>
                  </DetailSection>

                  {/* Linked Tasks */}
                  <div id="linkedTasksSection" style={linkedTasks.length > 0 ? undefined : HIDDEN}>
                    <DetailSection title="Linked Tasks" icon="bx-task" count={linkedTasks.length} flush>
                      <div className="dm-table-wrap">
                        <table className="dm-table">
                          <thead>
                            <tr>
                              <th>Task</th>
                              <th>Status</th>
                              <th>Assigned</th>
                            </tr>
                          </thead>
                          <tbody id="linkedTasksBody">
                            {linkedTasks.map((task, index) => (
                              <tr key={task._id || index}>
                                <td>{task.taskName}</td>
                                <td><Pill tone={toneOf(getTaskStatusBadgeClass(task.status))} dot>{task.status}</Pill></td>
                                <td>
                                  {task.assignedToName
                                    ? <Person name={task.assignedToName} inline />
                                    : <span className="dm-value is-empty">Unassigned</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </DetailSection>
                  </div>
                </div>

                {/* Right Column - Ticket Details */}
                <div className="col-lg-4 d-flex flex-column gap-3">
                  <DetailSection title="Details" icon="bx-info-circle">
                    <DetailGrid cols={1}>
                      <DetailField label="Type" icon="bx-category" id="detailType">
                        {ticket && (ticket.typeCode || ticket.typeName) && (
                          <><Pill tone="indigo">{ticket.typeCode}</Pill> {ticket.typeName}</>
                        )}
                      </DetailField>
                      <DetailField label="Request Type" icon="bx-purchase-tag" id="detailRequestType">
                        {ticket && ticket.requestType && (
                          <Pill tone={toneOf(requestTypeBadgeClass(ticket.requestType))}>{ticket.requestType}</Pill>
                        )}
                      </DetailField>
                      <DetailField label="Client" icon="bx-buildings" id="detailClient">{ticket && ticket.clientName}</DetailField>
                      <DetailField label="Assigned To" icon="bx-user-check" id="detailAssignee" empty="Unassigned">
                        {ticket && ticket.assignedToName && <Person name={ticket.assignedToName} inline />}
                      </DetailField>
                      <DetailField label="Due Date" icon="bx-calendar-exclamation" id="detailDueDate" empty="Not set">
                        {ticket && ticket.dueDate && moment(ticket.dueDate).format('MMM DD, YYYY')}
                      </DetailField>
                      <DetailField label="Created By" icon="bx-user" id="detailCreatedBy">
                        {ticket && ticket.createdByName && <Person name={ticket.createdByName} inline />}
                      </DetailField>
                      <DetailField label="Created At" icon="bx-time-five" id="detailCreatedAt">
                        {ticket && moment(ticket.createdAt).format('MMM DD, YYYY hh:mm A')}
                      </DetailField>
                    </DetailGrid>
                  </DetailSection>

                  <DetailSection title="Contact" icon="bx-phone">
                    <DetailGrid cols={1}>
                      <DetailField label="Contact Person" id="detailContactPerson">{ticket && ticket.contactPerson}</DetailField>
                      <DetailField label="Contact Email" id="detailContactEmail">{ticket && ticket.contactEmail}</DetailField>
                      <DetailField label="Contact Number" id="detailContactNumber">{ticket && ticket.contactNumber}</DetailField>
                    </DetailGrid>
                  </DetailSection>

                  {userCan('ticket_update') && (
                    /* Quick Actions */
                    <DetailSection title="Quick Actions" icon="bx-bolt-circle">
                      <div className="tdm-action">
                        <div className="dm-label">Status</div>
                        <div className="d-flex gap-1">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <Select2 className="form-select" id="quickStatusChange" style={FULL_WIDTH}
                              placeholder="Change Status..." value={quickStatus} onChange={handleQuickStatusChange}>
                              <option value="">Change Status...</option>
                              <option value="open">Open</option>
                              <option value="assigned">Assigned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="on_hold">On Hold</option>
                              <option value="in_review">In Review</option>
                              <option value="closed">Closed</option>
                            </Select2>
                          </div>
                          <button type="button" className="btn btn-primary" id="confirmStatusChange" disabled={statusChangeDisabled}
                            title="Apply status change" onClick={confirmStatusChange}>
                            {statusChanging ? SPINNER_ICON : CHECK_ICON}
                          </button>
                        </div>
                      </div>
                      <div className="tdm-action">
                        <div className="dm-label">Assignee</div>
                        <div className="d-flex gap-1">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <Select2DataLoad className="form-select" id="quickAssignChange" style={FULL_WIDTH}
                              items={quickUsers} type="User" onChange={handleQuickAssignChange}>
                              <option value="">Reassign...</option>
                            </Select2DataLoad>
                          </div>
                          <button type="button" className="btn btn-primary" id="confirmAssignChange" disabled={assignChangeDisabled}
                            title="Apply assignment change" onClick={confirmAssignChange}>
                            {assignChanging ? SPINNER_ICON : CHECK_ICON}
                          </button>
                        </div>
                      </div>
                    </DetailSection>
                  )}

                  {/* Activity Log */}
                  <DetailSection title="Activity Log" icon="bx-history">
                    <div id="activityLogContainer" className="tdm-activity">
                      {activityLog.length > 0 && (
                        <ul className="dm-timeline">
                          {activityLog.map((activity, index) => (
                            <li key={index}>
                              <time>{moment(activity.timestamp).format('MMM DD, hh:mm A')}</time>
                              <div className="tdm-activity-text"><strong>{activity.userName}</strong> {activity.details}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {ticket && activityLog.length === 0 && (
                        <EmptyState icon="bx-history">No activity yet</EmptyState>
                      )}
                    </div>
                  </DetailSection>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer dm-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            <button type="button" className="btn btn-outline-secondary" id="sendEmailFromDetail" onClick={sendEmailFromDetail}>
              <i className="fa fa-envelope me-1"></i> Send Email
            </button>
            {userCan('task_create') && (
              <button type="button" className="btn btn-success" id="createTaskFromTicket" onClick={createTaskFromTicket}>
                <i className="fa fa-tasks me-1"></i> Create Task
              </button>
            )}
            {userCan('ticket_update') && (
              <button type="button" className="btn btn-primary" id="editFromDetail" onClick={editFromDetail}>
                <i className="fa fa-pencil me-1"></i> Edit Ticket
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
