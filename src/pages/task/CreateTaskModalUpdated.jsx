/**
 * Create Task modal for the rebuilt board.
 *
 *   <CreateTaskModalUpdated board={board} openRef={createTaskModalRef} />
 *
 * The page opens it by calling `openRef.current()` (wired to the header
 * button). On save it calls projectTasks.create — the new task then appears in
 * its column automatically, so no board refresh is needed beyond the count
 * badges. Project/user options come from the board's already-loaded lists.
 */
import { useEffect, useRef, useState } from 'react';

import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { currentUserId } from '../../lib/customFunctions';
import { TASK_REQUEST_TYPES } from '../../lib/taskRequestType';
import { DEFAULT_REQUEST_TYPE } from '../../lib/shared/requestTypes';
import { userFullName } from './updatedTaskUtils';

const TICKET_PRIORITY_BADGE = {
  critical: 'bg-danger',
  high: 'bg-warning',
  medium: 'bg-info',
  low: 'bg-success'
};

const EMPTY_TEXT_FIELDS = { taskName: '', phase: '', duration: '', responsibility: '' };

function projectOptionLabel(project) {
  return project.clientName ? `${project.name} (${project.clientName})` : project.name;
}

function userOptionLabel(user) {
  const name = userFullName(user);
  const email = user.emails && user.emails[0] ? user.emails[0].address : '';
  return email ? `${name} (${email})` : name;
}

function ticketOptionLabel(ticket) {
  const subject = ticket.subject && ticket.subject.length > 60
    ? ticket.subject.substring(0, 60) + '...'
    : (ticket.subject || '');
  return `${ticket.ticketId} - ${subject}`;
}

function ticketPriorityBadgeClass(priority) {
  return TICKET_PRIORITY_BADGE[priority] || 'bg-secondary';
}

export default function CreateTaskModalUpdated({ board, openRef }) {
  const { userId } = useAuth();
  const isActiveRef = useRef(true);
  const formRef = useRef(null);

  const [generatedTaskId, setGeneratedTaskId] = useState('');
  const [ticketOptions, setTicketOptions] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dependencyOptions, setDependencyOptions] = useState([]);

  // The typed fields; the dropdowns are Select2 widgets and are read from them on save.
  const [textFields, setTextFields] = useState(EMPTY_TEXT_FIELDS);
  // True while the chosen assignee is somebody else (only Pending is allowed then).
  const [assignedToOtherUser, setAssignedToOtherUser] = useState(false);
  const [saving, setSaving] = useState(false);

  const projects = board ? (board.projectsList || []) : [];
  const users = board ? (board.usersList || []) : [];
  const projectMap = board ? board.projectMap : null;

  const setTextField = (name, value) => {
    setTextFields(fields => ({ ...fields, [name]: value }));
  };

  /** Reset all state and show the modal (called from the board's button). */
  const resetAndShow = () => {
    if (formRef.current) formRef.current.reset();
    setTextFields(EMPTY_TEXT_FIELDS);
    setGeneratedTaskId('');
    setTicketOptions([]);
    setSelectedTicket(null);
    setDependencyOptions([]);

    $('#taskCreationModal').modal('show');

    // Select2 on the searchable dropdowns (same look as the original modal).
    // Init after the modal is shown; React keeps the underlying <option>
    // lists fresh and Select2 reads them each time a dropdown opens.
    setTimeout(() => {
      $('#taskCreationModal select').each(function () {
        const $el = $(this);
        if ($el.hasClass('select2-hidden-accessible')) $el.select2('destroy');
        $el.select2({
          placeholder: $el.find('option:first').text() || 'Select...',
          allowClear: true,
          width: '100%',
          dropdownParent: $('#taskCreationModal .modal-content')
        });
      });
      // Default request type — set here, after form.reset() and the Select2
      // init, so both the value and the visible label land on it
      $('#createTaskRequestType').val(DEFAULT_REQUEST_TYPE).trigger('change');
      // Default assignee: the logged-in user
      const uid = currentUserId();
      if (uid) $('#createTaskAssignedTo').val(uid).trigger('change');
    }, 0);
  };

  // Hand the "open" function to the page.
  useEffect(() => {
    if (openRef) openRef.current = resetAndShow;
  });

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      if (openRef) openRef.current = null;
      $('#taskCreationModal select').each(function () {
        const $el = $(this);
        if ($el.hasClass('select2-hidden-accessible')) $el.select2('destroy');
      });
    };
  }, []);

  /**
   * Project chosen: generate the next task ID, load the client's open
   * tickets, and load the full dependency list for the project.
   */
  const handleProjectChange = (event) => {
    const projectId = $(event.currentTarget).val() || '';
    setSelectedTicket(null);
    setTicketOptions([]);
    setDependencyOptions([]);
    $('#createTaskTicket').val('');
    $('#createTaskDependencies').val([]).trigger('change.select2');

    if (!projectId) {
      setGeneratedTaskId('');
      return;
    }

    api.call('projectTasks.getNextTaskId', projectId, (error, nextTaskId) => {
      if (!isActiveRef.current) return;
      setGeneratedTaskId(error ? '1.1' : nextTaskId);
    });

    // Tickets belong to clients — resolve the project's client first
    const project = projectMap ? projectMap[projectId] : null;
    const clientId = project && project.clientId;
    if (clientId) {
      api.call('tickets.getList', { clientId, status: '', perPage: 100 }, (error, result) => {
        if (error || !isActiveRef.current) return;
        const open = ((result && result.data) || []).filter(t => t.status !== 'closed');
        setTicketOptions(open);
      });
    }

    api.call('projectTasks.getProjectTaskOptions', projectId, (error, options) => {
      if (error || !isActiveRef.current) return;
      setDependencyOptions(options || []);
    });
  };

  /**
   * Ticket chosen: show its info card and pre-fill task name, request type
   * and priority.
   */
  const handleTicketChange = (event) => {
    const ticketId = $(event.currentTarget).val();
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }
    api.call('tickets.getById', ticketId, (error, ticket) => {
      if (error || !ticket || !isActiveRef.current) {
        setSelectedTicket(null);
        return;
      }
      setSelectedTicket(ticket);
      setTextField('taskName', ticket.subject || '');
      if (ticket.requestType) {
        $('#createTaskRequestType').val(ticket.requestType).trigger('change.select2');
      }
      if (ticket.priority) {
        const taskPriority = ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1);
        $('#createTaskPriority').val(taskPriority).trigger('change.select2');
      }
    });
  };

  /**
   * Assigning to someone else restricts the initial status to Pending —
   * only the assignee starts work on their own task.
   */
  const handleAssignedToChange = (event) => {
    const assignedTo = $(event.currentTarget).val();
    const isOtherUser = !!assignedTo && assignedTo !== userId;
    const $status = $('#createTaskStatus');
    setAssignedToOtherUser(isOtherUser);
    if (isOtherUser && $status.val() !== 'Pending') {
      $status.val('Pending');
    }
    if ($status.hasClass('select2-hidden-accessible')) {
      $status.trigger('change.select2');
    }
  };

  // The dropdowns are Select2 widgets, so their changes are listened to with
  // jQuery. Bound again when the values the handlers read change.
  useEffect(() => {
    $('#createTaskProject').on('change.createTaskModal', handleProjectChange);
    $('#createTaskTicket').on('change.createTaskModal', handleTicketChange);
    $('#createTaskAssignedTo').on('change.createTaskModal', handleAssignedToChange);
    return () => {
      $('#createTaskProject, #createTaskTicket, #createTaskAssignedTo').off('change.createTaskModal');
    };
  }, [projectMap, userId]);

  const handleSaveClick = (event) => {
    event.preventDefault();
    if (saving) return;

    const projectId = $('#createTaskProject').val();
    const taskName = textFields.taskName.trim();
    const requestType = $('#createTaskRequestType').val();
    const status = $('#createTaskStatus').val();
    const priority = $('#createTaskPriority').val() || 'Medium';
    const duration = parseFloat(textFields.duration) || 0;
    let assignedTo = $('#createTaskAssignedTo').val();
    const selectedDependencies = $('#createTaskDependencies').val() || [];

    // Creating a task straight into In Progress/Testing means "I'm starting
    // work on this now" — if no assignee was chosen (e.g. the default lost a
    // race with the user list loading, which left tasks unassigned and
    // invisible on the creator's own filtered board), assign the creator:
    // the auto-started timer runs under their name anyway.
    if (!assignedTo && (status === 'In Progress' || status === 'Testing')) {
      assignedTo = userId;
    }

    if (!projectId) {
      toastr.error('Please select a project');
      return;
    }
    if (!requestType) {
      toastr.error('Please select a request type');
      return;
    }
    if (!taskName) {
      toastr.error('Task name is required');
      return;
    }

    // Assignee name from the board's user map (for denormalized storage)
    let assignedToName = '';
    if (assignedTo && board) {
      const user = (board.userMap || {})[assignedTo];
      if (user) {
        assignedToName = userFullName(user);
      }
    }

    const taskData = {
      taskId: generatedTaskId,
      taskName,
      requestType,
      phase: textFields.phase.trim() || '',
      duration,
      dependencies: selectedDependencies.join(', '),
      responsibility: textFields.responsibility.trim() || '',
      assignedTo: assignedTo || null,
      assignedToName,
      status,
      priority,
      plannedHours: duration * 8, // 8 working hours per day
      actualHours: 0,
      timeSpent: 0,
      ticketId: $('#createTaskTicket').val() || null
    };

    // Auto-generate actual dates based on the initial status
    const currentDate = new Date();
    if (status === 'In Progress' || status === 'Testing') {
      taskData.actualStart = currentDate;
    } else if (status === 'Completed') {
      taskData.actualStart = currentDate;
      taskData.actualFinish = currentDate;
      taskData.actualHours = duration * 8;
    }

    setSaving(true);

    api.call('projectTasks.create', projectId, taskData, (error, newTaskId) => {
      setSaving(false);
      if (error) {
        if (error.error === 'not-punched-in') {
          toastr.warning('Please punch in first before creating a task');
        } else {
          toastr.error(error.reason || 'Failed to create task');
        }
        return;
      }

      toastr.success('Task created successfully');
      $('#taskCreationModal').modal('hide');

      // The new task appears in its column by itself; only badges need a poke
      if (board) {
        board.refreshColumnCounts();
        // Start the timer when created directly into In Progress / Testing —
        // non-destructively (skipped with a warning if another timer runs)
        if (newTaskId && (status === 'In Progress' || status === 'Testing')) {
          board.autoStartTimerIfFree(newTaskId);
        }
      }
    });
  };

  return (
    <div className="modal fade" id="taskCreationModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header text-white">
            <h5 className="modal-title">
              <i className="fa fa-tasks me-2"></i>Create New Task
            </h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form id="taskCreationForm" ref={formRef}>
              <div className="row">
                {/* Project Selection */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="createTaskProject">Project <span className="text-danger">*</span></label>
                  <select className="form-select" id="createTaskProject" required>
                    <option value="">Select Project...</option>
                    {projects.map(project => (
                      <option key={project._id} value={project._id}>{projectOptionLabel(project)}</option>
                    ))}
                  </select>
                </div>

                {/* Task ID (Auto-generated display) */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="createTaskId">Task ID</label>
                  <input type="text" className="form-control" id="createTaskId" readOnly
                    style={{ backgroundColor: '#f0f0f0' }} value={generatedTaskId} />
                  <small className="text-muted">Auto-generated based on project</small>
                </div>

                {/* Link to Ticket (Optional) */}
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="createTaskTicket">Link to Ticket <small
                    className="text-muted">(Optional)</small></label>
                  <select id="createTaskTicket" style={{ width: '100%' }}>
                    <option value="">No Ticket - Standalone Task</option>
                    {ticketOptions.map(ticket => (
                      <option key={ticket._id} value={ticket._id}>{ticketOptionLabel(ticket)}</option>
                    ))}
                  </select>
                  <small className="text-muted">Select a ticket to link this task to</small>
                </div>

                {/* Ticket Info Card (shown when ticket selected) */}
                {selectedTicket && (
                  <div className="col-md-12 mb-3">
                    <div className="card bg-light border-primary">
                      <div className="card-body py-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <span className="badge bg-primary me-2">{selectedTicket.ticketId}</span>
                            <strong>{selectedTicket.subject}</strong>
                          </div>
                          <span className={`badge ${ticketPriorityBadgeClass(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                        </div>
                        <div className="mt-1">
                          <small className="text-muted">Client: </small><span className="small">{selectedTicket.clientName}</span>
                          <small className="text-muted ms-3">Type: </small><span className="small">{selectedTicket.typeCode}</span>
                        </div>
                        {selectedTicket.description && (
                          <div className="mt-1">
                            <small className="text-muted">Description: </small>
                            <p className="small mb-0" style={{ maxHeight: '40px', overflowY: 'auto' }}>{selectedTicket.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Request Type */}
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="createTaskRequestType">Request Type <span
                    className="text-danger">*</span></label>
                  <select className="form-select" id="createTaskRequestType" required>
                    <option value="">Select request type...</option>
                    {TASK_REQUEST_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Task Name */}
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="createTaskName">Task Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="createTaskName" placeholder="Enter task name" required
                    value={textFields.taskName} onChange={(event) => setTextField('taskName', event.target.value)} />
                </div>

                {/* Phase/Activity */}
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="createTaskPhase">Phase/Activity</label>
                  <textarea className="form-control" id="createTaskPhase" rows="3"
                    placeholder="Enter phase/activity details..."
                    value={textFields.phase} onChange={(event) => setTextField('phase', event.target.value)}></textarea>
                </div>

                {/* Status */}
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="createTaskStatus">Status <span className="text-danger">*</span></label>
                  <select className="form-select" id="createTaskStatus" required defaultValue="Pending">
                    <option value="Pending">Pending</option>
                    <option value="In Progress" disabled={assignedToOtherUser}>In Progress</option>
                    <option value="On Hold" disabled={assignedToOtherUser}>On Hold</option>
                    <option value="Testing" disabled={assignedToOtherUser}>Testing</option>
                    <option value="Completed" disabled={assignedToOtherUser}>Completed</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="createTaskPriority">Priority</label>
                  <select className="form-select" id="createTaskPriority" defaultValue="Low">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="createTaskDuration">Duration (Days)</label>
                  <input type="number" className="form-control" id="createTaskDuration" placeholder="e.g., 5" min="0"
                    step="any"
                    value={textFields.duration} onChange={(event) => setTextField('duration', event.target.value)} />
                </div>

                {/* Responsibility */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="createTaskResponsibility">Responsibility</label>
                  <input type="text" className="form-control" id="createTaskResponsibility" placeholder="e.g., Dev Team"
                    value={textFields.responsibility} onChange={(event) => setTextField('responsibility', event.target.value)} />
                </div>

                {/* Assigned To */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="createTaskAssignedTo">Assigned To</label>
                  <select id="createTaskAssignedTo" style={{ width: '100%' }}>
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>{userOptionLabel(user)}</option>
                    ))}
                  </select>
                </div>

                {/* Dependencies (Multi-select) */}
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="createTaskDependencies">Dependencies</label>
                  <select id="createTaskDependencies" style={{ width: '100%' }} multiple>
                    {dependencyOptions.map(option => (
                      <option key={option.taskId} value={option.taskId}>{`${option.taskId} - ${option.taskName}`}</option>
                    ))}
                  </select>
                  <small className="text-muted">Select tasks that must complete before this one. Actual start/finish dates
                    will be auto-generated based on task status.</small>
                </div>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="saveNewTaskBtn" disabled={saving} onClick={handleSaveClick}>
              {saving
                ? <><i className="fa fa-spinner fa-spin me-1"></i>Creating...</>
                : <><i className="fa fa-save me-1"></i>Create Task</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
