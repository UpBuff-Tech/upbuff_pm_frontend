/**
 * My Dashboard: the personal page of an employee - today's punch status and working hours,
 * my open tasks and tickets, leave balance under the yearly holiday policy (fixed + optional + flexi), the optional holiday
 * picker, and a calendar with holidays, leave and attendance. Each user can hide the sections they
 * do not want (Customize button); the choice is saved on the server.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import api, { onDataChanged } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import MyWork from './MyWork';
import DashboardCustomize from './DashboardCustomize';
import './userDashboard.css';

const DAY_TARGET_SECONDS = 8 * 3600;

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatHm(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
}

function fmtDays(n) {
  const value = Math.round((n || 0) * 10) / 10;
  return (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1));
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const LEAVE_TYPE_LABELS = { leave: 'Flexi leave', wfh: 'Work from home', optional: 'Optional leave' };

export default function UserDashboard() {
  const { user, userId } = useAuth();

  const [summary, setSummary] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [today, setToday] = useState(null); // { status, record }
  const [taskHours, setTaskHours] = useState(null); // { totalSeconds, isRunning, anchorMs }
  const [leaves, setLeaves] = useState(null); // approved + pending requests of the year
  const [, setTick] = useState(0);

  // Dashboard sections the user has hidden (null until loaded from the server)
  const [hiddenSections, setHiddenSections] = useState(null);

  // Optional holiday picker
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);

  const calendarRef = useRef(null);
  const calendarApi = useRef(null);
  const year = new Date().getFullYear();

  const loadSummary = () => {
    api.call('userDashboard.getSummary', (err, data) => {
      if (err) {
        toastr.error(err.reason || 'Failed to load your dashboard');
        return;
      }
      setSummary(data);
    });
  };

  const loadCalendar = () => {
    api.call('holidays.getCalendar', year, (err, data) => {
      if (!err && data) {
        setCalendar(data);
        setPicked(data.mySelection || []);
      }
    });
  };

  useEffect(() => {
    if (!userId) return undefined;
    api.call('user.getDashboardPrefs', (err, prefs) => {
      setHiddenSections(!err && prefs && Array.isArray(prefs.hidden) ? prefs.hidden : []);
    });
    loadSummary();
    loadCalendar();

    // Today's attendance + task hours. Reloaded after every data-changing call too: a punch-out
    // (the fingerprint button) stops the running timers on the server, so the hours must stop
    // counting and the attendance card must show the new state without a page reload.
    const loadToday = () => {
      api.call('attendance.getTodayStatus', (err, data) => {
        setToday(!err && data ? data : { status: null, record: null });
      });
      api.call('projectTasks.getMyTodayHours', null, null, (err, data) => {
        if (!err && data) setTaskHours({ totalSeconds: data.totalSeconds || 0, isRunning: !!data.isRunning, anchorMs: Date.now() });
        else setTaskHours({ totalSeconds: 0, isRunning: false, anchorMs: Date.now() });
      });
    };
    loadToday();
    const stopListening = onDataChanged(loadToday);

    // This year's approved and pending leave for the calendar
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    let approved = null;
    let pending = null;
    const done = () => {
      if (approved && pending) setLeaves([...approved, ...pending]);
    };
    api.call('leaveRequests.getForCalendar', userId, yearStart, yearEnd, (err, list) => {
      approved = (!err && list) ? list : [];
      done();
    });
    api.call('leaveRequests.getMyRequests', { status: 'pending', page: 1, perPage: 100 }, (err, result) => {
      pending = (!err && result && result.data) ? result.data : [];
      done();
    });

    // Live clocks
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(timer);
      stopListening();
    };
  }, [userId]);

  /* ---- Derived ---- */
  const record = today && today.record;
  const punchedIn = record && record.status === 'punched_in';
  const punchedOut = record && record.status === 'punched_out';
  const sinceIn = punchedIn && record.punchInTime ? (Date.now() - new Date(record.punchInTime).getTime()) / 1000 : 0;

  let taskSeconds = taskHours ? taskHours.totalSeconds : 0;
  if (taskHours && taskHours.isRunning) taskSeconds += Math.floor((Date.now() - taskHours.anchorMs) / 1000);
  const taskPercent = Math.min(100, Math.round((taskSeconds / DAY_TARGET_SECONDS) * 100));

  const balance = summary ? summary.balance : null;
  const flexiPercent = balance && balance.flexiTotal ? Math.round((balance.flexiRemaining / balance.flexiTotal) * 100) : 0;
  const upcoming = summary ? summary.upcomingHolidays : [];
  const nextHoliday = upcoming && upcoming[0];
  const daysToNext = nextHoliday ? moment(nextHoliday.date).startOf('day').diff(moment().startOf('day'), 'days') : null;
  const month = summary ? summary.month : null;

  /* ---- Show / hide sections ---- */
  const show = (key) => hiddenSections !== null && !hiddenSections.includes(key);
  const showSide = show('upcomingHolidays') || show('leaveRequests');

  // Saved right away; the screen changes first and goes back if the save fails
  const saveHiddenSections = (nextHidden) => {
    const previous = hiddenSections;
    setHiddenSections(nextHidden);
    api.call('user.saveDashboardPrefs', nextHidden, (err) => {
      if (err) {
        toastr.error(err.reason || 'Failed to save your dashboard choices');
        setHiddenSections(previous);
      }
    });
  };

  /* ---- Optional holiday picker ---- */
  const todayKey = moment().format('YYYY-MM-DD');
  const allowed = calendar ? calendar.optionalAllowed : 0;
  const savedSelection = (calendar && calendar.mySelection) || [];
  const dirty = picked.length !== savedSelection.length || picked.some((d) => !savedSelection.includes(d));

  const togglePick = (date) => {
    if (date < todayKey) return; // passed dates are locked
    setPicked((current) => {
      if (current.includes(date)) return current.filter((d) => d !== date);
      if (current.length >= allowed) {
        toastr.warning(`You can choose up to ${allowed} optional holidays`);
        return current;
      }
      return [...current, date];
    });
  };

  const savePicks = () => {
    setSaving(true);
    api.call('holidays.saveMyOptional', year, picked, (err, result) => {
      setSaving(false);
      if (err) {
        toastr.error(err.reason || 'Failed to save your optional holidays');
        return;
      }
      toastr.success('Your optional holidays are saved');
      setCalendar((current) => ({ ...current, mySelection: result.mySelection }));
      setPicked(result.mySelection);
      loadSummary(); // flexi days and upcoming holidays depend on the picks
    });
  };

  /* ---- Calendar ---- */
  useEffect(() => {
    // calendarRef is empty while the calendar section is hidden
    if (!calendar || !leaves || !calendarRef.current) return undefined;

    const holidayEvents = [
      ...calendar.fixed.map((h) => ({
        title: h.name, start: h.date, allDay: true, classNames: ['ud-ev', 'ud-ev-fixed'],
        extendedProps: { tip: 'Holiday · office closed' },
      })),
      ...calendar.optional.map((h) => {
        const chosen = (calendar.mySelection || []).includes(h.date);
        return {
          title: h.name, start: h.date, allDay: true,
          classNames: ['ud-ev', chosen ? 'ud-ev-optional-chosen' : 'ud-ev-optional'],
          extendedProps: { tip: chosen ? 'Your optional holiday' : 'Optional holiday (not chosen)' },
        };
      }),
    ];
    const leaveEvents = leaves.map((l) => ({
      title: l.status === 'pending' ? (LEAVE_TYPE_LABELS[l.type] || 'Leave') + ' (pending)' : (LEAVE_TYPE_LABELS[l.type] || 'Leave'),
      start: moment(l.fromDate).format('YYYY-MM-DD'),
      end: moment(l.toDate).add(1, 'day').format('YYYY-MM-DD'),
      allDay: true,
      classNames: ['ud-ev', l.status === 'pending' ? 'ud-ev-pending' : (l.type === 'wfh' ? 'ud-ev-wfh' : 'ud-ev-leave')],
      extendedProps: { tip: l.reason || '' },
    }));
    const fixedDays = new Set(calendar.fixed.map((h) => h.date));
    const chosenDays = new Set(calendar.mySelection || []);

    const instance = new Calendar(calendarRef.current, {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: { left: 'title', center: '', right: 'today prev,next' },
      buttonText: { today: 'Today' },
      height: 'auto',
      dayMaxEvents: 3,
      eventSources: [
        { id: 'holidays', events: holidayEvents },
        { id: 'leaves', events: leaveEvents },
        {
          id: 'attendance',
          // Punch-ins of the visible month
          events: (info, success) => {
            api.call('attendance.getMyAttendance', { startDate: info.start, endDate: info.end, page: 1, perPage: 62 }, (err, list) => {
              const rows = (!err && Array.isArray(list)) ? list : [];
              success(rows.map((r) => ({
                title: r.punchInTime
                  ? moment(r.punchInTime).format('h:mma') + ' – ' + (r.punchOutTime ? moment(r.punchOutTime).format('h:mma') : 'now')
                  : 'Present',
                start: moment(r.date).format('YYYY-MM-DD'),
                allDay: true,
                classNames: ['ud-ev', r.status === 'punched_in' ? 'ud-ev-working' : 'ud-ev-present'],
                extendedProps: { tip: r.totalHours ? 'Worked ' + formatHm(r.totalHours) : 'Working now' },
              })));
            });
          },
        },
      ],
      eventOrder: 'title',
      dayCellClassNames: (arg) => {
        const key = moment(arg.date).format('YYYY-MM-DD');
        const classes = [];
        const dow = arg.date.getDay();
        if (dow === 0 || dow === 6) classes.push('ud-weekend');
        if (fixedDays.has(key)) classes.push('ud-holiday');
        else if (chosenDays.has(key)) classes.push('ud-holiday-optional');
        return classes;
      },
      eventDidMount: (info) => {
        if (info.event.extendedProps.tip) info.el.title = info.event.title + ' — ' + info.event.extendedProps.tip;
      },
    });
    instance.render();
    calendarApi.current = instance;
    return () => {
      instance.destroy();
      calendarApi.current = null;
    };
  }, [calendar, leaves, show('calendar')]);

  const firstName = (user && user.profile && user.profile.firstName) || '';
  const loading = !summary;

  return (
    <div className="container-xxl flex-grow-1 container-p-y ud-page">
      {/* Header */}
      <div className="ud-header">
        <div>
          <h4 className="fw-bold mb-1">{greeting()}{firstName ? ', ' + firstName : ''} 👋</h4>
          <p className="text-muted mb-0">{moment().format('dddd, D MMMM YYYY')} · here&apos;s your day and your time off</p>
        </div>
        <div className="ud-header-actions">
          {hiddenSections !== null && <DashboardCustomize hidden={hiddenSections} onChange={saveHiddenSections} />}
          <Link to="/attendance/list" className="btn btn-outline-secondary"><i className="bx bx-calendar-check me-1"></i>My attendance</Link>
          <Link to="/leaveRequest/list" className="btn btn-primary"><i className="bx bx-plus me-1"></i>Apply leave</Link>
        </div>
      </div>

      {/* Today tiles */}
      {show('tiles') && (
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <div className={'card h-100 ud-tile ' + (punchedIn ? 'tone-green' : punchedOut ? 'tone-indigo' : 'tone-amber')}>
              <div className="ud-tile-head">
                <span className="ud-tile-icon"><i className={'bx ' + (punchedIn ? 'bx-log-in-circle' : punchedOut ? 'bx-log-out-circle' : 'bx-fingerprint')}></i></span>
                <span className="ud-tile-label">Today&apos;s attendance</span>
                {punchedIn && <span className="ud-live"><i></i>Live</span>}
              </div>
              {today === null ? (
                <span className="fx-skeleton ud-sk-value"></span>
              ) : punchedIn ? (
                <>
                  <div className="ud-tile-value">{formatClock(sinceIn)}</div>
                  <div className="ud-tile-note">Punched in at <strong>{moment(record.punchInTime).format('h:mm A')}</strong></div>
                </>
              ) : punchedOut ? (
                <>
                  <div className="ud-tile-value">{formatHm(record.totalHours)}</div>
                  <div className="ud-tile-note">{moment(record.punchInTime).format('h:mm A')} – {moment(record.punchOutTime).format('h:mm A')}</div>
                </>
              ) : (
                <>
                  <div className="ud-tile-value ud-tile-value-sm">Not punched in</div>
                  <div className="ud-tile-note">Use the fingerprint button to punch in</div>
                </>
              )}
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="card h-100 ud-tile tone-indigo">
              <div className="ud-tile-head">
                <span className="ud-tile-icon"><i className="bx bx-time-five"></i></span>
                <span className="ud-tile-label">Task hours today</span>
                {taskHours && taskHours.isRunning && <span className="ud-live"><i></i>Timer on</span>}
              </div>
              {taskHours === null ? <span className="fx-skeleton ud-sk-value"></span> : (
                <>
                  <div className="ud-tile-value">{formatClock(taskSeconds)}</div>
                  <div className="ud-meter"><span style={{ width: taskPercent + '%' }}></span></div>
                  <div className="ud-tile-note">{taskPercent}% of an 8h day · <Link to="/task/list">Open tasks</Link></div>
                </>
              )}
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="card h-100 ud-tile tone-cyan">
              <div className="ud-tile-head">
                <span className="ud-tile-icon"><i className="bx bx-sun"></i></span>
                <span className="ud-tile-label">Flexi days left</span>
              </div>
              {loading ? <span className="fx-skeleton ud-sk-value"></span> : (
                <div className="ud-ring-row">
                  <span className="ud-ring" style={{ '--pct': flexiPercent }}><span>{fmtDays(balance.flexiRemaining)}</span></span>
                  <div>
                    <div className="ud-tile-value ud-tile-value-sm">{fmtDays(balance.flexiRemaining)} of {balance.flexiTotal}</div>
                    <div className="ud-tile-note">
                      {fmtDays(balance.flexiUsed)} used{balance.flexiPending ? ' · ' + fmtDays(balance.flexiPending) + ' pending' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="card h-100 ud-tile tone-rose">
              <div className="ud-tile-head">
                <span className="ud-tile-icon"><i className="bx bx-calendar-star"></i></span>
                <span className="ud-tile-label">Next holiday</span>
              </div>
              {loading ? <span className="fx-skeleton ud-sk-value"></span> : nextHoliday ? (
                <>
                  <div className="ud-tile-value ud-tile-value-sm">{nextHoliday.name}</div>
                  <div className="ud-tile-note">
                    {moment(nextHoliday.date).format('ddd, D MMM')} ·{' '}
                    <strong>{daysToNext === 0 ? 'today 🎉' : daysToNext === 1 ? 'tomorrow' : `in ${daysToNext} days`}</strong>
                    {nextHoliday.kind === 'optional' && <span className="ud-tag">Optional</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="ud-tile-value ud-tile-value-sm">No more this year</div>
                  <div className="ud-tile-note">Plan with your flexi days</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My work today: open tasks + tickets assigned to me */}
      {show('myWork') && <MyWork />}

      {/* Balance + optional picker */}
      {(show('timeOff') || show('optionalHolidays')) && (
        <div className="row g-3 mb-3">
          {show('timeOff') && (
            <div className={show('optionalHolidays') ? 'col-xl-5' : 'col-12'}>
              <div className="card h-100 ud-card">
                <div className="ud-card-head">
                  <div>
                    <h5>Time off {year}</h5>
                    <p>{balance ? balance.totalPaidDaysOff : 22} paid days off: fixed + optional + flexi</p>
                  </div>
                </div>
                {loading ? (
                  <div className="ud-card-body">{[0, 1, 2].map((i) => <span key={i} className="fx-skeleton ud-sk-row"></span>)}</div>
                ) : (
                  <div className="ud-card-body ud-balance">
                    <BalanceRow tone="rose" icon="bx-buildings" title="Fixed holidays" detail="Office closed · no action needed"
                      segments={[{ value: balance.fixedPassed, label: 'passed' }]} total={balance.fixedTotal}
                      right={`${balance.fixedTotal - balance.fixedPassed} to go`} />
                    <BalanceRow tone="violet" icon="bx-star" title="Optional holidays" detail={`Pick any ${balance.optionalAllowed} from the list`}
                      segments={[{ value: balance.optionalPassed, label: 'taken' }, { value: balance.optionalSelected - balance.optionalPassed, label: 'planned', soft: true }]}
                      total={balance.optionalAllowed}
                      right={`${balance.optionalSelected} of ${balance.optionalAllowed} chosen`} />
                    <BalanceRow tone="cyan" icon="bx-sun" title="Flexi-holidays" detail="Sick + paid leave, any reason"
                      segments={[{ value: balance.flexiUsed, label: 'used' }, { value: balance.flexiPending, label: 'pending', soft: true }]}
                      total={balance.flexiTotal}
                      right={`${fmtDays(balance.flexiRemaining)} left`} />

                    <div className="ud-month">
                      <div className="ud-month-title">This month</div>
                      <div className="ud-month-stats">
                        <span><strong>{month.presentDays}<em>/{month.workingDays}</em></strong><small>days present</small></span>
                        <span><strong>{month.lateCount}</strong><small>late arrivals</small></span>
                        <span><strong>{month.avgSeconds ? formatHm(month.avgSeconds) : '–'}</strong><small>avg per day</small></span>
                        <span><strong>{fmtDays(balance.wfhDays)}</strong><small>WFH days this year</small></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {show('optionalHolidays') && (
            <div className={show('timeOff') ? 'col-xl-7' : 'col-12'}>
              <div className="card h-100 ud-card">
                <div className="ud-card-head">
                  <div>
                    <h5>Choose your optional holidays</h5>
                    <p>Pick any {allowed || 4} of the {calendar ? calendar.optional.length : 7} dates · passed dates are locked</p>
                  </div>
                  <span className={'ud-pick-count' + (picked.length === allowed ? ' is-full' : '')}>{picked.length}/{allowed || 4} chosen</span>
                </div>
                <div className="ud-card-body">
                  {!calendar ? (
                    [0, 1, 2].map((i) => <span key={i} className="fx-skeleton ud-sk-row"></span>)
                  ) : !calendar.defined ? (
                    <div className="ud-empty">No holiday calendar has been set up for {year} yet.</div>
                  ) : (
                    <>
                      <div className="ud-picks">
                        {calendar.optional.map((h) => {
                          const isPicked = picked.includes(h.date);
                          const passed = h.date < todayKey;
                          const blocked = !isPicked && picked.length >= allowed;
                          return (
                            <button key={h.date} type="button" disabled={passed}
                              className={'ud-pick' + (isPicked ? ' is-picked' : '') + (passed ? ' is-passed' : '') + (blocked ? ' is-blocked' : '')}
                              onClick={() => togglePick(h.date)} aria-pressed={isPicked}>
                              <span className="ud-pick-date">
                                <strong>{moment(h.date).format('DD')}</strong>
                                <small>{moment(h.date).format('MMM')}</small>
                              </span>
                              <span className="ud-pick-text">
                                <strong>{h.name}</strong>
                                <small>{h.day}{passed ? ' · passed' : ''}</small>
                              </span>
                              <span className="ud-pick-check"><i className={'bx ' + (isPicked ? 'bx-check' : passed ? 'bx-lock-alt' : 'bx-plus')}></i></span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="ud-pick-actions">
                        <span className="text-muted small">
                          {dirty ? 'You have unsaved changes' : savedSelection.length ? 'Saved ✓' : 'Nothing chosen yet'}
                        </span>
                        <div className="d-flex gap-2">
                          {dirty && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPicked(savedSelection)} disabled={saving}>Reset</button>}
                          <button type="button" className="btn btn-sm btn-primary" onClick={savePicks} disabled={!dirty || saving}>
                            {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</> : <><i className="bx bx-save me-1"></i>Save choices</>}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar + side lists */}
      {(show('calendar') || showSide) && (
        <div className="row g-3">
          {show('calendar') && (
            <div className={showSide ? 'col-xl-8' : 'col-12'}>
              <div className="card ud-card">
                <div className="ud-card-head">
                  <div>
                    <h5>My calendar</h5>
                    <p>Holidays, leave and attendance in one place</p>
                  </div>
                </div>
                <div className="ud-legend">
                  <span className="ud-chip ud-c-fixed"><i></i>Holiday</span>
                  <span className="ud-chip ud-c-optional-chosen"><i></i>My optional</span>
                  <span className="ud-chip ud-c-optional"><i></i>Optional (not chosen)</span>
                  <span className="ud-chip ud-c-leave"><i></i>Leave</span>
                  <span className="ud-chip ud-c-wfh"><i></i>WFH</span>
                  <span className="ud-chip ud-c-pending"><i></i>Pending</span>
                  <span className="ud-chip ud-c-present"><i></i>Attendance</span>
                </div>
                <div className="ud-card-body">
                  {(!calendar || !leaves) && <span className="fx-skeleton ud-sk-calendar"></span>}
                  <div ref={calendarRef} className="ud-calendar"></div>
                </div>
              </div>
            </div>
          )}

          {showSide && (
            <div className={(show('calendar') ? 'col-xl-4' : 'col-12') + ' d-flex flex-column gap-3'}>
              {show('upcomingHolidays') && (
                <div className="card ud-card">
                  <div className="ud-card-head">
                    <div>
                      <h5>Upcoming holidays</h5>
                      <p>Fixed holidays and your optional picks</p>
                    </div>
                  </div>
                  <div className="ud-card-body pt-0">
                    {loading ? [0, 1, 2].map((i) => <span key={i} className="fx-skeleton ud-sk-row"></span>) : upcoming.length === 0 ? (
                      <div className="ud-empty">No more holidays this year.</div>
                    ) : (
                      <ul className="ud-list">
                        {upcoming.slice(0, 6).map((h) => {
                          const inDays = moment(h.date).startOf('day').diff(moment().startOf('day'), 'days');
                          return (
                            <li key={h.date} className="ud-holiday-item">
                              <span className={'ud-date-badge ' + (h.kind === 'optional' ? 'is-optional' : '')}>
                                <strong>{moment(h.date).format('DD')}</strong><small>{moment(h.date).format('MMM')}</small>
                              </span>
                              <span className="ud-holiday-text">
                                <strong>{h.name}</strong>
                                <small>{moment(h.date).format('dddd')}{h.kind === 'optional' ? ' · optional' : ''}</small>
                              </span>
                              <span className="ud-in">{inDays === 0 ? 'Today' : inDays === 1 ? 'Tomorrow' : inDays + 'd'}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {show('leaveRequests') && (
                <div className="card ud-card">
                  <div className="ud-card-head">
                    <div>
                      <h5>My leave requests</h5>
                      <p>Latest 5</p>
                    </div>
                    <Link to="/leaveRequest/list" className="ud-link">View all</Link>
                  </div>
                  <div className="ud-card-body pt-0">
                    {loading ? [0, 1].map((i) => <span key={i} className="fx-skeleton ud-sk-row"></span>) : summary.recentRequests.length === 0 ? (
                      <div className="ud-empty">No leave requests yet.</div>
                    ) : (
                      <ul className="ud-list">
                        {summary.recentRequests.map((r) => (
                          <li key={r._id} className="ud-request">
                            <span className={'ud-request-icon t-' + r.type}><i className={'bx ' + (r.type === 'wfh' ? 'bx-home-alt' : r.type === 'optional' ? 'bx-star' : 'bx-sun')}></i></span>
                            <span className="ud-request-text">
                              <strong>{LEAVE_TYPE_LABELS[r.type] || r.type}{r.dayType === 'half' ? ' · half day' : ''}</strong>
                              <small>
                                {moment(r.fromDate).format('D MMM')}
                                {moment(r.toDate).isSame(r.fromDate, 'day') ? '' : ' – ' + moment(r.toDate).format('D MMM')}
                                {r.totalDays ? ' · ' + fmtDays(r.totalDays) + 'd' : ''}
                              </small>
                            </span>
                            <span className={'ud-status s-' + r.status}>{r.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One row of the time-off card: title, a segmented bar out of `total`, and a note on the right. */
function BalanceRow({ tone, icon, title, detail, segments, total, right }) {
  return (
    <div className={'ud-balance-row tone-' + tone}>
      <span className="ud-balance-icon"><i className={'bx ' + icon}></i></span>
      <div className="ud-balance-main">
        <div className="ud-balance-top">
          <span><strong>{title}</strong><small>{detail}</small></span>
          <span className="ud-balance-right">{right}</span>
        </div>
        <div className="ud-segments" title={segments.map((s) => fmtDays(s.value) + ' ' + s.label).join(', ')}>
          {segments.map((s) => (s.value > 0 ? (
            <span key={s.label} className={s.soft ? 'is-soft' : ''} style={{ width: Math.min(100, (s.value / (total || 1)) * 100) + '%' }}></span>
          ) : null))}
        </div>
        <div className="ud-balance-legend">
          {segments.map((s) => <span key={s.label}><i className={s.soft ? 'is-soft' : ''}></i>{fmtDays(s.value)} {s.label}</span>)}
          <span className="ms-auto">of {total}</span>
        </div>
      </div>
    </div>
  );
}
