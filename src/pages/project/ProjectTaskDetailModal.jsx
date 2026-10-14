/**
 * Project Task Detail Modal (#projectTaskDetailModal): update the status and remarks of one
 * task, add a comment and attachments.
 *
 *   <ProjectTaskDetailModal onSaved={refreshViewedProject} />
 *
 *   openProjectTaskDetailModal(taskId);
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { DetailHeader, DetailSection, DetailGrid, DetailField, StatTile, Pill, Person, EmptyState } from '../../components/detailModal/DetailModal';
import { getTaskTotalSeconds, getTaskDurationDays, formatHoursMinutes } from '../../lib/taskHours';
import { createComponentHandle, getFileIcon, getTimelineStatus, triggerFileDownload } from './projectHelpers';
import { getWorkCompletion } from './projectTaskDates';

const handle = createComponentHandle();

/** View Task Detail - Open modal with task details */
export function openProjectTaskDetailModal(taskId) {
  handle.call('open', taskId);
}

const STATUS_CLASSES = {
  'Completed': 'success',
  'In Progress': 'info',
  'Pending': 'warning',
  'On Hold': 'secondary',
  'Testing': 'info'
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

/** "05 Mar 2026" ('—' for an empty date) */
function formatDate(date) {
  return date ? moment(date).format('DD MMM YYYY') : '—';
}

/** Read a file as a base64 data URL and add it to the task as an attachment. */
function uploadTaskAttachment(taskId, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const attachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result,
        visibility: 'public'
      };

      api.call('projectTasks.addAttachment', taskId, attachment, (err) => {
        if (err) reject(err);
        else resolve();
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * View attachment from project task detail modal
 */
function viewAttachment(event, taskId, attachmentId) {
  event.preventDefault();
  event.stopPropagation();

  api.call('projectTasks.downloadAttachment', taskId, attachmentId, (err, result) => {
    if (err) {
      toastr.error('Failed to view attachment: ' + err.reason);
      return;
    }

    const newWindow = window.open();
    if (newWindow) {
      if (result.type.startsWith('image/')) {
        newWindow.document.write(`<img src="${result.data}" style="max-width: 100%;"/>`);
      } else if (result.type === 'application/pdf') {
        newWindow.document.write(`<embed src="${result.data}" type="application/pdf" width="100%" height="100%"/>`);
      } else {
        const link = document.createElement('a');
        link.href = result.data;
        link.download = result.name;
        link.click();
      }
    }
  });
}

/**
 * Download attachment from project task detail modal
 */
function downloadAttachment(event, taskId, attachmentId) {
  event.preventDefault();
  event.stopPropagation();

  api.call('projectTasks.downloadAttachment', taskId, attachmentId, (err, result) => {
    if (err) {
      toastr.error('Failed to download attachment: ' + err.reason);
      return;
    }

    triggerFileDownload(result.data, result.name);
  });
}

export default function ProjectTaskDetailModal({ onSaved }) {
  const attachmentInputRef = useRef(null);

  const [taskId, setTaskId] = useState('');
  // null until the first task is opened
  const [task, setTask] = useState(null);
  const [status, setStatus] = useState('Pending');
  const [remarks, setRemarks] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (id) => {
    // Fetch task data
    api.call('projectTasks.getTask', id, (err, loadedTask) => {
      if (err) {
        toastr.error('Failed to load task details');
        return;
      }

      // Store the task ID
      setTaskId(id);
      setTask(loadedTask);

      // Set current values
      setStatus(loadedTask.status || 'Pending');
      setRemarks(loadedTask.remarks || '');
      setComment('');
      attachmentInputRef.current.value = '';

      // Show the modal
      $('#projectTaskDetailModal').modal('show');
    });
  };

  // Let openProjectTaskDetailModal() reach this modal
  useEffect(() => handle.register({ open }));

  /**
   * Save Project Task Detail - Update status, remarks, add comments and attachments
   */
  const save = (event) => {
    event.preventDefault();

    const newComment = comment.trim();
    const attachmentFiles = attachmentInputRef.current.files;

    // Disable save button during processing
    setSaving(true);

    // Track all async operations
    const operations = [];

    // 1. Update status and remarks using the update method
    operations.push(new Promise((resolve, reject) => {
      const updateData = {
        status: status,
        remarks: remarks
      };

      api.call('projectTasks.update', taskId, updateData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }));

    // 2. Add comment if provided
    if (newComment) {
      operations.push(new Promise((resolve, reject) => {
        api.call('projectTasks.addComment', taskId, newComment, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }));
    }

    // 3. Upload attachments if any
    if (attachmentFiles && attachmentFiles.length > 0) {
      for (let i = 0; i < attachmentFiles.length; i++) {
        operations.push(uploadTaskAttachment(taskId, attachmentFiles[i]));
      }
    }

    // Wait for all operations to complete
    Promise.all(operations)
      .then(() => {
        toastr.success('Task updated successfully');
        $('#projectTaskDetailModal').modal('hide');

        // Refresh the project view modal tasks if it's open
        onSaved();
      })
      .catch((err) => {
        toastr.error('Failed to update task: ' + (err.reason || err.message));
      })
      .finally(() => {
        // Re-enable save button
        setSaving(false);
      });
  };

  const comments = (task && task.comments) || [];
  const attachments = (task && task.attachments) || [];

  const statusText = (task && task.status) || 'Pending';
  const timeline = task ? getTimelineStatus(task) : { text: '-' };
  const workCompletion = !task ? 0
    : (task.workCompletion === undefined || task.workCompletion === null)
      ? getWorkCompletion(task.status)
      : (typeof task.workCompletion === 'number' ? task.workCompletion : (parseInt(task.workCompletion) || 0));

  return (
    <div className="modal fade dm-modal ptd-modal" id="projectTaskDetailModal" tabIndex="-1" aria-hidden="true" aria-labelledby="projectTaskDetailName">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <DetailHeader
            icon="bx-task"
            tone={BADGE_TONES[STATUS_CLASSES[statusText]] || 'gray'}
            eyebrow={<span id="projectTaskDetailTaskId">{(task && task.taskId) || 'Task'}</span>}
            title={task ? (task.taskName || 'Untitled task') : 'Task Details'}
            titleId="projectTaskDetailName"
            meta={task && (
              <>
                <span id="projectTaskDetailCurrentStatus">
                  <Pill tone={BADGE_TONES[STATUS_CLASSES[task.status]] || 'gray'} dot>{task.status || 'Pending'}</Pill>
                </span>
                {timeline.text !== '-' && (
                  <Pill tone={timeline.color === 'danger' ? 'red' : 'green'} icon={timeline.color === 'danger' ? 'bx-error-circle' : 'bx-check-circle'}>
                    {timeline.text}
                  </Pill>
                )}
                {task.projectName && <span className="dm-meta"><i className="bx bx-briefcase"></i>{task.projectName}</span>}
              </>
            )}
            closeProps={{ 'data-bs-dismiss': 'modal' }}
          />

          <div className="modal-body p-0">
            <input type="hidden" id="projectTaskDetailId" value={taskId} readOnly />

            <div className="dm-body">
              {/* Summary tiles */}
              <div className="dm-stats">
                <StatTile icon="bx-check-circle" tone="green" label="Progress" value={`${workCompletion}%`}
                  sub={<span className="ptd-track"><span style={{ width: `${Math.min(Math.max(workCompletion, 0), 100)}%` }}></span></span>} />
                <StatTile icon="bx-stopwatch" tone="amber" label="Time logged" value={formatHoursMinutes(getTaskTotalSeconds(task))} />
                <StatTile icon="bx-time-five" tone="indigo" label="Planned / actual"
                  value={`${(task && task.plannedHours) || 0}h / ${(task && task.actualHours) || 0}h`} />
                <StatTile icon="bx-calendar" tone="cyan" label="Duration" value={`${task ? getTaskDurationDays(task) : 0}d`}
                  sub={task && task.duration ? `${task.duration} day${Number(task.duration) === 1 ? '' : 's'} planned` : undefined} />
              </div>

              <div className="dm-columns">
                {/* Schedule */}
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
                          <td><strong>Baseline</strong></td>
                          <td>{formatDate(task && task.baselineStart)}</td>
                          <td>{formatDate(task && task.baselineFinish)}</td>
                        </tr>
                        <tr>
                          <td><strong>Actual</strong></td>
                          <td>{formatDate(task && task.actualStart)}</td>
                          <td>{formatDate(task && task.actualFinish)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </DetailSection>

                {/* Details */}
                <DetailSection title="Details" icon="bx-detail">
                  <DetailGrid>
                    <DetailField label="Phase" wide text>{task && task.phase}</DetailField>
                    <DetailField label="Responsibility">
                      {task && task.responsibility ? <Person name={task.responsibility} inline /> : null}
                    </DetailField>
                    <DetailField label="Assigned to" empty="Not assigned">
                      {task && task.assignedToName ? <Person name={task.assignedToName} inline /> : null}
                    </DetailField>
                  </DetailGrid>
                </DetailSection>
              </div>

              {task && task.remarks && (
                <DetailSection title="Current remarks" icon="bx-note">
                  <div className="dm-callout dm-tone-indigo">{task.remarks}</div>
                </DetailSection>
              )}

              {/* Update form */}
              <DetailSection title="Update task" icon="bx-edit">
                <div className="row g-3">
                  <div className="col-md-5">
                    <label className="form-label ptd-label" htmlFor="projectTaskDetailStatus">
                      <i className="bx bx-flag"></i>Update Status
                    </label>
                    <select className="form-select" id="projectTaskDetailStatus" value={status} onChange={(event) => setStatus(event.target.value)}>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Testing">Testing</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="col-md-7">
                    <label className="form-label ptd-label" htmlFor="projectTaskDetailAttachment">
                      <i className="bx bx-paperclip"></i>Add Attachment
                    </label>
                    <input type="file" className="form-control" id="projectTaskDetailAttachment" multiple ref={attachmentInputRef} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label ptd-label" htmlFor="projectTaskDetailRemarks">
                      <i className="bx bx-note"></i>Remarks
                    </label>
                    <textarea className="form-control" id="projectTaskDetailRemarks" rows="3" placeholder="Add remarks about this task..."
                      value={remarks} onChange={(event) => setRemarks(event.target.value)}></textarea>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label ptd-label" htmlFor="projectTaskDetailComment">
                      <i className="bx bx-comment"></i>Add Comment
                    </label>
                    <textarea className="form-control" id="projectTaskDetailComment" rows="3" placeholder="Add a comment..."
                      value={comment} onChange={(event) => setComment(event.target.value)}></textarea>
                  </div>
                </div>
              </DetailSection>

              {/* Existing Comments */}
              <DetailSection title="Comments" icon="bx-message-square-dots"
                count={<span id="projectTaskDetailCommentsCount">{comments.length}</span>}>
                <div id="projectTaskDetailCommentsList" className="ptd-scroll">
                  {comments.length > 0 ? (
                    <ul className="dm-timeline">
                      {comments.slice().reverse().map((item, index) => (
                        <li key={index}>
                          <div className="ptd-entry-head">
                            <strong>{item.userName || 'Unknown'}</strong>
                            <span>{moment(item.createdAt).format('DD-MM-YYYY hh:mm A')}</span>
                          </div>
                          <p className="ptd-entry-text">{item.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon="bx-message-square">No comments yet</EmptyState>
                  )}
                </div>
              </DetailSection>

              {/* Existing Attachments */}
              <DetailSection title="Attachments" icon="bx-paperclip"
                count={<span id="projectTaskDetailAttachmentsCount">{attachments.length}</span>}>
                <div id="projectTaskDetailAttachmentsList" className="ptd-scroll">
                  {attachments.length > 0 ? (
                    <div className="dm-files">
                      {attachments.map((att, index) => (
                        <div className="dm-file" key={index}>
                          <span className="dm-file-icon"><i className={getFileIcon(att.type)}></i></span>
                          <span className="dm-file-meta">
                            <strong title={att.name}>{att.name}</strong>
                            <small>{moment(att.uploadedAt).format('DD-MM-YYYY')}</small>
                          </span>
                          <span className="ptd-file-actions">
                            <button type="button" className="ptd-icon-btn project-task-view-attachment" data-task-id={taskId} data-attachment-id={att.id} title="View"
                              onClick={(event) => viewAttachment(event, taskId, att.id)}>
                              <i className="bx bx-show"></i>
                            </button>
                            <button type="button" className="ptd-icon-btn project-task-download-attachment" data-task-id={taskId} data-attachment-id={att.id} title="Download"
                              onClick={(event) => downloadAttachment(event, taskId, att.id)}>
                              <i className="bx bx-download"></i>
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="bx-file-blank">No attachments yet</EmptyState>
                  )}
                </div>
              </DetailSection>
            </div>
          </div>
          <div className="dm-footer">
            <button type="button" className="btn btn-label-secondary" data-dismiss="modal" data-bs-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="saveProjectTaskDetail" disabled={saving} onClick={save}>
              {saving ? (
                <><i className="fa fa-spinner fa-spin me-1"></i>Saving...</>
              ) : (
                <><i className="fa fa-save me-1"></i>Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
