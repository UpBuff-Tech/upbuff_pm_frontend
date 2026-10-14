/**
 * When a task's Actual Start / Actual Finish get stamped.
 *
 * These two dates used to be written in only two places — the client portal
 * method and the project edit modal's client-side save — so the path employees
 * actually use (dragging a card across the board, or just hitting the timer)
 * left them empty forever. Every write path now runs the same rule through
 * this one pure function.
 *
 * The rules:
 *  - actualStart is stamped the first time work demonstrably begins: a timer
 *    session opens, or the task moves into In Progress. Whichever happens
 *    first wins and it is never overwritten, so it records when work actually
 *    started rather than the last time someone touched the task.
 *  - actualFinish is stamped on the move into Completed, and cleared when a
 *    Completed task is reopened — so a task that comes back for more work
 *    doesn't keep claiming it finished.
 *  - A value already on the task (set by hand, imported, or stamped earlier)
 *    is left alone. This function only fills in blanks.
 *
 * Pure and free of collection access: the same rule serves the live method
 * paths and the backfill migration, which replays historical instants through
 * it by passing them as `now` / `timerStartedAt`.
 */

const COMPLETED = 'Completed';
const IN_PROGRESS = 'In Progress';

const sameStatus = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();

/**
 * The actual-date fields to write for a task that is changing.
 *
 * @param {Object} task - the task as it stands BEFORE this change. Only
 *        `status` (the previous status), `actualStart` and `actualFinish` are
 *        read; pass `{}` for a task being created.
 * @param {Object} [options]
 * @param {String} [options.newStatus] - status being moved to, when this
 *        change is a status change
 * @param {Date} [options.timerStartedAt] - when this change opens a timer
 *        session; its start instant is what actualStart records
 * @param {Date} [options.completedAt] - when this task is KNOWN to have
 *        completed, for a task already sitting in Completed. Only the
 *        backfill passes this: it reconstructs history rather than observing
 *        a transition, so it is the one way a finish is stamped without one.
 * @param {Date} [options.now] - reference instant (defaults to Date.now)
 * @returns {Object} fields to $set — empty when nothing should change.
 *          `actualFinish: null` means "clear it".
 */
export function actualDateUpdates(task = {}, {
  newStatus,
  timerStartedAt,
  completedAt,
  now = new Date()
} = {}) {
  const updates = {};
  const previousStatus = task.status;

  // A status change only counts as a transition when the status actually
  // moves — repeated saves of an unchanged status must not restamp anything.
  const isStatusChange = newStatus !== undefined && newStatus !== null
    && !sameStatus(previousStatus, newStatus);

  // --- actualStart: first sign of real work, set once ---
  if (!task.actualStart) {
    const startingTimer = !!timerStartedAt;
    const movingToInProgress = isStatusChange && sameStatus(newStatus, IN_PROGRESS);
    if (startingTimer || movingToInProgress) {
      updates.actualStart = timerStartedAt || now;
    }
  }

  // --- actualFinish: stamped on completion, cleared on reopen ---
  if (isStatusChange) {
    if (sameStatus(newStatus, COMPLETED)) {
      if (!task.actualFinish) updates.actualFinish = now;
    } else if (sameStatus(previousStatus, COMPLETED)) {
      // Reopened: the task has not finished after all.
      updates.actualFinish = null;
    }
  } else if (completedAt && !task.actualFinish && sameStatus(previousStatus, COMPLETED)) {
    // A task that completed before any of this existed: no transition to
    // observe, only the record that it happened.
    updates.actualFinish = completedAt;
  }

  return updates;
}

/**
 * Human-readable notes for an activity log, describing what the fragment did.
 * The client portal records these alongside its own change notes.
 *
 * @param {Object} updates - the fragment from actualDateUpdates()
 * @returns {String[]} one note per field changed
 */
export function describeActualDateChanges(updates = {}) {
  const notes = [];
  if (updates.actualStart) notes.push('Actual start date set automatically');
  if (updates.actualFinish) notes.push('Actual finish date set automatically');
  else if (updates.actualFinish === null) notes.push('Actual finish date cleared');
  return notes;
}
