/**
 * Tasks tab of the project form (#project-tasks): the task list with drag & drop ordering.
 *
 * `rowsStyle` says which of the two row layouts the list is in: 'full' (the normal one), or
 * 'afterPendingDelete' (the plainer rows shown after "Delete All Pending Tasks").
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext';
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import { findKnownUser, formatSlashDate, getFormTaskStatusBadge } from './projectHelpers';
import { openAddProjectTaskModal, openEditProjectTaskModal } from './ProjectTaskFormModal';

function TaskRow({ task, index, tasks, rowsStyle, onDeleteTask }) {
  const { user } = useAuth();
  const full = rowsStyle === 'full';
  const statusBadge = getFormTaskStatusBadge(task.status);

  // Get assigned user name
  const assignedUserName = task.assignedTo ? (findKnownUser(user, task.assignedTo)?.profile?.firstName || '-') : '-';

  // Format dependencies
  let dependenciesText = '-';
  if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
    dependenciesText = full
      ? task.dependencies.map(depId => {
        const depTask = tasks.find(t => t._id === depId);
        return depTask ? depTask.taskId : depId;
      }).join(', ')
      : task.dependencies.join(', ');
  }

  const editTask = (event) => {
    event.preventDefault();
    openEditProjectTaskModal(task._id);
  };

  return (
    <tr data-task-id={task._id} data-order={full ? (task.order || index) : undefined}>
      {full ? (
        <td className="drag-handle" style={{ cursor: 'move', textAlign: 'center' }}>
          <i className="fa fa-bars"></i>
        </td>
      ) : (
        <td className="drag-handle" style={{ cursor: 'move' }}><i className="fa fa-bars text-muted"></i></td>
      )}
      <td>{task.taskId || '-'}</td>
      <td>{task.phase || '-'}</td>
      <td>{task.taskName || '-'}</td>
      <td>{task.duration || (full ? 0 : '-')}</td>
      <td>{formatSlashDate(task.baselineStart)}</td>
      <td>{formatSlashDate(task.baselineFinish)}</td>
      <td>{assignedUserName}</td>
      <td>{task.responsibility || '-'}</td>
      <td>{full ? <small>{dependenciesText}</small> : dependenciesText}</td>
      <td><span className={`badge bg-${statusBadge}`}>{task.status || 'Pending'}</span></td>
      <td>
        <button className="btn btn-sm btn-outline-primary edit-task-btn" data-task-id={task._id} title="Edit" onClick={editTask}>
          <i className="fa fa-pencil"></i>
        </button>
        <button className="btn btn-sm btn-outline-danger delete-task-btn" data-task-id={task._id} title="Delete"
          onClick={(event) => onDeleteTask(event, task._id)}>
          <i className="fa fa-trash"></i>
        </button>
      </td>
    </tr>
  );
}

export default function ProjectTasksTab({ tasks, rowsStyle, exportConfig, onDeletePendingTasks, onDeleteTask, onReorderTask }) {
  const listRef = useRef(null);
  // The drag & drop plugin is created once; it always calls the newest onReorderTask
  const onReorderRef = useRef(onReorderTask);
  onReorderRef.current = onReorderTask;

  // Initialize Sortable for drag-and-drop
  useEffect(() => {
    if (!window.Sortable) return undefined;

    const sortable = new window.Sortable(listRef.current, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: function (evt) {
        const taskId = $(evt.item).data('task-id');
        const { oldIndex, newIndex } = evt;

        // Put the row back where it was: React moves it by changing the list
        evt.from.removeChild(evt.item);
        evt.from.insertBefore(evt.item, evt.from.children[oldIndex] || null);

        onReorderRef.current(taskId, oldIndex, newIndex);
      }
    });

    return () => sortable.destroy();
  }, []);

  const addNewTask = (event) => {
    event.preventDefault();
    openAddProjectTaskModal();
  };

  return (
    <div className="tab-pane fade" id="project-tasks" role="tabpanel">
      <div className="mb-3 d-flex gap-2 flex-wrap align-items-center">
        <button type="button" className="btn btn-primary btn-sm" id="addNewProjectTask" onClick={addNewTask}>
          <i className="fa fa-plus me-1"></i>Add New Task
        </button>
        <button type="button" className="btn btn-outline-danger btn-sm" id="deletePendingTasks" onClick={onDeletePendingTasks}>
          <i className="fa fa-trash me-1"></i>Delete All Pending Tasks
        </button>
        <TableExportButtons scope="projectTasks" size="btn-sm" wrapperClass="ms-auto" config={exportConfig} />
      </div>

      {/* Tasks List with Drag & Drop */}
      <div className="table-responsive">
        <table className="table table-bordered table-sm">
          <thead className="table-light">
            <tr>
              <th style={{ width: '30px' }}></th>
              <th style={{ width: '80px' }}>ID</th>
              <th style={{ width: '150px' }}>Phase/Activity</th>
              <th>Task Name</th>
              <th style={{ width: '100px' }}>Duration</th>
              <th style={{ width: '110px' }}>Baseline Start</th>
              <th style={{ width: '110px' }}>Baseline Finish</th>
              <th style={{ width: '130px' }}>Assigned To</th>
              <th style={{ width: '120px' }}>Responsibility</th>
              <th style={{ width: '150px' }}>Dependencies</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="projectTasksList" ref={listRef}>
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <TaskRow key={task._id} task={task} index={index} tasks={tasks} rowsStyle={rowsStyle} onDeleteTask={onDeleteTask} />
              ))
            ) : (
              <tr>
                <td colSpan="12" className="text-center text-muted">
                  {rowsStyle === 'full' ? 'No tasks available. Import from template or add manually.' : 'No tasks available.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
