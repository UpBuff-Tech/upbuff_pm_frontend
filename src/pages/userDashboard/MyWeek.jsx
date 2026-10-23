/**
 * "My week" card of My Dashboard: the hours worked (punch in → punch out) on each working day of
 * the current week as small bars, with the week's total against a 40-hour week.
 * Reads the same attendance records as the calendar (attendance.getMyAttendance).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import api, { onDataChanged } from '../../api/client';

const DAY_SECONDS = 8 * 3600; // a full working day
const WEEK_SECONDS = 5 * DAY_SECONDS; // the 40-hour week the total is compared with

function formatHm(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
}

/** Seconds worked on one attendance record (still punched in: until now). */
function workedSeconds(record) {
  if (record.status === 'punched_in' && record.punchInTime) {
    return Math.max(0, (Date.now() - new Date(record.punchInTime).getTime()) / 1000);
  }
  return record.totalHours || 0;
}

export default function MyWeek() {
  const [records, setRecords] = useState(null); // null = loading
  const [, setTick] = useState(0);

  const weekStart = moment().startOf('isoWeek'); // Monday
  const weekEnd = moment().endOf('isoWeek');

  useEffect(() => {
    let active = true;
    const load = () => {
      api.call('attendance.getMyAttendance',
        { startDate: weekStart.toDate(), endDate: weekEnd.toDate(), page: 1, perPage: 14 },
        (error, list) => {
          if (!active) return;
          setRecords(!error && Array.isArray(list) ? list : []);
        });
    };
    load();
    // Today's bar keeps growing while punched in
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    const stopListening = onDataChanged(load);
    return () => {
      active = false;
      clearInterval(timer);
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seconds per day "YYYY-MM-DD"
  const secondsByDay = {};
  for (const record of records || []) {
    const key = moment(record.date).format('YYYY-MM-DD');
    secondsByDay[key] = (secondsByDay[key] || 0) + workedSeconds(record);
  }

  // Monday-Friday, plus Saturday/Sunday only when worked
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = weekStart.clone().add(i, 'days');
    const key = day.format('YYYY-MM-DD');
    const seconds = secondsByDay[key] || 0;
    if (i >= 5 && !seconds) continue;
    days.push({ key, label: day.format('ddd'), seconds, isToday: day.isSame(moment(), 'day'), isFuture: day.isAfter(moment(), 'day') });
  }

  const total = days.reduce((sum, d) => sum + d.seconds, 0);
  const daysWorked = days.filter((d) => d.seconds > 0).length;
  const scale = Math.max(DAY_SECONDS, ...days.map((d) => d.seconds));
  const weekPercent = Math.min(100, Math.round((total / WEEK_SECONDS) * 100));

  return (
    <div className="card h-100 ud-card">
      <div className="ud-card-head">
        <span className="ud-card-icon"><i className="bx bx-bar-chart-alt-2"></i></span>
        <div>
          <h5>My week</h5>
          <p>{weekStart.format('D MMM')} – {weekEnd.format('D MMM')} · hours at work</p>
        </div>
        <Link to="/attendance/list" className="ud-link">Details</Link>
      </div>
      <div className="ud-card-body pt-0">
        {records === null ? (
          <span className="fx-skeleton ud-sk-calendar" style={{ height: 150 }}></span>
        ) : (
          <>
            <div className="ud-week-stats">
              <span><strong>{formatHm(total)}</strong><small>this week</small></span>
              <span><strong>{daysWorked ? formatHm(total / daysWorked) : '–'}</strong><small>avg per day</small></span>
              <span><strong>{weekPercent}%</strong><small>of 40h</small></span>
            </div>
            <div className="ud-week-bars">
              {days.map((d) => (
                <div key={d.key} className={'ud-week-day' + (d.isToday ? ' is-today' : '') + (d.isFuture ? ' is-future' : '')}
                  title={d.label + ': ' + (d.seconds ? formatHm(d.seconds) : 'no attendance')}>
                  <span className="ud-week-value">{d.seconds ? formatHm(d.seconds).replace(' 0m', '') : ''}</span>
                  <span className="ud-week-track">
                    <span style={{ height: Math.round((d.seconds / scale) * 100) + '%' }}></span>
                    <i className="ud-week-target" style={{ bottom: Math.round((DAY_SECONDS / scale) * 100) + '%' }}></i>
                  </span>
                  <span className="ud-week-label">{d.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
