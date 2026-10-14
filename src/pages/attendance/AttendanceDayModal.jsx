/**
 * Everyone's attendance for one day (opened from a day summary in the "All employees" month view).
 *
 *   <AttendanceDayModal day={{ date, people: [{ status, event }] }} onOpenPerson={(person) => ...} />
 *
 * A searchable, scrollable list grouped by status; clicking a person opens their detail modal.
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import { DAY_STATUS_LABELS, DAY_STATUS_ORDER } from './attendanceHelpers';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function hoursText(data) {
  if (data.totalHours > 0) {
    const h = Math.floor(data.totalHours / 3600);
    const m = Math.floor((data.totalHours % 3600) / 60);
    return h + 'h ' + m + 'm';
  }
  if (data.status === 'punched_in' && data.punchInTime) {
    const seconds = Math.floor((Date.now() - new Date(data.punchInTime)) / 1000);
    return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm so far';
  }
  return '';
}

export default function AttendanceDayModal({ day, onOpenPerson }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Start fresh for every day that is opened
  useEffect(() => {
    setSearch('');
    setStatusFilter('');
  }, [day]);

  const people = (day && day.people) || [];
  const counts = {};
  people.forEach(({ status }) => { counts[status] = (counts[status] || 0) + 1; });

  const term = search.trim().toLowerCase();
  const visible = people
    .filter(({ status, event }) => {
      if (statusFilter && status !== statusFilter) return false;
      const name = (event.extendedProps.userName || '').toLowerCase();
      return !term || name.includes(term);
    })
    .sort((a, b) => DAY_STATUS_ORDER.indexOf(a.status) - DAY_STATUS_ORDER.indexOf(b.status)
      || (a.event.extendedProps.userName || '').localeCompare(b.event.extendedProps.userName || ''));

  return (
    <div className="modal fade att-day-modal" id="attendanceDayModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title">{day ? moment(day.date).format('dddd, D MMMM YYYY') : ''}</h5>
              <small className="text-muted">{people.length} {people.length === 1 ? 'person' : 'people'}</small>
            </div>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>

          <div className="att-day-tools">
            <div className="att-day-search">
              <i className="bx bx-search"></i>
              <input type="text" className="form-control" placeholder="Search employee…" value={search}
                onChange={(event) => setSearch(event.target.value)} aria-label="Search employee" />
            </div>
            <div className="att-day-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={statusFilter === ''}
                className={'att-day-tab' + (statusFilter === '' ? ' active' : '')} onClick={() => setStatusFilter('')}>
                All <b>{people.length}</b>
              </button>
              {DAY_STATUS_ORDER.filter((status) => counts[status]).map((status) => (
                <button key={status} type="button" role="tab" aria-selected={statusFilter === status}
                  className={'att-day-tab att-' + status + (statusFilter === status ? ' active' : '')}
                  onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
                  <span className="att-dot"></span>{DAY_STATUS_LABELS[status]} <b>{counts[status]}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="modal-body att-day-body">
            {visible.length === 0 ? (
              <div className="att-day-empty"><i className="bx bx-search-alt"></i>No one matches</div>
            ) : (
              <ul className="att-day-list">
                {visible.map((person) => {
                  const data = person.event.extendedProps;
                  const name = data.userName || 'Unknown';
                  const isAttendance = data.type === 'attendance';
                  return (
                    <li key={person.event.id}>
                      <button type="button" className={'att-day-row att-' + person.status} onClick={() => onOpenPerson(person)}>
                        <span className="att-day-avatar">{initials(name)}</span>
                        <span className="att-day-name">
                          <strong>{name}</strong>
                          <span className="att-chip"><span className="att-dot"></span>{DAY_STATUS_LABELS[person.status]}</span>
                        </span>
                        {isAttendance ? (
                          <span className="att-day-times">
                            <span><small>In</small>{data.punchInTime ? moment(data.punchInTime).format('h:mm A') : '–'}</span>
                            <span><small>Out</small>{data.punchOutTime ? moment(data.punchOutTime).format('h:mm A') : (data.status === 'punched_in' ? 'Active' : '–')}</span>
                            <span><small>Hours</small>{hoursText(data) || '–'}</span>
                          </span>
                        ) : (
                          <span className="att-day-note">
                            {person.status === 'absent' ? 'No punch-in recorded' : (data.reason || (person.status === 'wfh' ? 'Working from home' : 'On leave'))}
                          </span>
                        )}
                        <i className="bx bx-chevron-right att-day-caret"></i>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
