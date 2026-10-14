/**
 * Shared utilities for the rebuilt task board (/updated/task/list) widgets.
 *
 * The widgets receive the board (the Task page's state and functions) as their
 * `board` prop - see Task.jsx for what it holds.
 */
import api from '../../api/client';

/** Format seconds as HH:MM:SS. */
export function formatSeconds(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Format seconds as "1h 2m 3s" (the banner and the breakdown total). */
export function formatHoursMinutesSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

/** "First Last" of a user doc. */
export function userFullName(user) {
  return `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
}

/**
 * Re-fetch the detail modal's full task doc so every tab shows fresh values
 * after a mutation (edit, assign, comment, attachment upload).
 */
export function refreshTaskDetail(board, taskId) {
  api.call('projectTasks.getById', taskId, (error, fullTask) => {
    if (!error && fullTask && board.isActive()) {
      board.setDetailTask(fullTask);
      board.setDetailFullTask(fullTask);
    }
  });
}

/**
 * Clear the legacy timer engine's local shadow of a task's timer (in-memory
 * window.taskCardTimers + its localStorage backup). Called when this board
 * stops a timer, so the old engine can't keep showing — or keep-alive-syncing
 * — a timer the server already stopped.
 */
export function clearLegacyTimerShadow(taskId) {
  if (window.taskCardTimers && window.taskCardTimers[taskId]) {
    delete window.taskCardTimers[taskId];
  }
  try {
    const raw = localStorage.getItem('taskCardTimers');
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored && stored[taskId]) {
        delete stored[taskId];
        if (Object.keys(stored).length > 0) {
          localStorage.setItem('taskCardTimers', JSON.stringify(stored));
        } else {
          localStorage.removeItem('taskCardTimers');
        }
      }
    }
  } catch (e) { /* corrupt storage — ignore */ }
}
