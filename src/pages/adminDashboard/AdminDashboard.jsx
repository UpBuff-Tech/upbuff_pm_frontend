import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { CHART_COLORS, renderChart, donutChartOptions, sparklineOptions } from './charts';
import { ChartCard, Delta, KpiCard } from './widgets';

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const PROJECT_STATUS_COLORS = [CHART_COLORS.amber, CHART_COLORS.primary, CHART_COLORS.green, CHART_COLORS.slate];
// Order keeps the neutral "On Hold" away from cyan "Testing" (colour-blind separation).
const TASK_STATUSES = ['Pending', 'In Progress', 'Testing', 'Completed', 'On Hold'];
const TASK_STATUS_COLORS = [CHART_COLORS.amber, CHART_COLORS.primary, CHART_COLORS.cyan, CHART_COLORS.green, CHART_COLORS.slate];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const sum = (values) => values.reduce((total, value) => total + (Number(value) || 0), 0);

/** Daily hours folded into 7-day totals (oldest first), for a smooth KPI sparkline. */
function weeklyHours(days) {
  const totals = [];
  for (let end = days.length; end > 0; end -= 7) {
    totals.unshift(Math.round(sum(days.slice(Math.max(0, end - 7), end).map((d) => d.hours))));
  }
  return totals;
}

function formatHours(hours) {
  if (hours >= 1000) return (hours / 1000).toFixed(1) + 'k';
  return Math.round(hours).toLocaleString();
}

/** Percentage change, or null when there is nothing to compare against. */
function changePercent(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "12h 30m"-style text (from the assignments API) as hours. */
function durationToHours(text) {
  if (!text) return 0;
  const parts = String(text).split(':').map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) return parts[0] + parts[1] / 60 + parts[2] / 3600;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const { user, userId } = useAuth();

  const [projectStats, setProjectStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [employeeHoursData, setEmployeeHoursData] = useState(null);
  const [projectAssignmentsData, setProjectAssignmentsData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = () => {
    setRefreshing(true);
    let pending = 5;
    const done = () => {
      pending -= 1;
      if (pending === 0) {
        setRefreshing(false);
        setUpdatedAt(new Date());
      }
    };

    api.call('project.getDashboardStats', (err, stats) => {
      if (!err && stats) setProjectStats(stats);
      done();
    });
    api.call('projectTasks.getDashboardStats', (err, stats) => {
      if (!err && stats) setTaskStats(stats);
      done();
    });
    api.call('projectTasks.getEmployeeHours', (err, data) => {
      setEmployeeHoursData(!err && data ? data : []);
      done();
    });
    api.call('projectTasks.getDashboardTrends', (err, data) => {
      if (err) console.error('Error fetching dashboard trends:', err);
      setTrends(!err && data ? data : { weekly: [], daily: [], priority: {} });
      done();
    });
    api.call('projectTasks.getProjectAssignments', (error, result) => {
      if (error) console.error('Error fetching project assignments:', error);
      setProjectAssignmentsData(error ? [] : (result || []));
      done();
    });
  };

  useEffect(() => {
    if (!userId) return;
    loadAll();
  }, [userId]);

  /* ---- Derived numbers ---- */
  const weekly = (trends && trends.weekly) || [];
  const daily = (trends && trends.daily) || [];
  const last30 = daily.slice(-30);
  const prev30 = daily.slice(-60, -30);
  const hours30 = sum(last30.map((d) => d.hours));
  const hoursPrev30 = sum(prev30.map((d) => d.hours));
  const thisWeek = weekly[weekly.length - 1] || { created: 0, completed: 0 };
  const lastWeek = weekly[weekly.length - 2] || { created: 0, completed: 0 };

  const ps = projectStats || {};
  const ts = taskStats || {};
  const totalProjects = ps.totalProjects || 0;
  const delayedProjects = ps.delayedProjects || 0;
  const totalTasks = ts.totalTasks || 0;
  const completedTasks = ts.completedTasks || 0;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const onTimeRate = totalProjects ? Math.round(((totalProjects - delayedProjects) / totalProjects) * 100) : 0;

  const trendsLoading = trends === null;
  const statsLoading = projectStats === null || taskStats === null;
  const hasDailyHours = daily.some((d) => d.hours > 0);
  const hasThroughput = weekly.some((w) => w.created || w.completed);
  const priority = (trends && trends.priority) || {};
  const hasPriority = PRIORITIES.some((p) => priority[p]);

  /* ---- Charts ---- */

  // KPI sparklines + trend charts (need the trends call)
  useEffect(() => {
    if (!trends) return undefined;
    const charts = [
      renderChart('#kpiHoursSpark', sparklineOptions(weeklyHours(daily), CHART_COLORS.primary, 'Hours')),
      renderChart('#kpiCompletedSpark', sparklineOptions(weekly.map((w) => w.completed), CHART_COLORS.green, 'Completed')),
      renderChart('#kpiCreatedSpark', sparklineOptions(weekly.map((w) => w.created), CHART_COLORS.cyan, 'Created')),
      hasThroughput && renderThroughputChart(weekly),
      hasDailyHours && renderDailyHoursChart(last30),
      hasDailyHours && renderHeatmapChart(daily),
      hasPriority && renderPriorityChart(priority),
    ];
    return () => charts.forEach((chart) => chart && chart.destroy());
  }, [trends]);

  // Charts from the project/task stats
  useEffect(() => {
    if (statsLoading) return undefined;
    const charts = [
      renderHealthChart(completionRate, onTimeRate),
      renderDonut('#projectStatusChart', ps.statusDistribution, PROJECT_STATUSES, PROJECT_STATUS_COLORS, 'Projects'),
      renderDonut('#taskStatusChart', ts.statusDistribution, TASK_STATUSES, TASK_STATUS_COLORS, 'Tasks'),
      (ps.recentProjects || []).length > 0 && renderProjectTimelineChart(ps.recentProjects),
    ];
    return () => charts.forEach((chart) => chart && chart.destroy());
  }, [projectStats, taskStats]);

  useEffect(() => {
    if (!employeeHoursData || employeeHoursData.length === 0) return undefined;
    const chart = renderEmployeeHoursChart(employeeHoursData);
    return () => chart && chart.destroy();
  }, [employeeHoursData]);

  const firstName = (user && user.profile && user.profile.firstName) || '';
  const assignments = projectAssignmentsData || [];

  return (
    <div className="container-xxl flex-grow-1 container-p-y fx-dashboard">

      {/* Header */}
      <div className="fx-dash-header">
        <div>
          <h4 className="fw-bold mb-1">{greeting()}{firstName ? ', ' + firstName : ''}</h4>
          <p className="text-muted mb-0">Here's how your projects and team are doing — {moment().format('dddd, D MMMM')}</p>
        </div>
        <div className="fx-dash-actions">
          {updatedAt && <span className="fx-updated">Updated {moment(updatedAt).format('h:mm A')}</span>}
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadAll} disabled={refreshing}>
            <i className={'bx bx-refresh me-1' + (refreshing ? ' bx-spin' : '')}></i>Refresh
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="row g-3 mb-3">
        <KpiCard id="kpiHoursSpark" icon="bx-time-five" tone="primary" label="Hours logged · 30 days"
          value={formatHours(hours30)} unit="h" loading={trendsLoading}>
          <Delta value={changePercent(hours30, hoursPrev30)} suffix="vs previous 30 days" />
        </KpiCard>
        <KpiCard id="kpiCompletedSpark" icon="bx-check-circle" tone="green" label="Tasks completed · this week"
          value={thisWeek.completed} loading={trendsLoading}>
          <Delta value={changePercent(thisWeek.completed, lastWeek.completed)} suffix="vs last week" />
        </KpiCard>
        <KpiCard id="kpiCreatedSpark" icon="bx-plus-circle" tone="cyan" label="New tasks · this week"
          value={thisWeek.created} loading={trendsLoading}>
          <Delta value={changePercent(thisWeek.created, lastWeek.created)} suffix="vs last week" />
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
          { label: 'Total projects', value: totalProjects, icon: 'bx-folder' },
          { label: 'Running', value: ps.runningProjects || 0, icon: 'bx-play-circle' },
          { label: 'Completed projects', value: ps.completedProjects || 0, icon: 'bx-badge-check' },
          { label: 'Total tasks', value: totalTasks, icon: 'bx-task' },
          { label: 'In progress', value: ts.inProgressTasks || 0, icon: 'bx-loader-circle' },
          { label: 'Task completion', value: completionRate + '%', icon: 'bx-trending-up' },
        ].map((item) => (
          <div className="fx-summary-item" key={item.label}>
            <i className={'bx ' + item.icon}></i>
            <div>
              <div className="fx-summary-value">{statsLoading ? '–' : (typeof item.value === 'number' ? item.value.toLocaleString() : item.value)}</div>
              <div className="fx-summary-label">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Throughput + health */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-8" title="Task throughput" subtitle="Tasks created vs completed per week · last 12 weeks"
          chartId="throughputChart" height={300} loading={trendsLoading} empty={!hasThroughput && 'No task activity in the last 12 weeks'} />
        <ChartCard className="col-xl-4" title="Delivery health" subtitle="Share of tasks done and projects on schedule"
          chartId="healthChart" height={300} loading={statsLoading} />
      </div>

      {/* Hours + priority */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-8" title="Hours logged per day" subtitle="All team members · last 30 days"
          chartId="dailyHoursChart" height={280} loading={trendsLoading} empty={!hasDailyHours && 'No time logged in the last 30 days'} />
        <ChartCard className="col-xl-4" title="Open tasks by priority" subtitle="Tasks not yet completed"
          chartId="priorityChart" height={280} loading={trendsLoading} empty={!hasPriority && 'No open tasks with a priority'} />
      </div>

      {/* Status + people */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-md-6 col-xl-4" title="Project status" chartId="projectStatusChart" height={300} loading={statsLoading} />
        <ChartCard className="col-md-6 col-xl-4" title="Task status" chartId="taskStatusChart" height={300} loading={statsLoading} />
        <ChartCard className="col-xl-4" title="Top contributors" subtitle="Total hours logged on tasks"
          chartId="employeeHoursChart" height={300} loading={employeeHoursData === null}
          empty={employeeHoursData && employeeHoursData.length === 0 && 'No hours logged yet'} />
      </div>

      {/* Activity + timeline */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-7" title="Work activity" subtitle="Hours logged by weekday · last 12 weeks"
          chartId="activityHeatmap" height={280} loading={trendsLoading} empty={!hasDailyHours && 'No time logged yet'} />
        <ChartCard className="col-xl-5" title="Project timelines" subtitle="Planned vs elapsed days · 10 most recent projects"
          chartId="projectTimelineChart" height={280} loading={statsLoading}
          empty={projectStats && (ps.recentProjects || []).length === 0 && 'No projects yet'} />
      </div>

      {/* Project Team Assignments */}
      <div className="card fx-chart-card">
        <div className="card-header">
          <div>
            <h5 className="card-title">Project team assignments</h5>
            <p className="fx-card-subtitle">Who is working on which project</p>
          </div>
          {assignments.length > 0 && <span className="badge bg-label-secondary">{assignments.length} projects</span>}
        </div>
        {projectAssignmentsData === null ? (
          <div className="card-body">
            {[0, 1, 2].map((i) => <div key={i} className="fx-skeleton fx-skeleton-row"></div>)}
          </div>
        ) : assignments.length === 0 ? (
          <div className="card-body">
            <div className="fx-chart-empty" style={{ height: 160 }}>
              <i className="bx bx-group"></i><span>No team assignments yet</span>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover fx-assign-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Team members &amp; hours</th>
                  <th className="text-end">Total hours</th>
                  <th style={{ width: '220px' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment, index) => {
                  const active = Number(assignment.activeTasks) || 0;
                  const done = Number(assignment.completedTasks) || 0;
                  const progress = active + done ? Math.round((done / (active + done)) * 100) : 0;
                  const members = assignment.teamMembers || [];
                  return (
                    <tr key={index}>
                      <td>
                        <div className="fx-assign-project">
                          <span className="fx-assign-avatar">{(assignment.projectName || '?').charAt(0).toUpperCase()}</span>
                          <div>
                            <div className="fx-assign-name">{assignment.projectName}</div>
                            <div className="fx-assign-client"><i className="bx bx-buildings"></i>{assignment.clientName}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {members.length ? (
                          <div className="fx-member-list">
                            {members.map((member, memberIndex) => (
                              <span key={memberIndex} className="fx-member" title={`${member.taskCount} task(s), ${member.timeWorked}`}>
                                <span className="fx-member-initial">{(member.userName || '?').charAt(0).toUpperCase()}</span>
                                {member.userName}
                                <span className="fx-member-time">{member.timeWorked}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">No assignments</span>
                        )}
                      </td>
                      <td className="text-end">
                        <span className="fx-assign-hours">{Math.round(durationToHours(assignment.totalTime)).toLocaleString()}h</span>
                        <div className="fx-assign-sub">{assignment.totalTime}</div>
                      </td>
                      <td>
                        <div className="fx-progress-row">
                          <div className="fx-progress"><span style={{ width: progress + '%' }}></span></div>
                          <span className="fx-progress-value">{progress}%</span>
                        </div>
                        <div className="fx-assign-sub">{done} done · {active} active</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chart builders                                                      */
/* ------------------------------------------------------------------ */

function weekLabel(isoDate) {
  return moment(isoDate).format('D MMM');
}

/** Created vs completed per week - smooth area chart. */
function renderThroughputChart(weekly) {
  return renderChart('#throughputChart', {
    series: [
      { name: 'Created', data: weekly.map((w) => w.created) },
      { name: 'Completed', data: weekly.map((w) => w.completed) },
    ],
    chart: { type: 'area', height: 300 },
    colors: [CHART_COLORS.primary, CHART_COLORS.cyan],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 95] } },
    markers: { size: 0, strokeColors: CHART_COLORS.surface, strokeWidth: 2, hover: { size: 5 } },
    xaxis: {
      categories: weekly.map((w) => weekLabel(w.weekStart)),
      tooltip: { enabled: false },
      crosshairs: { stroke: { color: '#cbd5e1', width: 1, dashArray: 0 } },
    },
    yaxis: { labels: { formatter: (val) => Math.round(val) }, min: 0, forceNiceScale: true },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { shared: true, x: { formatter: (val) => 'Week of ' + val }, y: { formatter: (val) => val + ' tasks' } },
  });
}

/** Task completion % and projects on schedule % - two-ring radial gauge. */
function renderHealthChart(completionRate, onTimeRate) {
  return renderChart('#healthChart', {
    series: [completionRate, onTimeRate],
    labels: ['Tasks completed', 'Projects on schedule'],
    chart: { type: 'radialBar', height: 300 },
    colors: [CHART_COLORS.green, CHART_COLORS.primary],
    plotOptions: {
      radialBar: {
        hollow: { size: '42%' },
        track: { background: '#f1f5f9', margin: 6 },
        dataLabels: {
          name: { fontSize: '12px', color: CHART_COLORS.muted, offsetY: 18 },
          value: { fontSize: '24px', fontWeight: 700, color: CHART_COLORS.text, offsetY: -12, formatter: (val) => Math.round(val) + '%' },
          total: {
            show: true,
            label: 'Tasks completed',
            color: CHART_COLORS.muted,
            fontSize: '12px',
            formatter: () => completionRate + '%',
          },
        },
      },
    },
    stroke: { lineCap: 'round' },
    legend: {
      show: true,
      position: 'bottom',
      formatter: (name, opts) => name + '  <strong style="color:' + CHART_COLORS.text + '">' + opts.w.globals.series[opts.seriesIndex] + '%</strong>',
    },
  });
}

/** Hours logged per day - columns with an average line. */
function renderDailyHoursChart(days) {
  const values = days.map((d) => d.hours);
  const average = values.length ? sum(values) / values.length : 0;
  return renderChart('#dailyHoursChart', {
    series: [{ name: 'Hours logged', data: values }],
    chart: { type: 'bar', height: 280 },
    colors: [CHART_COLORS.primary],
    plotOptions: { bar: { columnWidth: '58%', borderRadius: 3 } },
    stroke: { width: 0 },
    xaxis: {
      categories: days.map((d) => moment(d.day).format('D MMM')),
      tickAmount: 10,
      labels: { rotate: 0, hideOverlappingLabels: true },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { formatter: (val) => Math.round(val) + 'h' } },
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

/** Open tasks per priority - horizontal bars, one colour. */
function renderPriorityChart(priority) {
  return renderChart('#priorityChart', {
    series: [{ name: 'Open tasks', data: PRIORITIES.map((p) => priority[p] || 0) }],
    chart: { type: 'bar', height: 280 },
    colors: [CHART_COLORS.primary],
    plotOptions: { bar: { horizontal: true, barHeight: '46%', borderRadius: 3 } },
    stroke: { width: 0 },
    xaxis: { categories: PRIORITIES, labels: { formatter: (val) => Math.round(val) } },
    yaxis: { labels: { style: { colors: CHART_COLORS.text, fontSize: '12px' } } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { y: { formatter: (val) => val + ' tasks' } },
  });
}

function renderDonut(selector, distribution, labels, colors, totalLabel) {
  const counts = distribution || {};
  return renderChart(selector, donutChartOptions(labels.map((label) => counts[label] || 0), labels, colors, totalLabel, 300));
}

/** Top employees by hours - horizontal bars, one colour (colour does not encode rank). */
function renderEmployeeHoursChart(employees) {
  return renderChart('#employeeHoursChart', {
    series: [{ name: 'Hours', data: employees.map((e) => e.hours) }],
    chart: { type: 'bar', height: 300 },
    colors: [CHART_COLORS.primary],
    plotOptions: { bar: { horizontal: true, barHeight: '58%', borderRadius: 3 } },
    stroke: { width: 0 },
    xaxis: { categories: employees.map((e) => e.name), labels: { formatter: (val) => Math.round(val) + 'h' } },
    yaxis: { labels: { maxWidth: 150, style: { colors: CHART_COLORS.text, fontSize: '12px' } } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { y: { formatter: (val) => val.toLocaleString() + ' hours' } },
  });
}

/** Hours per weekday over the last 12 weeks - GitHub-style heatmap on a single-hue ramp. */
function renderHeatmapChart(days) {
  const today = moment().startOf('day');
  const byWeek = new Map();
  days.forEach((d) => {
    const date = moment(d.day);
    const week = date.clone().isoWeekday(1).format('YYYY-MM-DD');
    if (!byWeek.has(week)) byWeek.set(week, {});
    byWeek.get(week)[date.isoWeekday()] = d.hours;
  });
  const weeks = Array.from(byWeek.keys()).sort().slice(-12);
  const max = Math.max(1, ...days.map((d) => d.hours));
  const step = max / 5;

  // Apex draws the first series at the bottom, so list Sunday first to put Monday on top.
  const weekdays = [7, 6, 5, 4, 3, 2, 1];
  const series = weekdays.map((weekday) => ({
    name: moment().isoWeekday(weekday).format('ddd'),
    data: weeks.map((week) => {
      const date = moment(week).isoWeekday(weekday);
      const value = byWeek.get(week)[weekday];
      return { x: moment(week).format('D MMM'), y: date.isAfter(today) ? -1 : Math.round((value || 0) * 10) / 10, day: date.format('ddd, D MMM') };
    }),
  }));

  const ramp = ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#6366f1', '#4338ca'];
  return renderChart('#activityHeatmap', {
    series,
    chart: { type: 'heatmap', height: 280 },
    plotOptions: {
      heatmap: {
        radius: 4,
        enableShades: false,
        colorScale: {
          ranges: [
            { from: -1, to: -0.5, color: '#ffffff', name: 'Upcoming' },
            { from: 0, to: 0, color: '#f1f5f9', name: 'None' },
            ...ramp.map((color, i) => ({
              from: i === 0 ? 0.01 : step * i,
              to: i === ramp.length - 1 ? max + 1 : step * (i + 1),
              color,
              name: i === ramp.length - 1 ? Math.round(step * i) + 'h+' : Math.round(step * i) + '–' + Math.round(step * (i + 1)) + 'h',
            })),
          ],
        },
      },
    },
    stroke: { width: 3, colors: [CHART_COLORS.surface] },
    legend: { show: true, position: 'bottom', markers: { radius: 3 } },
    xaxis: { labels: { rotate: 0, hideOverlappingLabels: true }, tooltip: { enabled: false } },
    grid: { padding: { top: -16 } },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const point = w.config.series[seriesIndex].data[dataPointIndex];
        const text = point.y < 0 ? 'Upcoming' : point.y + ' h logged';
        return '<div class="fx-apex-tip"><strong>' + point.day + '</strong><span>' + text + '</span></div>';
      },
    },
  });
}

/** Planned vs elapsed days for the most recent projects - horizontal grouped bars. */
function renderProjectTimelineChart(recentProjects) {
  const names = [];
  const plannedDays = [];
  const actualDays = [];
  const dayMs = 1000 * 60 * 60 * 24;

  recentProjects.forEach((project) => {
    const name = project.name || '';
    names.push(name.length > 22 ? name.substring(0, 22) + '…' : name);
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      plannedDays.push(Math.ceil(Math.abs(end - start) / dayMs));
      // Elapsed: from start to today (capped at the planned end) or to completion
      const today = new Date();
      const actualEnd = project.status === 'Completed' ? end : (today > end ? end : today);
      actualDays.push(Math.max(0, Math.ceil((actualEnd - start) / dayMs)));
    } else {
      plannedDays.push(0);
      actualDays.push(0);
    }
  });

  return renderChart('#projectTimelineChart', {
    series: [
      { name: 'Planned', data: plannedDays },
      { name: 'Elapsed', data: actualDays },
    ],
    chart: { type: 'bar', height: 280 },
    colors: [CHART_COLORS.primary, CHART_COLORS.orange],
    plotOptions: { bar: { horizontal: true, barHeight: '70%', borderRadius: 2 } },
    stroke: { show: true, width: 2, colors: [CHART_COLORS.surface] },
    xaxis: { categories: names, labels: { formatter: (val) => Math.round(val) + 'd' } },
    yaxis: { labels: { maxWidth: 140, style: { colors: CHART_COLORS.text, fontSize: '12px' } } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { shared: true, intersect: false, y: { formatter: (val) => val + ' days' } },
  });
}
