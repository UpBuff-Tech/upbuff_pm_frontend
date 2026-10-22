/**
 * Add/Edit Task Modal (#taskFormModal) of the project form.
 *
 *   <ProjectTaskFormModal onTasksReloaded={(tasks) => ...} />
 *
 *   openAddProjectTaskModal();          // "Add New Task"
 *   openEditProjectTaskModal(taskId);   // the pencil button of a task row
 *
 * The project the task belongs to is the one open in the project form (#editProjectId).
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { durationToHours } from '../../lib/taskHours';
import { formatDateInput } from '../../lib/formatters';
import { createComponentHandle, destroySelect2, initSelect2 } from './projectHelpers';
import { addWorkingDays, calculateBaselineFinish, getNextTaskId, getWorkCompletion } from './projectTaskDates';

const handle = createComponentHandle();

/** Add new task button handler */
export function openAddProjectTaskModal() {
  handle.call('openAdd');
}

/** Edit task button handler */
export function openEditProjectTaskModal(taskId) {
  handle.call('openEdit', taskId);
}

const EMPTY_VALUES = {
  editTaskId: '',
  taskId: '',
  taskName: '',
  phase: '',
  duration: '',
  responsibility: '',
  status: 'Pending',
  baselineStart: '',
  baselineFinish: ''
};

/** Helper function to format date for input field (YYYY-MM-DD) */
function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return formatDateInput(d);
}

/**
 * Baseline finish shown in the form: start + duration, excluding weekends ('' when either is missing)
 */
function calculateFinishInput(baselineStartInput, durationInput) {
  const duration = parseFloat(durationInput) || 0;

  if (baselineStartInput && duration > 0) {
    // Format date as YYYY-MM-DD for the date input
    return addWorkingDays(new Date(baselineStartInput), duration).toISOString().split('T')[0];
  }
  return '';
}

function userOptionLabel(user) {
  const fullName = user.profile ?
    `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() :
    user.username;
  return fullName || user.username;
}

export default function ProjectTaskFormModal({ onTasksReloaded }) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [title, setTitle] = useState('Add New Task');

  // The options of the two select2 dropdowns. `selected` is what must be chosen once the
  // plugin has been rebuilt on the new options (undefined = leave the selection alone).
  const [dependencies, setDependencies] = useState({ options: [], selected: undefined, loaded: false });
  const [users, setUsers] = useState({ options: [], selected: undefined, loaded: false });

  const changeValues = (changes) => setValues((old) => ({ ...old, ...changes }));

  // Dependencies dropdown: rebuild select2 every time its options were refilled
  useEffect(() => {
    if (!dependencies.loaded) return;

    // Initialize Select2 for multi-select
    initSelect2('#taskDependenciesInput', {
      placeholder: 'Select dependencies...',
      allowClear: true,
      width: '100%',
      dropdownParent: $('#taskFormModal')
    });

    $('#taskDependenciesInput').val(dependencies.selected).trigger('change');
  }, [dependencies]);

  // Assigned To dropdown: same
  useEffect(() => {
    if (!users.loaded) return;

    initSelect2('#taskAssignedToInput', {
      placeholder: 'Select user...',
      allowClear: true,
      width: '100%',
      dropdownParent: $('#taskFormModal')
    });

    // Pre-select the assigned user
    if (users.selected) {
      $('#taskAssignedToInput').val(users.selected).trigger('change');
    }
  }, [users]);

  // Cleanup Select2 when the page goes away
  useEffect(() => {
    return () => destroySelect2('#taskDependenciesInput, #taskAssignedToInput');
  }, []);

  /** Load users for Assigned To dropdown */
  const loadUsers = (selectedUserId) => {
    api.call('user.getActiveUsers', (error, list) => {
      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      // Populate Assigned To dropdown
      setUsers({ options: list || [], selected: selectedUserId, loaded: true });
    });
  };

  const openAdd = () => {
    const currentProjectId = $('#editProjectId').val();

    if (!currentProjectId) {
      toastr.error('Please save the project first');
      return;
    }

    // Reset form
    setValues(EMPTY_VALUES);
    $('#taskAssignedToInput').val('');

    setTitle('Add New Task');
    $('#taskFormModal').modal('show');

    // Load tasks for dependencies dropdown after modal is shown
    $('#taskFormModal').one('shown.bs.modal', function () {
      // Load existing tasks for auto-generating Task ID and dependencies
      api.call('projectTasks.getByProject', currentProjectId, (error, tasks) => {
        if (error) {
          console.error('Error loading tasks for dependencies:', error);
          tasks = [];
        }

        // Auto-generate Task ID based on existing tasks
        changeValues({ taskId: getNextTaskId(tasks) });

        // Populate dependencies dropdown, with nothing selected
        setDependencies({ options: tasks || [], selected: null, loaded: true });
      });

      loadUsers(undefined);
    });
  };

  const openEdit = (taskId) => {
    api.call('projectTasks.getByProject', $('#editProjectId').val(), (error, tasks) => {
      if (error) {
        toastr.error('Failed to load task');
        return;
      }

      const task = tasks.find(t => t._id === taskId);
      if (!task) {
        toastr.error('Task not found');
        return;
      }

      // Populate form
      setValues({
        editTaskId: task._id,
        taskId: task.taskId || '',
        taskName: task.taskName || '',
        phase: task.phase || '',
        duration: task.duration || '',
        responsibility: task.responsibility || '',
        status: task.status || 'Pending',
        baselineStart: formatDateForInput(task.baselineStart),
        baselineFinish: formatDateForInput(task.baselineFinish)
      });

      setTitle('Edit Task');
      $('#taskFormModal').modal('show');

      // Populate dependencies dropdown after modal is shown
      $('#taskFormModal').one('shown.bs.modal', function () {
        // Parse existing dependencies and select them
        let selectedDependencies = [];
        if (task.dependencies) {
          // Dependencies are stored as comma-separated string like "1.1, 1.2"
          selectedDependencies = task.dependencies.split(',').map(d => d.trim()).filter(d => d);
        }

        // Populate dependencies dropdown (exclude current task)
        setDependencies({
          options: (tasks || []).filter(t => t._id !== taskId),
          selected: selectedDependencies,
          loaded: true
        });

        loadUsers(task.assignedTo);
      });
    });
  };

  // Let openAddProjectTaskModal() / openEditProjectTaskModal() reach this modal
  useEffect(() => handle.register({ openAdd, openEdit }));

  /**
   * Auto-calculate baseline finish when baseline start or duration changes
   */
  const changeBaselineStart = (event) => {
    const baselineStart = event.target.value;
    changeValues({ baselineStart, baselineFinish: calculateFinishInput(baselineStart, values.duration) });
  };

  const changeDuration = (event) => {
    const duration = event.target.value;
    changeValues({ duration, baselineFinish: calculateFinishInput(values.baselineStart, duration) });
  };

  /**
   * Save task button handler
   */
  const saveTask = (event) => {
    event.preventDefault();

    const taskId = values.editTaskId;
    const projectId = $('#editProjectId').val();

    // Get form data
    const duration = parseFloat(values.duration) || 0;
    const baselineStartInput = values.baselineStart;
    const status = values.status;

    // Calculate baseline finish if baseline start and duration are provided
    const baselineStart = baselineStartInput ? new Date(baselineStartInput) : null;
    const baselineFinish = calculateBaselineFinish(baselineStart, duration);

    // Calculate work completion based on status
    const workCompletion = getWorkCompletion(status);

    // Calculate hours (8 hours per day)
    const plannedHours = durationToHours(duration);

    // Get selected dependencies from multi-select and join as comma-separated string
    const selectedDependencies = $('#taskDependenciesInput').val();
    const dependenciesString = selectedDependencies && selectedDependencies.length > 0
      ? selectedDependencies.join(', ')
      : '';

    // Prepare task data
    const taskData = {
      taskId: String(values.taskId).trim(),
      taskName: values.taskName.trim(),
      phase: values.phase.trim(),
      duration: duration,
      dependencies: dependenciesString,
      responsibility: values.responsibility.trim(),
      assignedTo: $('#taskAssignedToInput').val() || null,
      status: status,
      baselineStart: baselineStart,
      baselineFinish: baselineFinish,
      workCompletion: workCompletion,
      plannedHours: plannedHours
    };

    // Validation
    if (!taskData.taskName) {
      toastr.error('Task name is required');
      return;
    }

    // After a save: close the modal and reload the tasks of the project form
    const afterSave = (message) => {
      toastr.success(message);
      $('#taskFormModal').modal('hide');

      // Reload tasks
      api.call('projectTasks.getByProject', projectId, (loadError, tasks) => {
        if (loadError) {
          console.error('Error reloading tasks:', loadError);
          return;
        }

        onTasksReloaded(tasks);
      });
    };

    if (taskId) {
      // Actual Start / Actual Finish are stamped by the server now (see
      // actualDates.js), so every path that changes a status — this form, the
      // board, the timer, the client portal — records them the same way.
      // Actual Hrs likewise comes from the timer: it used to be derived here
      // as the calendar span between the two dates, which read a task left
      // open over a weekend as 72 hours of work.

      // Update existing task. No pre-fetch needed: the server reads the task's
      // previous status itself to decide the actual dates.
      api.call('projectTasks.update', taskId, taskData, (error) => {
        if (error) {
          toastr.error(error.reason || 'Failed to update task');
          return;
        }

        afterSave('Task updated successfully');
      });
    } else {
      // Create new task
      taskData.actualHours = 0;
      api.call('projectTasks.create', projectId, taskData, (error) => {
        if (error) {
          toastr.error(error.reason || 'Failed to create task');
          return;
        }

        afterSave('Task created successfully');
      });
    }
  };

  return (
    <div className="modal fade" id="taskFormModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title" id="taskFormTitle">
              <i className="fa fa-tasks me-2"></i>{title}
            </h5>
            <button type="button" className="btn-close btn-close-white" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id="editTaskId" value={values.editTaskId} readOnly />
            <form id="taskCreationForm">
              <div className="row">
                {/* Task ID (Auto-generated) */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskIdInput">Task ID</label>
                  <input type="text" className="form-control" id="taskIdInput" readOnly style={{ backgroundColor: '#f0f0f0' }} value={values.taskId} />
                  <small className="text-muted">Auto-generated based on project</small>
                </div>

                {/* Status */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskStatusInput">Status</label>
                  <select className="form-select" id="taskStatusInput" value={values.status} onChange={(event) => changeValues({ status: event.target.value })}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Testing">Testing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Task Name */}
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="taskNameInput">Task Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="taskNameInput" placeholder="Enter task name" required
                    value={values.taskName} onChange={(event) => changeValues({ taskName: event.target.value })} />
                </div>

                {/* Phase/Activity */}
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="taskPhaseInput">Phase/Activity</label>
                  <input type="text" className="form-control" id="taskPhaseInput" placeholder="e.g., Phase 1: Preparation"
                    value={values.phase} onChange={(event) => changeValues({ phase: event.target.value })} />
                </div>

                {/* Duration */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskDurationInput">Duration (Days)</label>
                  <input type="number" className="form-control" id="taskDurationInput" placeholder="e.g., 5" min="0" step="0.5"
                    value={values.duration} onChange={changeDuration} />
                </div>

                {/* Responsibility */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskResponsibilityInput">Responsibility</label>
                  <input type="text" className="form-control" id="taskResponsibilityInput" placeholder="e.g., Dev Team"
                    value={values.responsibility} onChange={(event) => changeValues({ responsibility: event.target.value })} />
                </div>

                {/* Assigned To */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskAssignedToInput">Assigned To</label>
                  <select className="form-select" id="taskAssignedToInput">
                    <option value="">Select user...</option>
                    {users.options.map((user) => (
                      <option key={user._id} value={user._id}>{userOptionLabel(user)}</option>
                    ))}
                  </select>
                </div>

                {/* Dependencies (Multi-select) */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskDependenciesInput">Dependencies</label>
                  <select className="form-select" id="taskDependenciesInput" multiple>
                    {dependencies.options.map((task) => (
                      <option key={task._id} value={task.taskId}>{task.taskId} - {task.taskName}</option>
                    ))}
                  </select>
                  <small className="text-muted">Select tasks that must complete before this one</small>
                </div>

                {/* Baseline Start */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskBaselineStartInput">Baseline Start</label>
                  <input type="date" className="form-control" id="taskBaselineStartInput" value={values.baselineStart} onChange={changeBaselineStart} />
                  <small className="text-muted">Leave empty to auto-calculate from previous task</small>
                </div>

                {/* Baseline Finish */}
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="taskBaselineFinishInput">Baseline Finish
                    <small className="text-muted">(Auto-calculated)</small>
                  </label>
                  <input type="date" className="form-control" id="taskBaselineFinishInput" readOnly style={{ backgroundColor: '#f0f0f0' }} value={values.baselineFinish} />
                  <small className="text-muted">Calculated from Start + Duration (excluding weekends)</small>
                </div>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="saveTaskBtn" onClick={saveTask}>
              <i className="fa fa-save me-1"></i>Save Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
