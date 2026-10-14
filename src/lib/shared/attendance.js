// Attendance constants (from the old imports/api/attendance/attendance.js).

// Attendance status constants
export const AttendanceStatus = {
  PUNCHED_IN: 'punched_in',
  PUNCHED_OUT: 'punched_out'
};

// 7 PM auto-punch-out prompt statuses (stored on Attendance.punchOutPrompt)
export const PunchOutPromptStatus = {
  PENDING: 'pending',                       // Prompt shown, awaiting user response
  CANCELLED: 'cancelled',                   // User chose to keep working
  AUTO_PUNCHED_OUT: 'auto_punched_out'      // Grace period elapsed, cron punched out
};
