/**
 * Shared task effort helpers.
 *
 * Task `duration` is stored in days and rounds down to 0 for anything shorter
 * than a day, so "0d" is meaningless as an effort figure. Every screen that
 * shows hours for a task must go through here so they all agree.
 */

// Standard working hours in a single working day.
export const WORK_HOURS_PER_DAY = 8;

/**
 * Convert a duration expressed in days into total working hours.
 */
export function durationToHours(durationInDays) {
  const days = parseFloat(durationInDays) || 0;
  return days * WORK_HOURS_PER_DAY;
}

/**
 * Total effort of a task, in seconds.
 *
 * Priority order matters: the timer's `timeSpent` is the only real measurement
 * (it is what the kanban card shows), followed by manually entered planned
 * hours, with the day-based estimate as a last resort.
 */
export function getTaskTotalSeconds(task) {
  if (!task) return 0;

  const timeSpent = parseInt(task.timeSpent, 10) || 0;
  if (timeSpent > 0) return timeSpent;

  const plannedHours = parseFloat(task.plannedHours) || 0;
  if (plannedHours > 0) return Math.round(plannedHours * 3600);

  return Math.round(durationToHours(task.duration) * 3600);
}

/**
 * Duration of a task in working days, derived from its total effort:
 * total hours / WORK_HOURS_PER_DAY, rounded to at most 2 decimals.
 */
export function getTaskDurationDays(task) {
  const totalHours = getTaskTotalSeconds(task) / 3600;
  return Math.round((totalHours / WORK_HOURS_PER_DAY) * 100) / 100;
}

/**
 * Format a seconds count as compact working time, e.g. "25h 31m", "45m", "0h".
 */
export function formatHoursMinutes(totalSeconds) {
  const seconds = parseInt(totalSeconds, 10) || 0;
  if (seconds <= 0) return '0h';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * The old global helper {{taskTotalHours this}} -> "25h 31m"
 */
export function taskTotalHours(task) {
  return formatHoursMinutes(getTaskTotalSeconds(task));
}

/**
 * The old global helper {{taskDurationDays this}} -> 0.31
 */
export function taskDurationDays(task) {
  return getTaskDurationDays(task);
}
