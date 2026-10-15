/**
 * Leave Register
 * Who is available, working from home, on a half day, leaving early, not checked in, signed off
 * or on leave on a day, so everyone can tell at a glance whether to reach out to someone.
 * "Available" follows attendance: checked in and not yet signed off (worked out on the server).
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import api, { onDataChanged } from '../../api/client';
import './leaveRegister.css';

const DAY_FORMAT = 'YYYY-MM-DD';

/** How often the open page re-checks, so other people's check-ins show up without a refresh. */
const REFRESH_MS = 60 * 1000;

/** Display order and texts of each status. `reach` answers "should I reach out?". */
const STATUSES = [
  { key: 'available', label: 'Available', icon: 'bx-check-circle', tone: 'green', reach: 'Reachable' },
  { key: 'wfh', label: 'Working from home', short: 'WFH', icon: 'bx-home-heart', tone: 'blue', reach: 'Reachable online' },
  { key: 'early', label: 'Leaving early', icon: 'bx-run', tone: 'amber', reach: 'Reachable until they leave' },
  { key: 'half', label: 'Half day', icon: 'bx-adjust', tone: 'violet', reach: 'Limited availability' },
  { key: 'notIn', label: 'Not checked in', icon: 'bx-time-five', tone: 'slate', reach: 'Not in yet — try later' },
  { key: 'signedOff', label: 'Signed off', icon: 'bx-log-out-circle', tone: 'gray', reach: 'Done for the day' },
  { key: 'leave', label: 'On leave', icon: 'bx-trip', tone: 'rose', reach: 'Away — avoid contacting' },
];
const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((status) => [status.key, status]));

/** Groups shown on the page: people who are away first, so they stand out. */
const GROUP_ORDER = ['leave', 'half', 'signedOff', 'notIn', 'early', 'wfh', 'available'];

function initialsOf(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function formatTime(time) {
  return time ? moment(time, 'HH:mm').format('h:mm A') : '';
}

function formatDay(day) {
  const value = moment(day);
  if (value.isSame(moment(), 'day')) return 'today';
  if (value.isSame(moment().add(1, 'day'), 'day')) return 'tomorrow';
  return value.format('ddd, D MMM');
}

function dateRange(from, to) {
  const start = moment(from);
  const end = moment(to);
  if (start.isSame(end, 'day')) return start.format('ddd, D MMM');
  return start.format('D MMM') + ' – ' + end.format('D MMM');
}

/** One line under the person's name explaining their status. */
function isTodayKey(person) {
  return person.day === moment().format(DAY_FORMAT);
}

function statusDetail(person) {
  switch (person.status) {
    case 'leave':
      if (person.leaveType === 'optionalHoliday') return `Optional holiday · back ${formatDay(person.backOn)}`;
      return `${person.leaveType === 'optional' ? 'Optional leave' : 'Leave'} · back ${formatDay(person.backOn)}`;
    case 'half':
      return 'Half day leave · in for part of the day';
    case 'wfh':
      return moment(person.fromDate).isSame(person.toDate, 'day')
        ? 'Working remotely'
        : `Remote until ${formatDay(person.toDate)}`;
    case 'early':
      return `Leaving at ${formatTime(person.leavingTime)}` + (person.earlyPending ? ' (awaiting approval)' : '');
    case 'notIn':
    case 'signedOff': {
      // What they planned for the day, when they had a WFH or early-leave request
      const plan = person.plannedStatus === 'wfh' ? 'Working from home'
        : person.plannedStatus === 'early' ? `Leaving at ${formatTime(person.leavingTime)}` : '';
      if (person.status === 'signedOff') return plan || null;
      const missing = isTodayKey(person) ? 'no check-in yet' : 'no attendance recorded';
      return plan ? `${plan} · ${missing}` : missing.charAt(0).toUpperCase() + missing.slice(1);
    }
    default:
      return null;
  }
}

/** Punch in / out for the day, or null when there is nothing worth showing. */
function presence(person, isToday) {
  if (person.punchInTime && person.punchOutTime) {
    const inAt = moment(person.punchInTime).format('h:mm A');
    const outAt = moment(person.punchOutTime).format('h:mm A');
    return { tone: 'muted', text: isToday ? `Signed off at ${outAt}` : `${inAt} – ${outAt}` };
  }
  if (person.punchInTime) {
    const inAt = moment(person.punchInTime).format('h:mm A');
    // A checked-in day in the past without a punch-out: they forgot to punch out
    if (person.status === 'signedOff') return { tone: 'muted', text: `In at ${inAt} · no punch-out` };
    return { tone: isToday ? 'live' : 'muted', text: `In since ${inAt}` };
  }
  return null;
}

function Avatar({ person, size = 'md' }) {
  return (
    <span className={'lr-avatar lr-avatar-' + size}>
      {person.photo ? <img src={person.photo} alt="" /> : <span>{initialsOf(person.name)}</span>}
    </span>
  );
}

function PersonCard({ person, isToday }) {
  const status = STATUS_BY_KEY[person.status] || STATUS_BY_KEY.available;
  const seen = presence(person, isToday);
  const info = [statusDetail(person), seen && seen.text].filter(Boolean).join(' · ') || status.reach;
  return (
    <div className={'lr-card tone-' + status.tone} title={status.label + ': ' + status.reach}>
      <div className="lr-card-head">
        <span className="lr-card-avatar">
          <Avatar person={person} size="lg" />
          <span className="lr-card-badge"><i className={'bx ' + status.icon}></i></span>
        </span>
        <div className="lr-card-id">
          <div className="lr-card-name">{person.name}</div>
          <div className="lr-card-role">{person.role}</div>
        </div>
        {person.email && person.status !== 'leave' && (
          <a className="lr-card-mail" href={'mailto:' + person.email} title={'Email ' + person.email}
            aria-label={'Email ' + person.name}>
            <i className="bx bx-envelope"></i>
          </a>
        )}
      </div>
      <div className="lr-card-status">
        <span className={'lr-card-dot' + (seen && seen.tone === 'live' ? ' is-live' : '')}></span>
        <div className="lr-card-status-text">
          <strong>{status.label}</strong>
          <small>{info}</small>
        </div>
      </div>
    </div>
  );
}

export default function LeaveRegister() {
  const [day, setDay] = useState(moment().format(DAY_FORMAT));
  const [register, setRegister] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Load the day, then keep it fresh: after any change made in this browser (e.g. punching in),
  // every minute while the tab is visible, and when the tab comes back into view.
  useEffect(() => {
    let current = true;
    let latestCall = 0;

    // A background refresh keeps the current list on screen and stays quiet about errors.
    const load = (background) => {
      const callNumber = ++latestCall;
      if (!background) {
        setLoading(true);
        setError('');
      }
      api.call('leaveRequests.getRegister', day, (err, result) => {
        if (!current || callNumber !== latestCall) return;
        setLoading(false);
        if (err) {
          if (!background) setError(err.reason || err.message || 'Could not load the leave register');
          return;
        }
        setError('');
        setRegister(result);
      });
    };
    const refresh = () => {
      if (document.visibilityState === 'visible') load(true);
    };

    load(false);
    const stopListening = onDataChanged(refresh);
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      current = false;
      stopListening();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [day]);

  const people = ((register && register.people) || []).map((person) => ({ ...person, day: register.date }));
  const upcoming = (register && register.upcoming) || [];
  const counts = Object.fromEntries(STATUSES.map((status) => [status.key, 0]));
  people.forEach((person) => {
    counts[person.status] = (counts[person.status] || 0) + 1;
  });
  const away = counts.leave + counts.half;
  const reachable = counts.available + counts.wfh + counts.early;

  const needle = search.trim().toLowerCase();
  const shown = people.filter((person) => (filter === 'all' || person.status === filter)
    && (!needle || person.name.toLowerCase().includes(needle) || (person.role || '').toLowerCase().includes(needle)));
  const groups = GROUP_ORDER
    .map((key) => ({ status: STATUS_BY_KEY[key], people: shown.filter((person) => person.status === key) }))
    .filter((group) => group.people.length > 0);

  const selected = moment(day, DAY_FORMAT);
  const isToday = selected.isSame(moment(), 'day');
  const moveDay = (offset) => setDay(selected.clone().add(offset, 'day').format(DAY_FORMAT));

  return (
    <div className="container-xxl flex-grow-1 container-p-y lr-page">
      {/* Header */}
      <div className="lr-header">
        <div>
          <h4 className="fw-bold mb-1">Who's In</h4>
          <p className="text-muted mb-0">See who's in, who's remote and who's away before you reach out</p>
        </div>
        <div className="lr-daynav">
          <button type="button" className="lr-daynav-btn" onClick={() => moveDay(-1)} aria-label="Previous day">
            <i className="bx bx-chevron-left"></i>
          </button>
          <label className="lr-daynav-date">
            <i className="bx bx-calendar"></i>
            <span>
              <strong>{isToday ? 'Today' : selected.format('dddd')}</strong>
              <small>{selected.format('D MMMM YYYY')}</small>
            </span>
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
              aria-label="Pick a date" />
          </label>
          <button type="button" className="lr-daynav-btn" onClick={() => moveDay(1)} aria-label="Next day">
            <i className="bx bx-chevron-right"></i>
          </button>
          {!isToday && (
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setDay(moment().format(DAY_FORMAT))}>
              Today
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {register && register.holiday && (
        <div className="lr-banner tone-rose">
          <i className="bx bx-calendar-star"></i>
          <div><strong>Office holiday — {register.holiday.name}</strong><span>The office is closed; most people won't be reachable.</span></div>
        </div>
      )}
      {register && !register.holiday && register.isWeekend && (
        <div className="lr-banner tone-slate">
          <i className="bx bx-coffee"></i>
          <div><strong>It's the weekend</strong><span>Only reach out if it's urgent.</span></div>
        </div>
      )}

      {/* Summary: each tile also filters the list */}
      <div className="lr-summary">
        <button type="button" className={'lr-tile tone-indigo' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>
          <span className="lr-tile-icon"><i className="bx bx-group"></i></span>
          <span className="lr-tile-text"><strong>{people.length}</strong><small>Everyone</small></span>
        </button>
        {STATUSES.map((status) => (
          <button type="button" key={status.key}
            className={'lr-tile tone-' + status.tone + (filter === status.key ? ' active' : '')}
            onClick={() => setFilter(filter === status.key ? 'all' : status.key)}>
            <span className="lr-tile-icon"><i className={'bx ' + status.icon}></i></span>
            <span className="lr-tile-text"><strong>{counts[status.key]}</strong><small>{status.label}</small></span>
          </button>
        ))}
      </div>

      <div className="lr-layout">
        <div className="lr-main">
          <div className="lr-toolbar">
            <div className="lr-search">
              <i className="bx bx-search"></i>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role" aria-label="Search people" />
            </div>
            {people.length > 0 && (
              <span className="lr-headline">
                {reachable === people.length
                  ? 'Everyone is in ' + (isToday ? 'today' : 'on this day')
                  : `${reachable} of ${people.length} reachable` + (away ? ` · ${away} on leave` : '')}
              </span>
            )}
          </div>

          {loading && !register && (
            <div className="lr-loading"><div className="spinner-border text-primary" role="status"></div></div>
          )}

          <div className={'lr-groups' + (loading ? ' is-loading' : '')}>
            {groups.map((group) => (
              <section key={group.status.key} className={'lr-group tone-' + group.status.tone}>
                <h6 className="lr-group-title">
                  <i className={'bx ' + group.status.icon}></i>
                  {group.status.label}
                  <span className="lr-group-count">{group.people.length}</span>
                </h6>
                <div className="lr-grid">
                  {group.people.map((person) => <PersonCard key={person.userId} person={person} isToday={isToday} />)}
                </div>
              </section>
            ))}
            {register && groups.length === 0 && (
              <div className="lr-empty">
                <i className="bx bx-user-x"></i>
                {needle ? `No one matches “${search.trim()}”` : 'No one in this group'}
              </div>
            )}
          </div>
        </div>

        {/* Coming up */}
        <aside className="lr-side">
          <div className="lr-side-card">
            <h6 className="lr-side-title"><i className="bx bx-calendar-event"></i>Coming up</h6>
            <p className="lr-side-sub">Time off in the next two weeks</p>
            {upcoming.length === 0 ? (
              <div className="lr-side-empty">No planned time off</div>
            ) : (
              <ul className="lr-upcoming">
                {upcoming.map((item, index) => (
                  <li key={item.userId + index}>
                    <Avatar person={item} size="sm" />
                    <div className="lr-upcoming-text">
                      <strong>{item.name}</strong>
                      <small>
                        {dateRange(item.fromDate, item.toDate)}
                        {item.dayType === 'half' ? ' · half day' : ''}
                        {item.leaveType === 'optional' ? ' · optional' : ''}
                      </small>
                    </div>
                    <span className="lr-upcoming-when">{formatDay(item.fromDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lr-side-card lr-legend">
            <h6 className="lr-side-title"><i className="bx bx-info-circle"></i>Can I reach out?</h6>
            {STATUSES.map((status) => (
              <div key={status.key} className={'lr-legend-row tone-' + status.tone}>
                <span className="lr-legend-dot"></span>
                <span><strong>{status.label}</strong> — {status.reach.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
