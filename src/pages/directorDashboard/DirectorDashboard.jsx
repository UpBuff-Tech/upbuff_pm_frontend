import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { CHART_COLORS, renderChart, donutChartOptions, sparklineOptions } from '../adminDashboard/charts';
import { ChartCard, KpiCard } from '../adminDashboard/widgets';
import './directorDashboard.css';

// Order chosen so neighbouring slices stay distinguishable (validated for colour-blind separation).
const TICKET_STATUSES = ['open', 'assigned', 'in_progress', 'in_review', 'on_hold', 'closed'];
const TICKET_STATUS_LABELS = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  on_hold: 'On Hold', in_review: 'In Review', closed: 'Closed'
};
const TICKET_STATUS_COLORS = {
  open: CHART_COLORS.amber, assigned: CHART_COLORS.primary, in_progress: CHART_COLORS.cyan,
  in_review: CHART_COLORS.orange, on_hold: CHART_COLORS.slate, closed: CHART_COLORS.green
};
const TICKET_PRIORITIES = ['critical', 'high', 'medium', 'low'];

const sum = (values) => values.reduce((total, value) => total + (Number(value) || 0), 0);

/** Daily hours folded into 7-day totals (oldest first) - smoother than daily points with weekend zeros. */
function weeklyTotals(days) {
  const totals = [];
  for (let end = days.length; end > 0; end -= 7) {
    totals.unshift(Math.round(sum(days.slice(Math.max(0, end - 7), end).map((d) => d.hours))));
  }
  return totals;
}

function formatTime(seconds) {
  if (!seconds) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function statusBadgeClass(status) {
  const map = { 'In Progress': 'bg-label-primary', 'Completed': 'bg-label-success', 'On Hold': 'bg-label-secondary', 'Testing': 'bg-label-info', 'Pending': 'bg-label-warning' };
  return map[status] || 'bg-label-secondary';
}

function initials(name) {
  const str = (typeof name === 'string') ? name : String(name || '?');
  return str.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || '?';
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function priorityLabel(priority) {
  return (priority || 'low').charAt(0).toUpperCase() + (priority || 'low').slice(1);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Count of items per key, as [{ key, count }] sorted by count (largest first). */
function countBy(items, keyOf) {
  const counts = {};
  items.forEach((item) => {
    const key = keyOf(item);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).map((key) => ({ key, count: counts[key] })).sort((a, b) => b.count - a.count);
}

export default function DirectorDashboard() {
  const { user, userId } = useAuth();

  const [projectStats, setProjectStats] = useState(null);
  const [delayedTickets, setDelayedTickets] = useState([]);
  const [isDelayedTicketsLoading, setDelayedTicketsLoading] = useState(true);
  const [ticketStats, setTicketStats] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [trends, setTrends] = useState(null);
  const [dailyTaskSummary, setDailyTaskSummary] = useState([]);
  const [isDailySummaryLoading, setDailySummaryLoading] = useState(true);
  const [summaryDate, setSummaryDate] = useState(() => new Date());
  // The member whose task list is open in the Daily Task Summary (only one at a time).
  const [openUserId, setOpenUserId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDailySummary = (date) => {
    setDailySummaryLoading(true);
    setOpenUserId(null);
    api.call('projectTasks.getDailyTaskSummary', date || null, (err, data) => {
      if (!err && data) {
        setDailyTaskSummary(data);
      }
      setDailySummaryLoading(false);
    });
  };

  // Everything except the daily summary (that one follows its date picker)
  useEffect(() => {
    if (!userId) return;

    api.call('project.getDashboardStats', (err, stats) => {
      if (!err && stats) setProjectStats(stats);
    });

    setDelayedTicketsLoading(true);
    api.call('tickets.getDelayedTickets', (err, data) => {
      if (!err && data) setDelayedTickets(data);
      setDelayedTicketsLoading(false);
    });

    api.call('tickets.getStats', {}, (err, stats) => {
      if (!err && stats) setTicketStats(stats);
    });

    api.call('ticketTypes.getActive', (err, types) => {
      if (!err && types) setTicketTypes(types);
    });

    api.call('projectTasks.getDashboardTrends', (err, data) => {
      setTrends(!err && data ? data : { weekly: [], daily: [], priority: {} });
    });
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!userId) return;
    loadDailySummary(summaryDate);
  }, [userId, summaryDate, refreshKey]);

  /* ---- Derived numbers ---- */
  const ps = projectStats || {};
  const totalProjects = ps.totalProjects || 0;
  const delayedProjects = ps.delayedProjects || 0;
  const byStatus = (ticketStats && ticketStats.byStatus) || {};
  const totalTickets = (ticketStats && ticketStats.total) || 0;
  const openTickets = totalTickets - (byStatus.closed || 0);
  const overdueTickets = delayedTickets.filter((t) => t.isOverdue).length;

  const totalDailyTasks = dailyTaskSummary.reduce((total, u) => total + u.taskCount, 0);
  const totalTodaySeconds = dailyTaskSummary.reduce((total, u) => total + (u.todaySeconds || 0), 0);
  const totalWeeklySeconds = dailyTaskSummary.reduce((total, u) => total + (u.weeklySeconds || 0), 0);
  const activeMembers = dailyTaskSummary.filter((u) => (u.todaySeconds || 0) > 0).length;

  const daily = (trends && trends.daily) || [];
  const weekly = (trends && trends.weekly) || [];
  const last30 = daily.slice(-30);

  const typeName = (code) => {
    const type = ticketTypes.find((t) => t.code === code);
    return (type && type.name) || code || 'Other';
  };
  const ticketsByType = ticketStats ? Object.keys(ticketStats.byType || {})
    .map((code) => ({ label: typeName(code), count: ticketStats.byType[code] }))
    .sort((a, b) => b.count - a.count) : [];
  const delayedByAssignee = countBy(delayedTickets, (t) => t.assignedToName || 'Unassigned');
  const isToday = moment(summaryDate).isSame(moment(), 'day');

  const trendsLoading = trends === null;
  const statsLoading = projectStats === null;
  const ticketsLoading = ticketStats === null;
  const hasDailyHours = last30.some((d) => d.hours > 0);
  const hasThroughput = weekly.some((w) => w.created || w.completed);
  const teamMembers = dailyTaskSummary
    .filter((m) => (m.weeklySeconds || 0) > 0 || (m.todaySeconds || 0) > 0)
    .slice()
    .sort((a, b) => (b.weeklySeconds || 0) - (a.weeklySeconds || 0))
    .slice(0, 10);

  /* ---- Charts ---- */
  useEffect(() => {
    if (!trends) return undefined;
    const charts = [
      renderChart('#dirHoursSpark', sparklineOptions(weeklyTotals(daily), CHART_COLORS.primary, 'Hours (week)')),
      hasDailyHours && renderDailyHours(last30),
      hasThroughput && renderThroughput(weekly),
    ];
    return () => charts.forEach((chart) => chart && chart.destroy());
  }, [trends]);

  useEffect(() => {
    if (!ticketStats) return undefined;
    const charts = [
      totalTickets > 0 && renderChart('#ticketStatusChart', donutChartOptions(
        TICKET_STATUSES.map((s) => byStatus[s] || 0),
        TICKET_STATUSES.map((s) => TICKET_STATUS_LABELS[s]),
        TICKET_STATUSES.map((s) => TICKET_STATUS_COLORS[s]),
        'Tickets', 320)),
      totalTickets > 0 && renderBars('#ticketPriorityChart', TICKET_PRIORITIES.map(priorityLabel),
        TICKET_PRIORITIES.map((p) => (ticketStats.byPriority || {})[p] || 0), 'Tickets', CHART_COLORS.primary),
      ticketsByType.length > 0 && renderBars('#ticketTypeChart', ticketsByType.slice(0, 6).map((t) => t.label),
        ticketsByType.slice(0, 6).map((t) => t.count), 'Tickets', CHART_COLORS.cyan),
    ];
    return () => charts.forEach((chart) => chart && chart.destroy());
  }, [ticketStats, ticketTypes]);

  useEffect(() => {
    if (isDelayedTicketsLoading || delayedByAssignee.length === 0) return undefined;
    const top = delayedByAssignee.slice(0, 6);
    const chart = renderBars('#delayedByAssigneeChart', top.map((d) => d.key), top.map((d) => d.count), 'Delayed tickets', CHART_COLORS.red);
    return () => chart && chart.destroy();
  }, [delayedTickets, isDelayedTicketsLoading]);

  useEffect(() => {
    if (isDailySummaryLoading || teamMembers.length === 0) return undefined;
    const chart = renderTeamHours(teamMembers, isToday);
    return () => chart && chart.destroy();
  }, [dailyTaskSummary, isDailySummaryLoading]);

  const handleSummaryDateChange = (event) => {
    const dateVal = event.currentTarget.value;
    if (dateVal) setSummaryDate(new Date(dateVal));
  };

  const toggleUserTasks = (memberId) => {
    setOpenUserId((current) => (current === memberId ? null : memberId));
  };

  const firstName = (user && user.profile && user.profile.firstName) || '';

  return (
    <div className="container-xxl flex-grow-1 container-p-y fx-dashboard">

      {/* Header */}
      <div className="fx-dash-header">
        <div>
          <h4 className="fw-bold mb-1">{greeting()}{firstName ? ', ' + firstName : ''}</h4>
          <p className="text-muted mb-0">Directors overview of projects, tickets and team performance — {moment().format('dddd, D MMMM')}</p>
        </div>
        <div className="fx-dash-actions">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <i className="bx bx-refresh me-1"></i>Refresh
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="row g-3 mb-3">
        <KpiCard id="dirHoursSpark" icon="bx-time-five" tone="primary" label={isToday ? 'Team hours today' : 'Team hours · ' + moment(summaryDate).format('D MMM')}
          value={formatTime(totalTodaySeconds)} loading={isDailySummaryLoading}>
          <span className="fx-kpi-note">{formatTime(totalWeeklySeconds)} logged this week</span>
        </KpiCard>
        <KpiCard icon="bx-group" tone="cyan" label="Active members" value={activeMembers} loading={isDailySummaryLoading}>
          <span className="fx-kpi-note">{dailyTaskSummary.length} with tasks · {totalDailyTasks} tasks worked</span>
          <div className="fx-kpi-meter">
            <div className="fx-kpi-meter-track">
              <span style={{ width: (dailyTaskSummary.length ? (activeMembers / dailyTaskSummary.length) * 100 : 0) + '%' }}></span>
            </div>
          </div>
        </KpiCard>
        <KpiCard icon="bx-support" tone="green" label="Open tickets" value={openTickets} loading={ticketsLoading}>
          <span className="fx-kpi-note">{byStatus.closed || 0} closed · {totalTickets} total</span>
          <div className="fx-kpi-meter">
            <div className="fx-kpi-meter-track">
              <span style={{ width: (totalTickets ? ((byStatus.closed || 0) / totalTickets) * 100 : 0) + '%' }}></span>
            </div>
          </div>
        </KpiCard>
        <KpiCard icon="bx-error-circle" tone="red" label="Delayed projects" value={delayedProjects} loading={statsLoading}>
          <div className="fx-kpi-meter">
            <div className="fx-kpi-meter-track">
              <span style={{ width: (totalProjects ? (delayedProjects / totalProjects) * 100 : 0) + '%' }}></span>
            </div>
            <span className="fx-kpi-note">{totalProjects ? Math.round((delayedProjects / totalProjects) * 100) : 0}% of {totalProjects} projects past their end date</span>
          </div>
        </KpiCard>
      </div>

      {/* Summary strip */}
      <div className="card fx-summary mb-3">
        {[
          { label: 'Total projects', value: totalProjects, icon: 'bx-folder', loading: statsLoading },
          { label: 'Running', value: ps.runningProjects || 0, icon: 'bx-play-circle', loading: statsLoading },
          { label: 'Completed projects', value: ps.completedProjects || 0, icon: 'bx-badge-check', loading: statsLoading },
          { label: 'Total tickets', value: totalTickets, icon: 'bx-receipt', loading: ticketsLoading },
          { label: 'Delayed tickets', value: delayedTickets.length, icon: 'bx-time', loading: isDelayedTicketsLoading },
          { label: 'Past due date', value: overdueTickets, icon: 'bx-calendar-exclamation', loading: isDelayedTicketsLoading },
        ].map((item) => (
          <div className="fx-summary-item" key={item.label}>
            <i className={'bx ' + item.icon}></i>
            <div>
              <div className="fx-summary-value">{item.loading ? '–' : item.value.toLocaleString()}</div>
              <div className="fx-summary-label">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hours + ticket status */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-8" title="Hours logged per day" subtitle="Whole team · last 30 days"
          chartId="dirDailyHoursChart" height={300} loading={trendsLoading} empty={!hasDailyHours && 'No time logged in the last 30 days'} />
        <ChartCard className="col-xl-4" title="Ticket status" subtitle="All tickets"
          chartId="ticketStatusChart" height={300} loading={ticketsLoading} empty={!totalTickets && 'No tickets yet'} />
      </div>

      {/* Team hours + throughput */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-6" title="Team hours by member"
          subtitle={(isToday ? 'Today' : moment(summaryDate).format('D MMM')) + ' vs this week · top 10'}
          chartId="teamHoursChart" height={320} loading={isDailySummaryLoading}
          empty={teamMembers.length === 0 && 'No time logged for this date'} />
        <ChartCard className="col-xl-6" title="Task throughput" subtitle="Tasks created vs completed per week · last 12 weeks"
          chartId="dirThroughputChart" height={320} loading={trendsLoading} empty={!hasThroughput && 'No task activity in the last 12 weeks'} />
      </div>

      {/* Ticket breakdowns */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-md-6 col-xl-4" title="Tickets by priority" subtitle="All tickets"
          chartId="ticketPriorityChart" height={240} loading={ticketsLoading} empty={!totalTickets && 'No tickets yet'} />
        <ChartCard className="col-md-6 col-xl-4" title="Tickets by type" subtitle="Top 6 types"
          chartId="ticketTypeChart" height={240} loading={ticketsLoading} empty={ticketsByType.length === 0 && 'No tickets yet'} />
        <ChartCard className="col-xl-4" title="Delayed tickets by assignee" subtitle="In progress since before today"
          chartId="delayedByAssigneeChart" height={240} loading={isDelayedTicketsLoading}
          empty={delayedByAssignee.length === 0 && 'No delayed tickets 🎉'} />
      </div>

      {/* Delayed Tickets Table */}
      <div className="card fx-chart-card mb-3">
        <div className="card-header">
          <div>
            <h5 className="card-title">Delayed tickets</h5>
            <p className="fx-card-subtitle">In progress since before today · longest waiting first</p>
          </div>
          <span className={'badge rounded-pill ' + (delayedTickets.length ? 'bg-label-danger' : 'bg-label-success')}>
            {delayedTickets.length} delayed{overdueTickets ? ' · ' + overdueTickets + ' past due' : ''}
          </span>
        </div>
        {isDelayedTicketsLoading ? (
          <div className="card-body">
            {[0, 1, 2].map((i) => <div key={i} className="fx-skeleton fx-skeleton-row"></div>)}
          </div>
        ) : delayedTickets.length ? (
          <div className="table-responsive dir-table-scroll">
            <table className="table table-hover dir-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Assigned to</th>
                  <th>In progress since</th>
                  <th className="text-end">Delay</th>
                  <th className="text-end">Hours</th>
                  <th>Due date</th>
                </tr>
              </thead>
              <tbody>
                {delayedTickets.map((ticket, index) => (
                  <tr key={index} className={ticket.isOverdue ? 'is-overdue' : ''}>
                    <td>
                      <div className="dir-ticket-subject">{ticket.subject}</div>
                      <div className="dir-ticket-id">{ticket.ticketId}</div>
                    </td>
                    <td>{ticket.clientName}</td>
                    <td>{ticket.typeName}</td>
                    <td><span className={'dir-priority p-' + (ticket.priority || 'low')}>{priorityLabel(ticket.priority)}</span></td>
                    <td>
                      <span className="dir-assignee">
                        <span className="dir-avatar">{initials(ticket.assignedToName)}</span>{ticket.assignedToName}
                      </span>
                    </td>
                    <td>{formatDate(ticket.inProgressSince)}</td>
                    <td className="text-end"><span className="dir-delay">{ticket.delayDays}d</span></td>
                    <td className="text-end">{ticket.loggedHours} h</td>
                    <td>
                      {ticket.dueDate ? (
                        <span className={ticket.isOverdue ? 'dir-overdue' : ''}>
                          {ticket.isOverdue && <i className="bx bx-error-circle"></i>}{formatDate(ticket.dueDate)}
                        </span>
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body">
            <div className="fx-chart-empty" style={{ height: 140 }}>
              <i className="bx bx-check-circle"></i><span>No delayed tickets</span>
            </div>
          </div>
        )}
      </div>

      {/* Daily Task Summary */}
      <div className="card fx-chart-card">
        <div className="card-header dir-summary-head">
          <div>
            <h5 className="card-title">Daily task summary</h5>
            <p className="fx-card-subtitle">Who worked on what · click a member to see their tasks</p>
          </div>
          <div className="dir-summary-tools">
            <span className="dir-chip"><i className="bx bx-group"></i>{dailyTaskSummary.length} members · {totalDailyTasks} tasks</span>
            <span className="dir-chip dir-chip-primary"><i className="bx bx-time-five"></i>{isToday ? 'Today' : 'Day'}: {formatTime(totalTodaySeconds)}</span>
            <span className="dir-chip dir-chip-info"><i className="bx bx-calendar-week"></i>Week: {formatTime(totalWeeklySeconds)}</span>
            <input type="date" id="summaryDatePicker" className="form-control form-control-sm"
              defaultValue={moment(summaryDate).format('YYYY-MM-DD')} onChange={handleSummaryDateChange} />
          </div>
        </div>
        <div className="card-body pt-2">
          {isDailySummaryLoading ? (
            [0, 1, 2].map((i) => <div key={i} className="fx-skeleton fx-skeleton-row"></div>)
          ) : dailyTaskSummary.length ? (
            <div className="dir-members">
              {dailyTaskSummary.map((member) => {
                const isOpen = openUserId === member.userId;
                const weekShare = totalWeeklySeconds ? ((member.weeklySeconds || 0) / Math.max(...dailyTaskSummary.map((m) => m.weeklySeconds || 0), 1)) * 100 : 0;
                return (
                  <div key={member.userId} className={'dir-member' + (isOpen ? ' is-open' : '')}>
                    <button type="button" className="dir-member-head toggle-user-tasks" data-user-id={member.userId}
                      aria-expanded={isOpen} onClick={() => toggleUserTasks(member.userId)}>
                      <span className="dir-avatar dir-avatar-lg">{initials(member.employeeName)}</span>
                      <span className="dir-member-name">
                        <strong>{member.employeeName}</strong>
                        <small>{member.taskCount} task{member.taskCount !== 1 ? 's' : ''}</small>
                      </span>
                      <span className="dir-member-bar" title={formatTime(member.weeklySeconds) + ' this week'}>
                        <span style={{ width: weekShare + '%' }}></span>
                      </span>
                      <span className="dir-member-time">
                        <span><small>{isToday ? 'Today' : 'Day'}</small><strong>{formatTime(member.todaySeconds)}</strong></span>
                        <span><small>Week</small><strong>{formatTime(member.weeklySeconds)}</strong></span>
                      </span>
                      <i className={'bx bx-chevron-down dir-member-caret'}></i>
                    </button>

                    {isOpen && (
                      <div id={'tasks-' + member.userId} className="dir-member-tasks">
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th>Task</th>
                              <th>Project</th>
                              <th>Status</th>
                              <th className="text-end">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(member.tasks || []).map((task, index) => (
                              <tr key={index}>
                                <td>
                                  <div className="dir-ticket-subject">{task.taskName}</div>
                                  <div className="dir-ticket-id">{task.taskId}</div>
                                </td>
                                <td>{task.projectName}</td>
                                <td><span className={'badge ' + statusBadgeClass(task.status)}>{task.status}</span></td>
                                <td className="text-end"><strong>{formatTime(task.todaySeconds)}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="fx-chart-empty" style={{ height: 140 }}>
              <i className="bx bx-calendar-x"></i><span>No task activity for this date</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chart builders                                                      */
/* ------------------------------------------------------------------ */

function renderDailyHours(days) {
  const values = days.map((d) => d.hours);
  const average = values.length ? sum(values) / values.length : 0;
  return renderChart('#dirDailyHoursChart', {
    series: [{ name: 'Hours logged', data: values }],
    chart: { type: 'bar', height: 300 },
    colors: [CHART_COLORS.primary],
    plotOptions: { bar: { columnWidth: '58%', borderRadius: 3 } },
    stroke: { width: 0 },
    xaxis: {
      categories: days.map((d) => moment(d.day).format('D MMM')),
      tickAmount: 10,
      labels: { rotate: 0, hideOverlappingLabels: true },
      tooltip: { enabled: false },
    },
    yaxis: { min: 0, labels: { formatter: (val) => Math.round(val) + 'h' } },
    annotations: average > 0 ? {
      yaxis: [{
        y: average,
        borderColor: CHART_COLORS.orange,
        strokeDashArray: 0,
        label: {
          text: 'Avg ' + average.toFixed(1) + 'h',
          position: 'left',
          textAnchor: 'start',
          offsetX: 6,
          borderWidth: 0,
          style: { background: '#fff7ed', color: '#9a3412', fontSize: '11px', fontWeight: 600 },
        },
      }],
    } : {},
    tooltip: {
      x: { formatter: (val, opts) => moment(days[opts.dataPointIndex].day).format('ddd, D MMM') },
      y: { formatter: (val) => val.toFixed(1) + ' h' },
    },
  });
}

function renderThroughput(weekly) {
  return renderChart('#dirThroughputChart', {
    series: [
      { name: 'Created', data: weekly.map((w) => w.created) },
      { name: 'Completed', data: weekly.map((w) => w.completed) },
    ],
    chart: { type: 'area', height: 320 },
    colors: [CHART_COLORS.primary, CHART_COLORS.cyan],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.02, stops: [0, 95] } },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: { categories: weekly.map((w) => moment(w.weekStart).format('D MMM')), tooltip: { enabled: false } },
    yaxis: { min: 0, labels: { formatter: (val) => Math.round(val) } },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { shared: true, x: { formatter: (val) => 'Week of ' + val }, y: { formatter: (val) => val + ' tasks' } },
  });
}

/** Each member's hours on the chosen day and in the week - grouped horizontal bars (one unit, one axis). */
function renderTeamHours(members, isToday) {
  const hours = (seconds) => Math.round(((seconds || 0) / 3600) * 10) / 10;
  return renderChart('#teamHoursChart', {
    series: [
      { name: isToday ? 'Today' : 'That day', data: members.map((m) => hours(m.todaySeconds)) },
      { name: 'This week', data: members.map((m) => hours(m.weeklySeconds)) },
    ],
    chart: { type: 'bar', height: 320 },
    colors: [CHART_COLORS.orange, CHART_COLORS.primary],
    plotOptions: { bar: { horizontal: true, barHeight: '72%', borderRadius: 2 } },
    stroke: { show: true, width: 2, colors: [CHART_COLORS.surface] },
    xaxis: { categories: members.map((m) => m.employeeName), labels: { formatter: (val) => Math.round(val) + 'h' } },
    yaxis: { labels: { maxWidth: 140, style: { colors: CHART_COLORS.text, fontSize: '12px' } } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { shared: true, intersect: false, y: { formatter: (val) => val + ' h' } },
  });
}

/** A simple single-colour horizontal bar chart. */
function renderBars(selector, labels, values, seriesName, color) {
  const max = Math.max(1, ...values);
  return renderChart(selector, {
    series: [{ name: seriesName, data: values }],
    chart: { type: 'bar', height: 240 },
    colors: [color],
    plotOptions: { bar: { horizontal: true, barHeight: '52%', borderRadius: 3 } },
    stroke: { width: 0 },
    // Whole-number ticks only (small counts otherwise repeat as 0, 1, 1, 2)
    xaxis: { categories: labels, tickAmount: Math.min(max, 5), labels: { formatter: (val) => Math.round(val) } },
    yaxis: { labels: { maxWidth: 130, style: { colors: CHART_COLORS.text, fontSize: '12px' } } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { y: { formatter: (val) => val + ' ' + seriesName.toLowerCase() } },
  });
}
