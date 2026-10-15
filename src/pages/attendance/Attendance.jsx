/**
 * Attendance Page
 * Displays attendance records in calendar view with statistics
 * @author Claude
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

// Import FullCalendar
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

import moment from 'moment';
import { CHART_COLORS, renderChart, donutChartOptions } from '../adminDashboard/charts';
import { ChartCard } from '../adminDashboard/widgets';
import './attendance.css';
import {
  ARRIVAL_BUCKETS,
  EMPTY_STATS,
  buildDaySummaries,
  buildInsights,
  DAY_STATUS_LABELS,
  DAY_STATUS_ORDER,
  calculateStats,
  buildCalendarEvents,
  getEventTooltip,
  reverseListViewDays,
  describeAttendance,
  describeLeave,
  describeAbsent,
  buildHolidayEvents,
} from './attendanceHelpers';
import AttendanceDetailModal from './AttendanceDetailModal';
import LeaveDetailModal from './LeaveDetailModal';
import AttendanceDayModal from './AttendanceDayModal';

// Breadcrumb: confirms the attendance module actually loaded/evaluated on the client.
console.log('[attendance] module loaded');

export default function Attendance() {
  const { userCan } = useAuth();
  const canViewAllAttendance = userCan('attendance_viewAll');

  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [stats, setStats] = useState({ ...EMPTY_STATS });
  const [activeView, setActiveView] = useState('dayGridMonth');
  const [calendarVersion, setCalendarVersion] = useState(0); // goes up each time the calendar must be drawn again
  const [attendanceDetail, setAttendanceDetail] = useState(null);
  const [leaveDetail, setLeaveDetail] = useState(null);
  const [insights, setInsights] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);

  // The loaded records and the calendar are not rendered by React, so they live in refs.
  const attendanceRecords = useRef([]);
  const leaveRecords = useRef([]);
  const absentDays = useRef([]);
  const calendarInstance = useRef(null);
  // The view to draw after a reload (the calendar is rebuilt when an employee filter changes)
  const activeViewRef = useRef('dayGridMonth');
  // The employee the calendar is filtered to ('' = everyone)
  const selectedUserRef = useRef('');
  // holidays.getCalendar answers per "year|user" (the calendar asks again for every month shown)
  const holidayCache = useRef({});

  /**
   * Holiday events of the calendar's visible range: fixed holidays (office closed) and the
   * optional holidays. When one person's calendar is shown (an employee picked, or a user
   * without attendance_viewAll seeing their own), the optional days that person chose are
   * marked as their optional leave.
   */
  const loadHolidayEvents = (info, success) => {
    const forUserId = canViewAllAttendance ? selectedUserRef.current : '';
    const onePerson = !canViewAllAttendance || !!forUserId;
    const years = [];
    for (let y = info.start.getFullYear(); y <= new Date(info.end.getTime() - 1).getFullYear(); y++) years.push(y);

    const loadYear = (year) => {
      const key = year + '|' + forUserId;
      if (!holidayCache.current[key]) {
        holidayCache.current[key] = new Promise((resolve) => {
          const args = forUserId ? [year, forUserId] : [year];
          api.call('holidays.getCalendar', ...args, (error, data) => resolve(!error && data ? data : null));
        });
      }
      return holidayCache.current[key];
    };

    Promise.all(years.map(loadYear)).then((calendars) => {
      success(buildHolidayEvents(calendars.filter(Boolean), onePerson));
    });
  };

  // Load attendance records
  const loadAttendance = (userId = null) => {
    setIsLoading(true);

    const options = {};
    if (userId) {
      options.userId = userId;
    }

    // Load attendance, leaves, and absent days in parallel
    let attendanceLoaded = false;
    let leavesLoaded = false;
    let absentLoaded = false;

    const checkAndRender = function () {
      if (attendanceLoaded && leavesLoaded && absentLoaded) {
        setInsights(buildInsights(attendanceRecords.current, leaveRecords.current, absentDays.current));
        setIsLoading(false);
        setCalendarVersion((version) => version + 1);
      }
    };

    api.call('attendance.getList', options, (error, result) => {
      if (error) {
        console.error('Error loading attendance:', error);
        toastr.error('Failed to load attendance records');
        attendanceLoaded = true;
        checkAndRender();
        return;
      }

      if (result && result.data) {
        attendanceRecords.current = result.data;
        setStats(calculateStats(result.data));
      } else {
        attendanceRecords.current = [];
      }

      attendanceLoaded = true;
      checkAndRender();
    });

    // Load approved leaves
    api.call('leaveRequests.getForCalendar', userId || undefined, undefined, undefined, (error, result) => {
      if (error) {
        console.error('Error loading leaves:', error);
        leavesLoaded = true;
        checkAndRender();
        return;
      }

      if (result) {
        leaveRecords.current = result;
      } else {
        leaveRecords.current = [];
      }

      leavesLoaded = true;
      checkAndRender();
    });

    // Load absent days (non-punched working days)
    api.call('attendance.getAbsentDays', options, (error, result) => {
      if (error) {
        console.error('Error loading absent days:', error);
        absentLoaded = true;
        checkAndRender();
        return;
      }

      if (result) {
        absentDays.current = result;
      } else {
        absentDays.current = [];
      }

      absentLoaded = true;
      checkAndRender();
    });
  };

  /** Open the detail modal of one attendance / leave / absent record. */
  const openEventDetail = (data) => {
    if (data.type === 'attendance') {
      setAttendanceDetail(describeAttendance(data));
      $('#attendanceDetailModal').modal('show');
    } else if (data.type === 'leave') {
      setLeaveDetail(describeLeave(data));
      $('#leaveDetailModal').modal('show');
    } else if (data.type === 'absent') {
      setLeaveDetail(describeAbsent(data));
      $('#leaveDetailModal').modal('show');
    }
  };

  /**
   * Initialize FullCalendar with attendance, leave, and absent records
   */
  const initializeCalendar = () => {
    try {
      console.log('[attendance] initializeCalendar start:', {
        attendance: (attendanceRecords.current || []).length,
        leaves: (leaveRecords.current || []).length,
        absent: (absentDays.current || []).length
      });
      const events = buildCalendarEvents(attendanceRecords.current, leaveRecords.current, absentDays.current);
      // Everyone at once: the month grid shows one summary per day (counts per status) instead of
      // a chip per person; the list view keeps one row per person.
      const showingEveryone = canViewAllAttendance && !selectedUserRef.current;
      const summaries = showingEveryone ? buildDaySummaries(events) : null;
      const eventsForView = (viewType) => (summaries && viewType === 'dayGridMonth' ? summaries : events);
      let loadedEvents = eventsForView(activeViewRef.current);

      // Destroy existing calendar if it exists
      if (calendarInstance.current) {
        calendarInstance.current.destroy();
      }

      // Initialize FullCalendar
      const calendarEl = document.getElementById('attendanceCalendar');
      if (!calendarEl) {
        return;
      }

      calendarInstance.current = new Calendar(calendarEl, {
        plugins: [dayGridPlugin, listPlugin, interactionPlugin],
        displayEventTime: false,
        // Month / List switching lives in the page toolbar (see changeCalendarView)
        headerToolbar: {
          left: 'title',
          center: '',
          right: 'today prev,next'
        },
        buttonText: { today: 'Today' },
        initialView: activeViewRef.current,
        eventSources: [
          { id: 'attendance', events: loadedEvents },
          { id: 'holidays', events: loadHolidayEvents },
        ],
        // Holidays first in a day, then FullCalendar's default order (start, duration, title)
        eventOrder: '-isHoliday,start,-duration,allDay,title',
        eventClick: function (info) {
          const data = info.event.extendedProps;
          if (data.type === 'daySummary') {
            $(info.el).tooltip('hide');
            setDayDetail({ date: data.date, people: data.people });
            $('#attendanceDayModal').modal('show');
            return;
          }
          openEventDetail(data);
        },
        datesSet: function (info) {
          // Swap between day summaries (month) and per-person rows (list) when the view changes
          if (summaries) {
            const wanted = eventsForView(info.view.type);
            if (wanted !== loadedEvents) {
              loadedEvents = wanted;
              const calendar = info.view.calendar;
              // Only the attendance layer is swapped; the holidays layer stays
              const existing = calendar.getEventSourceById('attendance');
              if (existing) existing.remove();
              calendar.addEventSource({ id: 'attendance', events: wanted });
            }
          }
          if (info.view.type === 'listMonth') {
            requestAnimationFrame(() => reverseListViewDays(calendarEl));
          }
        },
        // The event source swap above re-renders the list after datesSet, so order it again
        eventsSet: function () {
          const calendar = calendarInstance.current;
          if (calendar && calendar.view.type === 'listMonth') {
            requestAnimationFrame(() => reverseListViewDays(calendarEl));
          }
        },
        // Each event is a soft chip: status dot, label, and the punch times when there are any
        eventContent: function (arg) {
          const data = arg.event.extendedProps;
          if (data.type === 'daySummary') {
            const wrap = document.createElement('div');
            wrap.className = 'att-summary';
            const pills = document.createElement('div');
            pills.className = 'att-summary-pills';
            DAY_STATUS_ORDER.forEach((status) => {
              if (!data.counts[status]) return;
              const pill = document.createElement('span');
              pill.className = 'att-summary-pill att-' + status;
              pill.title = data.counts[status] + ' ' + DAY_STATUS_LABELS[status];
              pill.innerHTML = '<span class="att-dot"></span>';
              pill.appendChild(document.createTextNode(String(data.counts[status])));
              pills.appendChild(pill);
            });
            const foot = document.createElement('div');
            foot.className = 'att-summary-foot';
            foot.textContent = data.people.length + (data.people.length === 1 ? ' person' : ' people');
            const more = document.createElement('i');
            more.className = 'bx bx-chevron-right';
            foot.appendChild(more);
            wrap.append(pills, foot);
            return { domNodes: [wrap] };
          }
          const dot = document.createElement('span');
          dot.className = 'att-dot';
          const label = document.createElement('span');
          label.className = 'att-label';
          if (data.type === 'attendance') {
            const late = arg.event.classNames.includes('att-late');
            label.textContent = data.userName || (data.status === 'punched_in' ? 'Working' : (late ? 'Late' : 'Present'));
          } else {
            label.textContent = arg.event.title;
          }
          const nodes = [dot, label];
          if (data.type === 'attendance' && data.timeRange) {
            const time = document.createElement('span');
            time.className = 'att-time';
            time.textContent = data.timeRange.replace(/ (AM|PM)/g, (m, p) => p.toLowerCase());
            nodes.push(time);
          }
          return { domNodes: nodes };
        },
        dayCellClassNames: function (arg) {
          const dayOfWeek = arg.date.getDay();
          return dayOfWeek === 0 || dayOfWeek === 6 ? ['att-weekend'] : [];
        },
        eventDidMount: function (info) {
          $(info.el).tooltip({
            title: getEventTooltip(info.event),
            placement: 'top',
            trigger: 'hover',
            container: 'body'
          });
        },
        height: 'auto',
        contentHeight: 600,
        editable: false,
        selectable: false,
        dayMaxEvents: 3,
        weekends: true,
        navLinks: true,
        businessHours: {
          daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
          startTime: '09:00',
          endTime: '18:00'
        }
      });

      calendarInstance.current.render();
      console.log('[attendance] calendar rendered OK');
    } catch (err) {
      console.error('[attendance] initializeCalendar FAILED:', err);
    }
  };

  useEffect(() => {
    console.log('[attendance] onCreated');
    console.log('[attendance] onRendered');

    // Load employees for filter dropdown
    api.call('attendance.getActiveEmployees', (error, list) => {
      if (!error && list) {
        setEmployees(list);
        setEmployeesLoaded(true);
      }
    });

    // Initial load
    loadAttendance();

    return () => {
      // Clean up calendar instance
      if (calendarInstance.current) {
        calendarInstance.current.destroy();
        calendarInstance.current = null;
      }
    };
  }, []);

  // Insight charts, drawn whenever the loaded records change
  useEffect(() => {
    if (!insights || isLoading) return undefined;
    const { daily, arrivals, breakdown } = insights;
    const charts = [
      daily.some((d) => d.hours > 0) && renderChart('#attDailyChart', {
        series: [{ name: 'Avg hours', data: daily.map((d) => d.hours) }],
        chart: { type: 'bar', height: 260 },
        colors: [CHART_COLORS.primary],
        plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
        stroke: { width: 0 },
        xaxis: {
          categories: daily.map((d) => moment(d.day).format('D MMM')),
          tickAmount: 8,
          labels: { rotate: 0, hideOverlappingLabels: true },
          tooltip: { enabled: false },
        },
        yaxis: { min: 0, max: (max) => Math.max(10, Math.ceil(max)), labels: { formatter: (val) => Math.round(val) + 'h' } },
        annotations: {
          yaxis: [{
            y: 9,
            borderColor: CHART_COLORS.green,
            strokeDashArray: 0,
            label: {
              text: '9h target',
              position: 'left',
              textAnchor: 'start',
              offsetX: 6,
              borderWidth: 0,
              style: { background: '#f0fdf4', color: '#166534', fontSize: '11px', fontWeight: 600 },
            },
          }],
        },
        tooltip: {
          x: { formatter: (val, opts) => moment(daily[opts.dataPointIndex].day).format('ddd, D MMM') },
          y: { formatter: (val) => (val ? val.toFixed(1) + ' h' : 'No punch-in') },
        },
      }),
      arrivals.some((n) => n > 0) && renderChart('#attArrivalChart', {
        series: [{ name: 'Punch-ins', data: arrivals }],
        chart: { type: 'bar', height: 260 },
        // On time (green), a little late (amber), late (red): colour means status here
        colors: [CHART_COLORS.green, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.amber, CHART_COLORS.red],
        plotOptions: { bar: { distributed: true, horizontal: true, barHeight: '58%', borderRadius: 3 } },
        stroke: { width: 0 },
        legend: { show: false },
        xaxis: { categories: ARRIVAL_BUCKETS, tickAmount: Math.min(Math.max(...arrivals), 4), labels: { formatter: (val) => Math.round(val) } },
        yaxis: { labels: { style: { colors: CHART_COLORS.text, fontSize: '11px' } } },
        grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        tooltip: { y: { formatter: (val) => val + ' punch-in' + (val !== 1 ? 's' : '') } },
      }),
      Object.values(breakdown).some((n) => n > 0) && renderChart('#attBreakdownChart', donutChartOptions(
        [breakdown.onTime, breakdown.leave, breakdown.late, breakdown.wfh, breakdown.absent],
        ['On time', 'Leave', 'Late', 'WFH', 'Absent'],
        // Order keeps similar warm colours apart (validated for colour-blind separation)
        [CHART_COLORS.green, CHART_COLORS.primary, CHART_COLORS.amber, CHART_COLORS.cyan, CHART_COLORS.red],
        'Days', 260)),
    ];
    return () => charts.forEach((chart) => chart && chart.destroy());
  }, [insights, isLoading]);

  // Draw the calendar once the three lists are loaded and its container is on the page
  useEffect(() => {
    if (calendarVersion > 0) {
      initializeCalendar();
    }
  }, [calendarVersion]);

  // Employee filter: Select2 once the options are rendered; its changes arrive as jQuery events
  useEffect(() => {
    const $filter = $('#attendanceUserFilter');
    if (!$filter.length) return undefined;

    const userFilterChanged = (event) => {
      event.preventDefault();

      const selectedUserId = $(event.currentTarget).val();
      setSelectedUser(selectedUserId);
      selectedUserRef.current = selectedUserId || '';

      // Reload attendance with filter
      loadAttendance(selectedUserId || null);
    };
    $filter.on('change', userFilterChanged);

    if (employeesLoaded) {
      if ($filter.data('select2')) { $filter.select2('destroy'); }
      $filter.select2({ placeholder: 'All Employees', allowClear: true, width: '100%' });
    }

    return () => {
      $filter.off('change', userFilterChanged);
      // Clean up Select2
      if ($filter.data('select2')) { $filter.select2('destroy'); }
    };
  }, [employeesLoaded, canViewAllAttendance]);

  const changeCalendarView = (event, viewType) => {
    event.preventDefault();
    if (viewType === activeViewRef.current) return;

    // Update active button state
    setActiveView(viewType);
    activeViewRef.current = viewType;

    // Change calendar view
    if (calendarInstance.current) {
      calendarInstance.current.changeView(viewType);
    }
  };

  const isMonthView = activeView === 'dayGridMonth';
  const breakdown = insights ? insights.breakdown : null;
  const hasDaily = insights && insights.daily.some((d) => d.hours > 0);
  const hasArrivals = insights && insights.arrivals.some((n) => n > 0);
  const hasBreakdown = breakdown && Object.values(breakdown).some((n) => n > 0);

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y att-page">
        {/* Page Header */}
        <div className="att-header">
          <div>
            <h4 className="fw-bold mb-1">Attendance</h4>
            <p className="text-muted mb-0">Punch-ins, working hours, leave and absences at a glance</p>
          </div>
          <div className="att-office">
            <span className="att-office-chip"><i className="bx bx-buildings"></i>Office hours <strong>9:00 AM – 6:00 PM</strong></span>
            <span className="att-office-chip"><i className="bx bx-calendar-check"></i>Mon – Fri</span>
            <span className="att-office-chip att-office-muted"><i className="bx bx-coffee"></i>Sat &amp; Sun off</span>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="row g-3 mb-3">
          <div className="col-sm-6 col-xl-3">
            <div className="card h-100 att-kpi tone-indigo">
              <span className="att-kpi-icon"><i className="bx bx-log-in-circle"></i></span>
              <div className="att-kpi-body">
                <span className="att-kpi-label">Avg punch in</span>
                <span className="att-kpi-value">{isLoading ? <span className="fx-skeleton att-sk-value"></span> : stats.avgPunchIn}</span>
                <span className="att-kpi-note">{stats.presentDays} day{stats.presentDays !== 1 ? 's' : ''} present{stats.workingNow ? ' · ' + stats.workingNow + ' working now' : ''}</span>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="card h-100 att-kpi tone-amber">
              <span className="att-kpi-icon"><i className="bx bx-log-out-circle"></i></span>
              <div className="att-kpi-body">
                <span className="att-kpi-label">Avg punch out</span>
                <span className="att-kpi-value">{isLoading ? <span className="fx-skeleton att-sk-value"></span> : stats.avgPunchOut}</span>
                <span className="att-kpi-note">Office closes at 6:00 PM</span>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="card h-100 att-kpi tone-cyan">
              <span className="att-kpi-icon"><i className="bx bx-time-five"></i></span>
              <div className="att-kpi-body">
                <span className="att-kpi-label">Avg working hours</span>
                <span className="att-kpi-value">{isLoading ? <span className="fx-skeleton att-sk-value"></span> : stats.avgWorkingHours}</span>
                <span className="att-kpi-note">Target 9h per day</span>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="card h-100 att-kpi tone-green">
              <span className="att-ring" style={{ '--pct': stats.onTimePercent }} aria-hidden="true">
                <span>{isLoading ? '–' : stats.onTimePercent + '%'}</span>
              </span>
              <div className="att-kpi-body">
                <span className="att-kpi-label">On-time arrival</span>
                <span className="att-kpi-value">{isLoading ? <span className="fx-skeleton att-sk-value"></span> : stats.onTimePercentage}</span>
                <span className="att-kpi-note">{stats.lateCount} late arrival{stats.lateCount !== 1 ? 's' : ''} · after 9:15 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="row g-3 mb-3">
          <ChartCard className="col-xl-6" title="Working hours" subtitle="Average per person · last 30 days"
            chartId="attDailyChart" height={260} loading={isLoading} empty={!hasDaily && 'No hours recorded in the last 30 days'} />
          <ChartCard className="col-md-6 col-xl-3" title="Arrival times" subtitle="When people punch in"
            chartId="attArrivalChart" height={260} loading={isLoading} empty={!hasArrivals && 'No punch-ins yet'} />
          <ChartCard className="col-md-6 col-xl-3" title="Attendance breakdown" subtitle="Days by status"
            chartId="attBreakdownChart" height={260} loading={isLoading} empty={!hasBreakdown && 'Nothing to show yet'} />
        </div>

        {/* Calendar */}
        <div className="card att-calendar-card">
          <div className="att-toolbar">
            <div className="att-toolbar-left">
              {/* Employee Filter (Admin only) */}
              {canViewAllAttendance && (
                <div className="att-filter">
                  <i className="bx bx-user"></i>
                  <select className="form-select" id="attendanceUserFilter" defaultValue="" aria-label="Filter by employee">
                    <option value="">All Employees</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>{employee.profile?.firstName} {employee.profile?.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="att-legend">
                <span className="att-chip att-present"><span className="att-dot"></span>Present</span>
                <span className="att-chip att-late"><span className="att-dot"></span>Late</span>
                <span className="att-chip att-working"><span className="att-dot"></span>Working</span>
                <span className="att-chip att-leave"><span className="att-dot"></span>Leave</span>
                <span className="att-chip att-wfh"><span className="att-dot"></span>WFH</span>
                <span className="att-chip att-absent"><span className="att-dot"></span>Absent</span>
                <span className="att-chip att-holiday"><span className="att-dot"></span>Holiday</span>
                <span className="att-chip att-optional-chosen"><span className="att-dot"></span>Optional leave</span>
                <span className="att-chip att-optional"><span className="att-dot"></span>Optional holiday</span>
              </div>
            </div>

            {/* Calendar View Options */}
            <div className={'att-view-toggle' + (isMonthView ? '' : ' is-list')} role="group" aria-label="Calendar view">
              <span className="att-view-thumb" aria-hidden="true"></span>
              <button type="button" className={'calendar-view-btn' + (isMonthView ? ' active' : '')} data-view="dayGridMonth"
                aria-pressed={isMonthView} onClick={(event) => changeCalendarView(event, 'dayGridMonth')}>
                <i className="bx bx-calendar"></i>Month
              </button>
              <button type="button" className={'calendar-view-btn' + (!isMonthView ? ' active' : '')} data-view="listMonth"
                aria-pressed={!isMonthView} onClick={(event) => changeCalendarView(event, 'listMonth')}>
                <i className="bx bx-list-ul"></i>List
              </button>
            </div>
          </div>

          <div className="att-calendar-body">
            {isLoading ? (
              /* Loading State: a placeholder month grid */
              <div key="loading" className="att-cal-skeleton" role="status" aria-label="Loading attendance">
                <div className="att-cal-sk-head"><span className="fx-skeleton"></span><span className="fx-skeleton"></span></div>
                <div className="att-cal-sk-grid">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="att-cal-sk-cell">
                      <span className="fx-skeleton att-cal-sk-num"></span>
                      {i % 7 < 5 && i % 3 !== 2 && <span className="fx-skeleton att-cal-sk-event"></span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Calendar Container (its own key: FullCalendar fills this element, so React must not reuse it).
                 Its className must stay static: FullCalendar adds its own "fc ..." classes to this element,
                 and a className that changes with the view would make React wipe them, unstyling the calendar. */
              <div key="calendar" id="attendanceCalendar" className="att-calendar" style={{ minHeight: '600px' }}></div>
            )}
          </div>
        </div>
      </div>

      <AttendanceDetailModal detail={attendanceDetail} />

      <LeaveDetailModal detail={leaveDetail} />

      <AttendanceDayModal day={dayDetail} onOpenPerson={(person) => openEventDetail(person.event.extendedProps)} />

    </>
  );
}
