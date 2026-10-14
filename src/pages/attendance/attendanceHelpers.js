/**
 * Plain helpers of the Attendance page: statistics, calendar events and the
 * texts shown in the detail modals.
 * @author Claude
 */
import moment from 'moment';

/**
 * Format minutes-since-midnight into a 12-hour clock string (e.g. 570 -> "09:30 AM").
 */
export function formatMinutesTo12Hour(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Office hours constants (9 AM to 6 PM)
const OFFICE_START_HOUR = 9;
const OFFICE_START_MINUTE = 0;

export const EMPTY_STATS = {
  avgPunchIn: '--:--',
  avgPunchOut: '--:--',
  avgWorkingHours: '--h --m',
  onTimePercentage: '--%',
  onTimePercent: 0,
  presentDays: 0,
  lateCount: 0,
  workingNow: 0
};

const ON_TIME_LIMIT = OFFICE_START_HOUR * 60 + OFFICE_START_MINUTE + 15; // 15 min grace period

function minutesOfDay(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

/** True when the record's punch-in is after 9:15 AM. */
export function isLate(record) {
  return !!record.punchInTime && minutesOfDay(record.punchInTime) > ON_TIME_LIMIT;
}

// Calculate statistics from attendance records
export function calculateStats(records) {
  if (!records || records.length === 0) {
    return { ...EMPTY_STATS };
  }

  let totalPunchInMinutes = 0;
  let punchInCount = 0;
  let totalPunchOutMinutes = 0;
  let punchOutCount = 0;
  let totalWorkingSeconds = 0;
  let workingCount = 0;
  let onTimeCount = 0;

  records.forEach(record => {
    // Punch in time
    if (record.punchInTime) {
      const punchIn = new Date(record.punchInTime);
      const punchInMinutes = punchIn.getHours() * 60 + punchIn.getMinutes();
      totalPunchInMinutes += punchInMinutes;
      punchInCount++;

      // Check if on time (before 9:15 AM with 15 min grace period)
      const onTimeThreshold = OFFICE_START_HOUR * 60 + OFFICE_START_MINUTE + 15;
      if (punchInMinutes <= onTimeThreshold) {
        onTimeCount++;
      }
    }

    // Punch out time
    if (record.punchOutTime) {
      const punchOut = new Date(record.punchOutTime);
      const punchOutMinutes = punchOut.getHours() * 60 + punchOut.getMinutes();
      totalPunchOutMinutes += punchOutMinutes;
      punchOutCount++;
    }

    // Working hours
    if (record.totalHours && record.totalHours > 0) {
      totalWorkingSeconds += record.totalHours;
      workingCount++;
    }
  });

  // Calculate averages
  let avgPunchIn = '--:--';
  if (punchInCount > 0) {
    avgPunchIn = formatMinutesTo12Hour(Math.round(totalPunchInMinutes / punchInCount));
  }

  let avgPunchOut = '--:--';
  if (punchOutCount > 0) {
    avgPunchOut = formatMinutesTo12Hour(Math.round(totalPunchOutMinutes / punchOutCount));
  }

  let avgWorkingHours = '--h --m';
  if (workingCount > 0) {
    const avgWorkingSeconds = Math.round(totalWorkingSeconds / workingCount);
    const avgHours = Math.floor(avgWorkingSeconds / 3600);
    const avgMinutes = Math.floor((avgWorkingSeconds % 3600) / 60);
    avgWorkingHours = `${avgHours}h ${avgMinutes}m`;
  }

  let onTimePercentage = '--%';
  if (punchInCount > 0) {
    const percentage = Math.round((onTimeCount / punchInCount) * 100);
    onTimePercentage = `${percentage}%`;
  }

  return {
    avgPunchIn: avgPunchIn,
    avgPunchOut: avgPunchOut,
    avgWorkingHours: avgWorkingHours,
    onTimePercentage: onTimePercentage,
    onTimePercent: punchInCount > 0 ? Math.round((onTimeCount / punchInCount) * 100) : 0,
    presentDays: records.length,
    lateCount: punchInCount - onTimeCount,
    workingNow: records.filter((record) => record.status === 'punched_in').length
  };
}

/** Weekday dates (Mon-Fri) covered by a leave, as Date objects. */
function leaveWeekdays(leave) {
  const days = [];
  const current = new Date(leave.fromDate);
  const end = new Date(leave.toDate);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export const ARRIVAL_BUCKETS = ['Before 9:00', '9:00 – 9:15', '9:15 – 9:30', '9:30 – 10:00', 'After 10:00'];

/**
 * Numbers for the insight charts:
 *   daily      last 30 days: { day, hours } - average worked hours per person who punched in that day
 *   arrivals   punch-ins per ARRIVAL_BUCKETS slot
 *   breakdown  { onTime, late, absent, leave, wfh } day counts
 */
export function buildInsights(records, leaves, absentDays) {
  const today = moment().startOf('day');
  const daily = [];
  const byDay = {};
  (records || []).forEach((record) => {
    if (!record.date) return;
    const key = moment(record.date).format('YYYY-MM-DD');
    if (!byDay[key]) byDay[key] = { seconds: 0, people: 0 };
    if (record.totalHours > 0) {
      byDay[key].seconds += record.totalHours;
      byDay[key].people += 1;
    }
  });
  for (let i = 29; i >= 0; i--) {
    const day = today.clone().subtract(i, 'days');
    const entry = byDay[day.format('YYYY-MM-DD')];
    daily.push({
      day: day.toDate(),
      hours: entry && entry.people ? Math.round((entry.seconds / entry.people / 3600) * 10) / 10 : 0,
    });
  }

  const arrivals = [0, 0, 0, 0, 0];
  let onTime = 0;
  let late = 0;
  (records || []).forEach((record) => {
    if (!record.punchInTime) return;
    const minutes = minutesOfDay(record.punchInTime);
    if (minutes < 9 * 60) arrivals[0] += 1;
    else if (minutes <= 9 * 60 + 15) arrivals[1] += 1;
    else if (minutes <= 9 * 60 + 30) arrivals[2] += 1;
    else if (minutes <= 10 * 60) arrivals[3] += 1;
    else arrivals[4] += 1;
    if (minutes <= ON_TIME_LIMIT) onTime += 1;
    else late += 1;
  });

  let leave = 0;
  let wfh = 0;
  (leaves || []).forEach((item) => {
    const days = leaveWeekdays(item).length;
    if (item.type === 'wfh') wfh += days;
    else leave += days;
  });

  return {
    daily,
    arrivals,
    breakdown: { onTime, late, absent: (absentDays || []).length, leave, wfh },
  };
}

/**
 * The FullCalendar events for attendance, leave, and absent records
 */
export function buildCalendarEvents(attendanceRecords, leaveRecords, absentDays = []) {
  const events = [];

  // Add attendance events
  if (attendanceRecords && attendanceRecords.length > 0) {
    attendanceRecords.forEach(record => {
      let backgroundColor = '#ffffff'; // White background
      let borderColor = '#28a745'; // Green border for completed (punched_out)
      let textColor = '#28a745'; // Green text
      let title = 'Present';

      if (record.status === 'punched_in') {
        borderColor = '#007bff'; // Blue border for currently working
        textColor = '#007bff'; // Blue text
        title = 'Working';
      }

      // Format times for display (12-hour clock)
      const punchInTime = record.punchInTime ? moment(record.punchInTime).format('hh:mm A') : '';
      const punchOutTime = record.punchOutTime ? moment(record.punchOutTime).format('hh:mm A') : 'Active';

      // Add employee name if admin is viewing all
      const employeeName = record.userName || '';
      const displayTitle = employeeName
        ? `${employeeName} (${punchInTime} - ${punchOutTime})`
        : `${title} (${punchInTime} - ${punchOutTime})`;

      events.push({
        id: 'attendance_' + record._id,
        title: displayTitle,
        start: record.date,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: textColor,
        classNames: ['att-event', record.status === 'punched_in' ? 'att-working' : (isLate(record) ? 'att-late' : 'att-present')],
        extendedProps: {
          timeRange: punchInTime ? `${punchInTime} – ${punchOutTime}` : '',
          type: 'attendance',
          ...record
        }
      });
    });
  }

  // Add leave/WFH events
  if (leaveRecords && leaveRecords.length > 0) {
    leaveRecords.forEach(leave => {
      let backgroundColor = '#dc3545'; // Red for leave
      let borderColor = '#dc3545';
      let title = 'Leave';

      if (leave.type === 'wfh') {
        backgroundColor = '#17a2b8'; // Cyan for WFH
        borderColor = '#17a2b8';
        title = 'WFH';
      }

      const employeeName = leave.userName || '';
      const displayTitle = employeeName ? `${employeeName} - ${title}` : title;

      // Create events for each day in the leave range
      const fromDate = new Date(leave.fromDate);
      const toDate = new Date(leave.toDate);
      const current = new Date(fromDate);

      while (current <= toDate) {
        const dayOfWeek = current.getDay();
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          events.push({
            id: 'leave_' + leave._id + '_' + current.toISOString(),
            title: displayTitle,
            start: new Date(current),
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            allDay: true,
            classNames: ['att-event', leave.type === 'wfh' ? 'att-wfh' : 'att-leave'],
            extendedProps: {
              type: 'leave',
              ...leave
            }
          });
        }
        current.setDate(current.getDate() + 1);
      }
    });
  }

  // Add absent days (no punch-in and no leave)
  if (absentDays && absentDays.length > 0) {
    absentDays.forEach(absent => {
      const backgroundColor = '#ffffff'; // White background
      const borderColor = '#dc3545'; // Red border

      const employeeName = absent.userName || '';
      const displayTitle = employeeName ? `${employeeName} - Absent` : 'Absent';

      events.push({
        id: 'absent_' + absent.userId + '_' + absent.dateStr,
        title: displayTitle,
        start: absent.date,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: '#dc3545', // Red text to match border
        allDay: true,
        classNames: ['att-event', 'att-absent'],
        extendedProps: {
          type: 'absent',
          ...absent
        }
      });
    });
  }

  return events;
}

// Hover text of a calendar event
export function getEventTooltip(event) {
  const data = event.extendedProps;
  let tooltipText = event.title;

  if (data.type === 'attendance') {
    tooltipText = data.userName
      ? `${data.userName} - ${data.status === 'punched_in' ? 'Currently Working' : 'Present'}`
      : event.title;
  } else if (data.type === 'leave') {
    tooltipText = data.userName
      ? `${data.userName} - ${data.type === 'wfh' ? 'Work From Home' : 'On Leave'}`
      : event.title;
  } else if (data.type === 'absent') {
    tooltipText = data.userName
      ? `${data.userName} - Absent (No Punch-in)`
      : 'Absent (No Punch-in)';
  }
  return tooltipText;
}

/**
 * Order list-view day sections so the latest date appears first.
 * FullCalendar's list view renders days in ascending order by default.
 * Sorts by each day row's data-date (instead of blindly reversing), so calling it
 * again after FullCalendar re-renders never flips the order back.
 */
export function reverseListViewDays(calendarEl) {
  const tbody = calendarEl.querySelector('.fc-list-table > tbody');
  if (!tbody) return;

  const sections = [];
  let currentSection = null;

  Array.from(tbody.children).forEach(row => {
    if (row.classList.contains('fc-list-day')) {
      currentSection = { date: row.getAttribute('data-date') || '', rows: [row] };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.rows.push(row);
    }
  });

  const sorted = [...sections].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (sorted.every((section, i) => section === sections[i])) return; // already newest first

  sorted.forEach(section => {
    section.rows.forEach(row => tbody.appendChild(row));
  });
}

// "Lat: .., Lng: .." text and Google Maps link of a punch location, or null when there is none
function describeLocation(location) {
  if (location && location.latitude) {
    return {
      text: `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`,
      mapUrl: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    };
  }
  return null;
}

/**
 * The texts of the attendance detail modal for one record
 */
export function describeAttendance(record) {
  const detail = {
    employee: record.userName || 'Unknown',
    date: record.date ? moment(record.date).format('MMMM DD, YYYY') : '-',
    punchIn: record.punchInTime ? moment(record.punchInTime).format('hh:mm A') : '-',
    punchOut: record.punchOutTime ? moment(record.punchOutTime).format('hh:mm A') : 'Not punched out yet',
    totalHours: '-',
    onTime: null, // { badgeClass, text } once punched in
    punchInLocation: describeLocation(record.punchInLocation),
    punchOutLocation: describeLocation(record.punchOutLocation)
  };

  // Calculate total hours
  if (record.totalHours) {
    const hours = Math.floor(record.totalHours / 3600);
    const minutes = Math.floor((record.totalHours % 3600) / 60);
    detail.totalHours = `${hours}h ${minutes}m`;
  } else if (record.punchInTime && record.status === 'punched_in') {
    const now = new Date();
    const punchIn = new Date(record.punchInTime);
    const diffSeconds = Math.floor((now - punchIn) / 1000);
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    detail.totalHours = `${hours}h ${minutes}m (In progress)`;
  }

  // On-time status
  if (record.punchInTime) {
    const punchIn = new Date(record.punchInTime);
    const punchInMinutes = punchIn.getHours() * 60 + punchIn.getMinutes();
    const onTimeThreshold = OFFICE_START_HOUR * 60 + OFFICE_START_MINUTE + 15;

    if (punchInMinutes <= onTimeThreshold) {
      detail.onTime = { badgeClass: 'bg-success', text: 'On Time' };
    } else {
      const lateMinutes = punchInMinutes - (OFFICE_START_HOUR * 60 + OFFICE_START_MINUTE);
      const lateHours = Math.floor(lateMinutes / 60);
      const lateMins = lateMinutes % 60;
      const lateText = lateHours > 0 ? `${lateHours}h ${lateMins}m late` : `${lateMins}m late`;
      detail.onTime = { badgeClass: 'bg-warning', text: lateText };
    }
  }

  return detail;
}

/**
 * The texts of the leave detail modal for a leave / WFH record
 */
export function describeLeave(leave) {
  return {
    badgeClass: leave.type === 'leave' ? 'bg-danger' : 'bg-info',
    badgeText: leave.type === 'leave' ? 'Flexi Leave' : leave.type === 'optional' ? 'Optional Holiday' : 'Work From Home',
    employee: leave.userName || 'Unknown',
    fromDate: moment(leave.fromDate).format('MMM DD, YYYY'),
    toDate: moment(leave.toDate).format('MMM DD, YYYY'),
    reason: leave.reason || '-'
  };
}

/**
 * The texts of the leave detail modal for an absent day
 */
export function describeAbsent(absent) {
  return {
    badgeClass: 'bg-danger',
    badgeText: 'Absent',
    employee: absent.userName || 'Unknown',
    fromDate: moment(absent.date).format('MMM DD, YYYY'),
    toDate: moment(absent.date).format('MMM DD, YYYY'),
    reason: 'No punch-in recorded for this working day'
  };
}

/** The status key of a calendar event: present | late | working | leave | wfh | absent. */
export function eventStatus(event) {
  const classes = event.classNames || [];
  return ['working', 'late', 'present', 'wfh', 'leave', 'absent']
    .find((status) => classes.includes('att-' + status)) || 'present';
}

export const DAY_STATUS_ORDER = ['present', 'late', 'working', 'wfh', 'leave', 'absent'];
export const DAY_STATUS_LABELS = {
  present: 'Present', late: 'Late', working: 'Working', wfh: 'WFH', leave: 'Leave', absent: 'Absent'
};

/**
 * One summary event per day for the "All employees" month view: the day's events are grouped
 * so a cell shows counts per status instead of one chip per person.
 * extendedProps: { type: 'daySummary', date, counts, people: [{ status, event }] }
 */
export function buildDaySummaries(events) {
  const days = {};
  events.forEach((event) => {
    const key = moment(event.start).format('YYYY-MM-DD');
    if (!days[key]) days[key] = [];
    days[key].push({ status: eventStatus(event), event });
  });

  return Object.keys(days).map((key) => {
    const people = days[key];
    const counts = {};
    people.forEach(({ status }) => { counts[status] = (counts[status] || 0) + 1; });
    return {
      id: 'day_' + key,
      start: key,
      allDay: true,
      title: people.length + ' people',
      classNames: ['att-day-summary'],
      extendedProps: { type: 'daySummary', date: key, counts, people },
    };
  });
}
