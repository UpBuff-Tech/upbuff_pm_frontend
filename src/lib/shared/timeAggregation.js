/**
 * Shared time-aggregation helpers for task timer reporting.
 *
 * A task's `timerLogs` mixes two kinds of entries:
 *   - `action: 'stopped'`      → a real timer session; `duration` is always >= 0.
 *   - `action: 'manual_edit'`  → a manual correction to `timeSpent`; `duration`
 *                                is a SIGNED delta and is frequently negative
 *                                (e.g. a user trimming an over-counted total).
 *
 * Summing these raw lets a single downward correction drive a task's period
 * total negative. In a grand total that negative silently cancels other tasks'
 * real time — which is how the daily summary email could show "Today: 0h 0m"
 * while individual task rows clearly listed hours of work.
 *
 * The fix everywhere is the same: net a task's entries for the period, then
 * clamp at 0 so a correction can never subtract from another task's time.
 */

// A single timer session may never count for more than this many seconds. Keep
// in sync with TIMER_MAX_DURATION_SECONDS in methods.js — both express the same
// 8-hour cap and are used to stop a runaway timer from inflating totals.
export const TIMER_MAX_DURATION_SECONDS = 8 * 60 * 60;

/* ------------------------------------------------------------------ */
/* Duration formatting                                                 */
/*                                                                     */
/* Three renderings of the same seconds, kept together so a number      */
/* never reads one way in a report and another in an export. Safe on    */
/* the client too — the export column sets render hours themselves.     */
/* ------------------------------------------------------------------ */

/** "Xh Ym Zs" — the reports' and exports' duration format. */
export const formatTime = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return '0h 0m 0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  if (seconds > 0) result += `${seconds}s`;

  return result.trim() || '0s';
};

/** "HH:MM:SS" — the clock format used by the activity log and dashboards. */
export const formatClock = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/** Decimal hours to 2dp — the unit the date-wise hours reports total in. */
export const formatHours = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return '0.00';
  return (totalSeconds / 3600).toFixed(2);
};

/**
 * Elapsed seconds of a (possibly running) timer state, computed the same way the
 * stop path commits it: accumulated paused time plus the time since the current
 * run began, clamped to the 8-hour cap. Returns 0 for a missing/stopped state.
 *
 * This is the single source of truth for "how long has this timer been going",
 * shared by the server stop logic and the live "Today's Working Hours" total so
 * the running portion of the banner can be computed authoritatively on the
 * server instead of from fragile per-browser state.
 *
 * @param {Object} timerState - task.timerState ({ isRunning, isPaused, startTime, accumulated })
 * @param {Number} [nowMs] - reference "now" in ms (defaults to Date.now())
 * @returns {Number} elapsed seconds (0 .. TIMER_MAX_DURATION_SECONDS)
 */
/**
 * A timer may only run while its task is In Progress or Testing. Any running
 * timerState found on a task in another status (Pending / On Hold / Completed) is
 * orphaned/stale and must NOT be treated as an active timer — otherwise the live
 * "Today's Working Hours" banner ticks forever on work that already ended.
 *
 * Single source of truth for the rule, shared by the status-change stop logic,
 * the banner total, the stale-timer cleanup, and setTimerState.
 *
 * @param {String} status - task status string
 * @returns {Boolean} true when a running timer is allowed for this status
 */
export const isTimerEligibleStatus = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'in progress' || s === 'testing';
};

/**
 * Start and end (ms timestamps) of the calendar day, in a fixed-offset business
 * timezone, that contains refMs. `offsetMinutes` is the timezone's offset east
 * of UTC (e.g. +330 for IST). With offsetMinutes = 0 this is the UTC day.
 *
 * Server-side "today" math (the stale-timer cron, and the fallback when a client
 * doesn't send its own local day bounds) must not depend on the machine's
 * timezone — a server in UTC would otherwise compute a day boundary 5.5h off
 * from an IST user and attribute work to the wrong day. Passing the business
 * offset here makes "today" match users' local day regardless of server TZ.
 *
 * @param {Number} refMs - reference instant in ms since epoch
 * @param {Number} [offsetMinutes] - business timezone offset east of UTC, in minutes
 * @returns {{dayStartMs: Number, dayEndMs: Number}}
 */
export const businessDayBounds = (refMs, offsetMinutes = 0) => {
  const DAY = 24 * 60 * 60 * 1000;
  const shifted = refMs + offsetMinutes * 60000;
  const msIntoDay = ((shifted % DAY) + DAY) % DAY;
  const dayStartMs = shifted - msIntoDay - offsetMinutes * 60000;
  return { dayStartMs, dayEndMs: dayStartMs + DAY - 1 };
};

export const computeLiveTimerSeconds = (timerState, nowMs = Date.now()) => {
  if (!timerState) return 0;
  let duration = timerState.accumulated || 0;
  if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
    duration += Math.floor((nowMs - new Date(timerState.startTime).getTime()) / 1000);
  }
  if (duration < 0) duration = 0;
  if (duration > TIMER_MAX_DURATION_SECONDS) duration = TIMER_MAX_DURATION_SECONDS;
  return duration;
};

// The work-date bounds helper that used to live here read `timerLogs`, which
// has been a frozen archive since the sessions cutover — and referenced a
// TIMER_LOG_ACTIONS constant that was deleted with the other legacy readers,
// so it threw for any task still carrying a pre-cutover log. Its replacement
// is workDateBounds() in taskSessions/server/sessionEngine.js, which reads the
// sessions the timer actually writes.
