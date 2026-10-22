/**
 * One task card of the kanban board:
 *
 *   <TaskCardUpdated task={task} board={board} />
 *
 * `task` is the slim card doc of the column; `board` is the Task page's board
 * object (lookup maps, openTaskDetail, changeTaskStatus, startTaskTimer, stopTaskTimer).
 */
import { useEffect, useState } from 'react';

import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import TaskRequestTypeBadge from '../../components/TaskRequestTypeBadge';
import { formatSeconds, userFullName } from './updatedTaskUtils';

const MAX_SESSION_SECONDS = 8 * 60 * 60; // mirror the server's cap

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const STATUSES = ['Pending', 'In Progress', 'On Hold', 'Testing', 'Completed']; // the board's columns

const PROJECT_COLORS = [
  { bg: '#4f46e5', text: '#fff' },  // Primary purple
  { bg: '#0891b2', text: '#fff' },  // Cyan
  { bg: '#16a34a', text: '#fff' },  // Green
  { bg: '#dc2626', text: '#fff' },  // Red
  { bg: '#d97706', text: '#fff' },  // Orange
  { bg: '#64748b', text: '#fff' },  // Gray
  { bg: '#e83e8c', text: '#fff' },  // Pink
  { bg: '#20c997', text: '#fff' },  // Teal
  { bg: '#6610f2', text: '#fff' },  // Indigo
  { bg: '#fd7e14', text: '#fff' },  // Dark Orange
  { bg: '#17a2b8', text: '#fff' },  // Info Blue
  { bg: '#28a745', text: '#fff' },  // Success Green
];

function getStatusClass(status) {
  if (!status) return 'pending';
  return status.toLowerCase().replace(/\s+/g, '');
}

/** The project's colour: the same hash and palette as before, so every project keeps its colour. */
function getProjectColor(projectId) {
  if (!projectId) return '#64748b';
  // Same consistent hash as the original board, so colors match
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length].bg;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function canUseTimer(status) {
  if (!status) return false;
  const statusLower = status.toLowerCase();
  return statusLower === 'in progress' || statusLower === 'testing';
}

/** True while the task's timer is running (and not paused). */
function isTimerRunning(timerState) {
  return !!(timerState && typeof timerState === 'object' &&
    timerState.isRunning && !timerState.isPaused);
}

/**
 * Live time display: committed timeSpent plus the current session while a
 * timer runs (the board re-renders the cards every second). timerState
 * arrives with the column's docs, so this is correct even for a timer
 * started on another device.
 */
function cardTimeDisplay(task) {
  let total = task.timeSpent || 0;
  const timerState = task.timerState;
  if (timerState && typeof timerState === 'object') {
    if (timerState.isRunning && !timerState.isPaused) {
      let live = timerState.accumulated || 0;
      if (timerState.startTime) {
        const elapsed = Math.floor((Date.now() - new Date(timerState.startTime).getTime()) / 1000);
        if (elapsed > 0) live += elapsed;
      }
      if (live > MAX_SESSION_SECONDS) live = MAX_SESSION_SECONDS;
      total += live;
    } else if (timerState.isPaused) {
      total += (timerState.accumulated || 0);
    }
  }
  return formatSeconds(total);
}

export default function TaskCardUpdated({ task, board }) {
  const { userId } = useAuth();

  // The priority shown in the dropdown: changes instantly when the user picks
  // one, and follows the task doc whenever its priority changes.
  const [priority, setPriority] = useState(task.priority || 'Low');
  useEffect(() => {
    setPriority(task.priority || 'Low');
  }, [task.priority]);

  // The status shown in the status dropdown, kept the same way as the priority.
  const [status, setStatus] = useState(task.status || 'Pending');
  useEffect(() => {
    setStatus(task.status || 'Pending');
  }, [task.status]);

  const getProjectName = (projectId) => {
    if (!projectId) return 'Unknown Project';
    if (!board || !board.projectMap) return 'Loading...';
    const project = (board.projectMap || {})[projectId];
    return project ? project.name : 'Unknown Project';
  };

  const getAssignedUserName = (assignedTo) => {
    if (!assignedTo) return null;
    if (!board || !board.userMap) return 'Loading...';
    const user = (board.userMap || {})[assignedTo];
    if (!user) return 'Unknown User';
    return userFullName(user) || 'Unknown User';
  };

  const timerRunning = isTimerRunning(task.timerState);
  const startBtnDisabled = timerRunning;
  const stopBtnDisabled = !(timerRunning && task.timerState.userId === userId);
  const timerAllowed = canUseTimer(task.status);

  /**
   * Open the task detail modal — unless the click was on one of the card's
   * interactive controls (priority/status dropdowns, timer buttons).
   */
  const handleCardClick = (event) => {
    if (event.target.closest('.task-priority-select, .task-status-select, .timer-buttons-container')) {
      return;
    }
    if (board && board.openTaskDetail) {
      board.openTaskDetail(task);
    }
  };

  const handleTimerStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (board && board.startTaskTimer) {
      board.startTaskTimer(task._id);
    }
  };

  const handleTimerStop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (board && board.stopTaskTimer) {
      board.stopTaskTimer(task._id);
    }
  };

  const handleSelectClick = (event) => {
    event.stopPropagation(); // don't open the detail modal
  };

  const handlePriorityChange = (event) => {
    event.stopPropagation();
    const newPriority = event.currentTarget.value;
    const previousPriority = task.priority || 'Low';

    // Instant feedback; the reloaded task doc confirms it after save
    setPriority(newPriority);

    api.call('projectTasks.updatePriority', task._id, newPriority, (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to update priority');
        // Revert — the doc didn't change, so nothing else will do it for us
        setPriority(previousPriority);
        return;
      }
      toastr.success(`Priority updated to ${newPriority}`);
    });
  };

  /**
   * Move the task to another column without opening the edit modal - does
   * exactly what dragging the card to that column does.
   */
  const handleStatusChange = (event) => {
    event.stopPropagation();
    const newStatus = event.currentTarget.value;
    const previousStatus = task.status || 'Pending';

    // Instant feedback; the card moves column once the board reloads
    setStatus(newStatus);

    board.changeTaskStatus(task._id, newStatus, previousStatus, (error) => {
      // Revert — the doc didn't change, so nothing else will do it for us
      if (error) setStatus(previousStatus);
    });
  };

  const assigneeName = task.assignedTo ? getAssignedUserName(task.assignedTo) : null;
  const projectColor = getProjectColor(task.projectId);

  return (
    <div className={`kanban-task-card status-${getStatusClass(task.status)}${timerRunning ? ' is-running' : ''}`}
      data-task-id={task._id} onClick={handleCardClick}
      tabIndex={0} role="button" aria-label={`${task.taskId || ''} ${task.taskName || ''}`.trim()}
      onKeyDown={(event) => {
        // Enter/Space on the card itself (not its controls) opens the details
        if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
          event.preventDefault();
          handleCardClick(event);
        }
      }}>
      <div className="tc-top">
        <span className="tc-id">{task.taskId}</span>
        <span className="tc-selects">
          <select className="task-status-select" data-task-id={task._id} data-status={status}
            title="Change status" aria-label="Status"
            value={status} onClick={handleSelectClick} onChange={handleStatusChange}>
            {STATUSES.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className="task-priority-select" data-task-id={task._id} data-priority={priority}
            title="Change priority" aria-label="Priority"
            value={priority} onClick={handleSelectClick} onChange={handlePriorityChange}>
            {PRIORITIES.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </span>
      </div>

      <div className="tc-tags">
        <span className="tc-project" style={{ '--project': projectColor }} title={getProjectName(task.projectId)}>
          <i></i>{getProjectName(task.projectId)}
        </span>
        {task.requestType && <TaskRequestTypeBadge requestType={task.requestType} className="tc-request" />}
      </div>

      {task.phase && <div className="task-phase">{task.phase}</div>}
      <div className="task-title">{task.taskName}</div>

      <div className="tc-meta">
        {task.duration !== undefined && task.duration !== null && task.duration !== '' && (
          <span title="Planned duration"><i className="bx bx-calendar"></i>{task.duration}d</span>
        )}
        {task.responsibility && (
          <span title="Responsibility"><i className="bx bx-briefcase"></i>{task.responsibility}</span>
        )}
      </div>

      <div className="tc-footer">
        <div className="tc-assignee" title={assigneeName ? 'Assigned to ' + assigneeName : 'Unassigned'}>
          {assigneeName ? (
            <>
              <span className="tc-avatar">{initials(assigneeName)}</span>
              <span className="tc-assignee-name">{assigneeName}</span>
            </>
          ) : (
            <>
              <span className="tc-avatar tc-avatar-empty"><i className="bx bx-user"></i></span>
              <span className="tc-assignee-name text-muted">Unassigned</span>
            </>
          )}
        </div>

        <div className="tc-time">
          {timerRunning && <span className="tc-live" title="Timer running"></span>}
          <span className="task-timer-display" data-task-id={task._id}>{cardTimeDisplay(task)}</span>
          {timerAllowed && (
            <span className="timer-buttons-container">
              <button type="button" className="tc-timer-btn tc-play task-timer-start" data-task-id={task._id}
                title="Start timer" aria-label="Start timer" disabled={startBtnDisabled} onClick={handleTimerStart}>
                <i className="bx bx-play"></i>
              </button>
              <button type="button" className="tc-timer-btn tc-stop task-timer-stop" data-task-id={task._id}
                title="Stop timer" aria-label="Stop timer" disabled={stopBtnDisabled} onClick={handleTimerStop}>
                <i className="bx bx-stop"></i>
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
