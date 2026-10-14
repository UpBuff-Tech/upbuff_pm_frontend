/**
 * Create Task from Ticket Modal (#createTaskModal).
 *
 *   openCreateTaskModal(ticket);
 */
import { useState } from 'react';
import api from '../../api/client';
import { TASK_REQUEST_TYPES, DEFAULT_REQUEST_TYPE } from '../../lib/taskRequestType';
import Select2DataLoad from './Select2DataLoad';
import { createModalHandle, useModalHandle } from './modalHandle';
import { knownValue } from './ticketHelpers';

const modal = createModalHandle();

export function openCreateTaskModal(ticket) {
  modal.call('open', ticket);
}

const EMPTY_TASK = {
  ticketMongoId: '',
  taskName: '',
  projectId: '',
  assignedTo: '',
  priority: 'Medium',
  duration: '1',
  requestType: '',
  description: ''
};

export default function CreateTaskModal({ projects, assignableUsers, onTaskCreated }) {
  const [task, setTask] = useState(EMPTY_TASK);
  const [ticketIdLabel, setTicketIdLabel] = useState('');
  const [clientProjects, setClientProjects] = useState([]);
  const [openCount, setOpenCount] = useState(0); // rebuilds the project / assignee dropdowns
  const [creating, setCreating] = useState(false);

  const changeTask = (changes) => setTask((old) => ({ ...old, ...changes }));

  const open = (ticket) => {
    setTask({
      ...EMPTY_TASK,
      ticketMongoId: ticket._id,
      // Starts as the ticket's own request type (or the default for a ticket
      // that has none); still changeable per task
      requestType: knownValue(ticket.requestType || DEFAULT_REQUEST_TYPE, TASK_REQUEST_TYPES)
    });
    setTicketIdLabel(ticket.ticketId);

    // Filter projects to only those belonging to this ticket's client
    const allProjects = projects || [];
    const filteredProjects = allProjects.filter((p) => p.companyName === ticket.clientId);
    console.log('Loading projects for client', allProjects, ticket.clientId, filteredProjects);
    setClientProjects(filteredProjects);

    // Project + assignee dropdowns start empty every time
    setOpenCount((count) => count + 1);

    $('#createTaskModal').modal('show');
  };

  useModalHandle(modal, { open });

  // Save Task from Ticket
  const saveTask = (event) => {
    event.preventDefault();

    const ticketId = task.ticketMongoId;
    const taskName = task.taskName.trim();
    const projectId = task.projectId;
    const assignedTo = task.assignedTo || null;
    const priority = task.priority;
    const requestType = task.requestType;
    const duration = parseInt(task.duration) || 1;
    const description = task.description.trim();

    if (!taskName) {
      toastr.error('Task name is required');
      return;
    }
    if (!projectId) {
      toastr.error('Please select a project');
      return;
    }
    if (!requestType) {
      toastr.error('Please select a request type');
      return;
    }

    setCreating(true);

    const taskData = {
      taskName,
      priority,
      requestType,
      duration,
      description,
      assignedTo,
      ticketId,
      status: 'Pending'
    };

    api.call('tickets.createLinkedTask', ticketId, projectId, taskData, (error, result) => {
      setCreating(false);
      if (error) {
        toastr.error(error.reason || 'Failed to create task');
        return;
      }
      toastr.success('Task created and linked to ticket');
      $('#createTaskModal').modal('hide');
      // Refresh the detail modal to show linked task
      onTaskCreated(ticketId);
    });
  };

  return (
    <div className="modal fade" id="createTaskModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Create Task for Ticket: <span id="taskTicketIdLabel" className="badge bg-primary">{ticketIdLabel}</span></h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form id="taskFromTicketForm">
              <input type="hidden" id="taskTicketMongoId" value={task.ticketMongoId} readOnly />

              <div className="mb-3">
                <label className="form-label" htmlFor="taskNameInput">Task Name <span className="text-danger">*</span></label>
                <input type="text" className="form-control" id="taskNameInput" required placeholder="Enter task name"
                  value={task.taskName} onChange={(event) => changeTask({ taskName: event.target.value })} />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskProjectSelect">Project <span className="text-danger">*</span></label>
                  <Select2DataLoad className="form-select" id="taskProjectSelect" placeholder="Select Project" style={{ width: '100%' }} required
                    items={clientProjects} type="Project" reloadKey={openCount}
                    onChange={(value) => changeTask({ projectId: value })}>
                    <option value="">Select Project</option>
                  </Select2DataLoad>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskAssigneeSelect">Assign To</label>
                  <Select2DataLoad className="form-select" id="taskAssigneeSelect" placeholder="Unassigned" style={{ width: '100%' }}
                    items={assignableUsers} type="User" reloadKey={openCount}
                    onChange={(value) => changeTask({ assignedTo: value })}>
                    <option value="">Unassigned</option>
                  </Select2DataLoad>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskPrioritySelect">Priority</label>
                  <select className="form-select" id="taskPrioritySelect"
                    value={task.priority} onChange={(event) => changeTask({ priority: event.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskDurationInput">Duration (days)</label>
                  <input type="number" className="form-control" id="taskDurationInput" min="1"
                    value={task.duration} onChange={(event) => changeTask({ duration: event.target.value })} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="taskRequestTypeSelect">Request Type <span className="text-danger">*</span></label>
                <select className="form-select" id="taskRequestTypeSelect"
                  value={task.requestType} onChange={(event) => changeTask({ requestType: event.target.value })}>
                  <option value="">Select Request Type</option>
                  {TASK_REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="taskDescriptionInput">Description</label>
                <textarea className="form-control" id="taskDescriptionInput" rows="3" placeholder="Task details..."
                  value={task.description} onChange={(event) => changeTask({ description: event.target.value })}></textarea>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="saveTaskFromTicket" disabled={creating} onClick={saveTask}>
              {creating
                ? <><i className="fa fa-spinner fa-spin"></i> Creating...</>
                : <><i className="fa fa-plus me-1"></i> Create Task</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
