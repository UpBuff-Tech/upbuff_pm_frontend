/**
 * Early leave requests (leaving the office before the end of the working day):
 * the constants and helpers of the old imports/api/leaveRequests/earlyLeaveRequests.js.
 * @author Claude
 */

// Regular office hours (HH:mm); early leave must fall within them.
export const OFFICE_START_TIME = '09:00';
export const OFFICE_END_TIME = '18:00';

// Required working time per day
export const REQUIRED_WORK_MINUTES = 8 * 60;

// 'HH:mm' (24h) -> 'hh:mm AM/PM'
export function formatLeavingTime(time) {
  if (!time) return '-';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Date -> 'hh:mm AM/PM' (local time)
export function formatClockTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return formatLeavingTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
}

// Leaving moment of a request: its date combined with leavingTime (local time)
export function getLeavingDateTime(request) {
  const [hours, minutes] = request.leavingTime.split(':').map(Number);
  const leavingAt = new Date(request.date);
  leavingAt.setHours(hours, minutes, 0, 0);
  return leavingAt;
}

// Minutes worked from punch-in until the requested leaving time, or null
export function getMinutesWorkedUntilLeaving(request) {
  if (!request.punchInTime || !request.leavingTime) return null;
  const minutes = Math.floor((getLeavingDateTime(request) - new Date(request.punchInTime)) / 60000);
  return minutes >= 0 ? minutes : null;
}

// Minutes short of the required working time at the leaving time (0 if none), or null
export function getShortfallMinutes(request) {
  const worked = getMinutesWorkedUntilLeaving(request);
  if (worked === null) return null;
  return Math.max(REQUIRED_WORK_MINUTES - worked, 0);
}

// Validation message for a leaving time outside office hours, or null
export function getLeavingTimeError(leavingTime) {
  if (leavingTime <= OFFICE_START_TIME || leavingTime >= OFFICE_END_TIME) {
    return `Leaving time must be between ${formatLeavingTime(OFFICE_START_TIME)} and ${formatLeavingTime(OFFICE_END_TIME)}`;
  }
  return null;
}
