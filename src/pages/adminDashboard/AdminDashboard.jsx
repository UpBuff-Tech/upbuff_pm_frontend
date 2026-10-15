import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { CHART_COLORS, renderChart, donutChartOptions, sparklineOptions } from './charts';
import { ChartCard, Delta, KpiCard } from './widgets';
import ProjectAssignments from './ProjectAssignments';
import PeriodFilter from '../../components/PeriodFilter';
import { bucketLabel, bucketTitle, periodInfo, periodPayload, savedPeriod, savePeriod } from '../../lib/dashboardPeriod';

const PERIOD_STORAGE_KEY = 'adminDashboard.period';
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const PROJECT_STATUS_COLORS = [CHART_COLORS.amber, CHART_COLORS.primary, CHART_COLORS.green, CHART_COLORS.slate];
// Order keeps the neutral "On Hold" away from cyan "Testing" (colour-blind separation).
const TASK_STATUSES = ['Pending', 'In Progress', 'Testing', 'Completed', 'On Hold'];
const TASK_STATUS_COLORS = [CHART_COLORS.amber, CHART_COLORS.primary, CHART_COLORS.cyan, CHART_COLORS.green, CHART_COLORS.slate];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const sum = (values) => values.reduce((total, value) => total + (Number(value) || 0), 0);

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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const { user, userId } = useAuth();

  const [projectStats, setProjectStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [employeeHoursData, setEmployeeHoursData] = useState(null);
  const [projectAssignmentsData, setProjectAssignmentsData] = useState(null);
  const [trends, setTrends] = useState(null);       // only its open-tasks-by-priority part (current state)
  const [activity, setActivity] = useState(null);   // projectTasks.getPeriodActivity for the chosen period
  const [periodKey, setPeriodKey] = useState(() => savedPeriod(PERIOD_STORAGE_KEY));
  const [refreshing, setRefreshing] = useState(false);
  const period = periodInfo(periodKey);

  /** The numbers that depend on the chosen period: activity, top contributors, team assignments. */
  const loadPeriodData = (key, done = () => {}) => {
    const payload = periodPayload(key);
    api.call('projectTasks.getPeriodActivity', payload, (err, data) => {
      if (err) console.error('Error fetching period activity:', err);
      setActivity(!err && data ? data : { totals: {}, previous: null, series: [], weekdayHours: [] });
      done();
    });
    api.call('projectTasks.getEmployeeHours', payload, (err, data) => {
      setEmployeeHoursData(!err && data ? data : []);
      done();
    });
    api.call('projectTasks.getProjectAssignments', payload, (error, result) => {
      if (error) console.error('Error fetching project assignments:', error);
      setProjectAssignmentsData(error ? [] : (result || []));
      done();
    });
  };

  const changePeriod = (key) => {
    if (key === periodKey) return;
    setPeriodKey(key);
    savePeriod(PERIOD_STORAGE_KEY, key);
    setActivity(null);
    setEmployeeHoursData(null);
    setProjectAssignmentsData(null);
    loadPeriodData(key);
  };

  const loadAll = () => {
    setRefreshing(true);
    let pending = 6;
    const done = () => {
      pending -= 1;
      if (pending === 0) setRefreshing(false);
    };

    api.call('project.getDashboardStats', (err, stats) => {
      if (!err && stats) setProjectStats(stats);
      done();
    });
    api.call('projectTasks.getDashboardStats', (err, stats) => {
      if (!err && stats) setTaskStats(stats);
      done();
    });
    api.call('projectTasks.getDashboardTrends', (err, data) => {
      if (err) console.error('Error fetching dashboard trends:', err);
      setTrends(!err && data ? data : { weekly: [], daily: [], priority: {} });
      done();
    });
    loadPeriodData(periodKey, done);
  };

  useEffect(() => {
    if (!userId) return;
    loadAll();
  }, [userId]);

  /* ---- Derived numbers ---- */
  const series = (activity && activity.series) || [];
  const totals = (activity && activity.totals) || {};
  const previous = (activity && activity.previous) || null;
  const weekdayHours = (activity && activity.weekdayHours) || [];
  const vsPrevious = 'vs ' + period.prevLabel;

  const ps = projectStats || {};
  const ts = taskStats || {};
  const totalProjects = ps.totalProjects || 0;
  const delayedProjects = ps.delayedProjects || 0;
  const totalTasks = ts.totalTasks || 0;
  const completedTasks = ts.completedTasks || 0;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const trendsLoading = trends === null;
  const activityLoading = activity === null;
  const statsLoading = projectStats === null || taskStats === null;
  const hasHours = series.some((b) => b.hours > 0);
  const hasThroughput = series.some((b) => b.created || b.completed);
  const priority = (trends && trends.priority) || {};
  const hasPriority = PRIORITIES.some((p) => priority[p]);

  /* ---- Charts ---- */

  // KPI sparklines + the period's charts
  useEffect(() => {
    if (!activity) return undefined;
    const bucket = period.bucket;
    const charts = [
      series.length > 1 && renderChart('#kpiHoursSpark', sparklineOptions(series.map((b) => b.hours), CHART_COLORS.primary, 'Hours')),
      series.length > 1 && renderChart('#kpiCompletedSpark', sparklineOptions(series.map((b) => b.completed), CHART_COLORS.green, 'Completed')),
      series.length > 1 && renderChart('#kpiCreatedSpark', sparklineOptions(series.map((b) => b.created), CHART_COLORS.cyan, 'Created')),
      hasThroughput && renderThroughputChart(series, bucket),
      hasHours && renderHoursChart(series, bucket),
      hasHours && renderWeekdayChart(weekdayHours),
    ];
    return () => charts.forEach((chart) => chart && chart.destroy());
  }, [activity]);

  // Open tasks by priority (current state)
  useEffect(() => {
    if (!trends || !hasPriority) return undefined;
    const chart = renderPriorityChart(priority);
    return () => chart && chart.destroy();
  }, [trends]);

  // Charts from the project/task stats
  useEffect(() => {
    if (statsLoading) return undefined;
    const charts = [
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

  return (
    <div className="container-xxl flex-grow-1 container-p-y fx-dashboard">

      {/* Header */}
      <div className="fx-dash-header">
        <div>
          <h4 className="fw-bold mb-1">{greeting()}{firstName ? ', ' + firstName : ''}</h4>
          <p className="text-muted mb-0">Here's how your projects and team are doing — {moment().format('dddd, D MMMM')}</p>
        </div>
        <div className="fx-dash-actions">
          <PeriodFilter value={periodKey} onChange={changePeriod} />
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadAll} disabled={refreshing}>
            <i className={'bx bx-refresh me-1' + (refreshing ? ' bx-spin' : '')}></i>Refresh
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="row g-3 mb-3">
        <KpiCard id="kpiHoursSpark" icon="bx-time-five" tone="primary" label={'Hours logged · ' + period.label.toLowerCase()}
          value={formatHours(totals.hours || 0)} unit="h" loading={activityLoading}>
          <Delta value={previous && changePercent(totals.hours || 0, previous.hours)} suffix={vsPrevious} />
        </KpiCard>
        <KpiCard id="kpiCompletedSpark" icon="bx-check-circle" tone="green" label={'Tasks completed · ' + period.label.toLowerCase()}
          value={totals.completed || 0} loading={activityLoading}>
          <Delta value={previous && changePercent(totals.completed || 0, previous.completed)} suffix={vsPrevious} />
        </KpiCard>
        <KpiCard id="kpiCreatedSpark" icon="bx-plus-circle" tone="cyan" label={'New tasks · ' + period.label.toLowerCase()}
          value={totals.created || 0} loading={activityLoading}>
          <Delta value={previous && changePercent(totals.created || 0, previous.created)} suffix={vsPrevious} />
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

      {/* Throughput + overdue projects */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-8" title="Task throughput" subtitle={'Tasks created vs completed per ' + period.bucket + ' · ' + period.label.toLowerCase()}
          chartId="throughputChart" height={300} loading={activityLoading} empty={!hasThroughput && 'No task activity ' + period.label.toLowerCase()} />
        <ChartCard className="col-xl-4" title="Overdue projects"
          subtitle={delayedProjects ? `Past their end date and not completed · ${delayedProjects} in total` : 'Past their end date and not completed'}
          height={300} loading={statsLoading}
          empty={projectStats && (ps.overdueProjects || []).length === 0 && 'No overdue projects - everything is on schedule'}>
          {!statsLoading && <OverdueProjectList projects={ps.overdueProjects || []} />}
        </ChartCard>
      </div>

      {/* Hours + priority */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-8" title={'Hours logged per ' + period.bucket} subtitle={'All team members · ' + period.label.toLowerCase()}
          chartId="dailyHoursChart" height={280} loading={activityLoading} empty={!hasHours && 'No time logged ' + period.label.toLowerCase()} />
        <ChartCard className="col-xl-4" title="Open tasks by priority" subtitle="Tasks not yet completed · right now"
          chartId="priorityChart" height={280} loading={trendsLoading} empty={!hasPriority && 'No open tasks with a priority'} />
      </div>

      {/* Status + people */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-md-6 col-xl-4" title="Project status" subtitle="All projects · right now" chartId="projectStatusChart" height={300} loading={statsLoading} />
        <ChartCard className="col-md-6 col-xl-4" title="Task status" subtitle="All tasks · right now" chartId="taskStatusChart" height={300} loading={statsLoading} />
        <ChartCard className="col-xl-4" title="Top contributors" subtitle={'Hours logged on tasks · ' + period.label.toLowerCase()}
          chartId="employeeHoursChart" height={300} loading={employeeHoursData === null}
          empty={employeeHoursData && employeeHoursData.length === 0 && 'No hours logged ' + period.label.toLowerCase()} />
      </div>

      {/* Activity + timeline */}
      <div className="row g-3 mb-3">
        <ChartCard className="col-xl-7" title="Work activity" subtitle={'Hours logged by weekday · ' + period.label.toLowerCase()}
          chartId="activityHeatmap" height={280} loading={activityLoading} empty={!hasHours && 'No time logged ' + period.label.toLowerCase()} />
        <ChartCard className="col-xl-5" title="Project timelines" subtitle="Planned vs elapsed days · 10 most recent projects"
          chartId="projectTimelineChart" height={280} loading={statsLoading}
          empty={projectStats && (ps.recentProjects || []).length === 0 && 'No projects yet'} />
      </div>

      {/* Project Team Assignments */}
      <ProjectAssignments assignments={projectAssignmentsData} periodLabel={period.label} />
    </div>
  );
}

/** The most overdue projects: name, client, owner and how many days late. */
function OverdueProjectList({ projects }) {
  const today = moment().startOf('day');
  return (
    <ul className="fx-overdue-list">
      {projects.map((project) => {
        const daysLate = today.diff(moment(project.endDate).startOf('day'), 'days');
        return (
          <li key={project._id} className="fx-overdue-item">
            <div className="fx-overdue-main">
              <div className="fx-overdue-name" title={project.name}>{project.name}</div>
              <div className="fx-overdue-meta">
                {[project.clientName, project.assignedToName].filter(Boolean).join(' · ') || project.status || '-'}
              </div>
            </div>
            <div className="fx-overdue-late">
              <span className={'badge ' + (daysLate > 30 ? 'bg-label-danger' : 'bg-label-warning')}>{daysLate}d late</span>
              <div className="fx-overdue-due">Due {moment(project.endDate).format('D MMM YYYY')}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Chart builders                                                      */
/* ------------------------------------------------------------------ */

/** Created vs completed per bucket of the period - smooth area chart. */
function renderThroughputChart(series, bucket) {
  return renderChart('#throughputChart', {
    series: [
      { name: 'Created', data: series.map((b) => b.created) },
      { name: 'Completed', data: series.map((b) => b.completed) },
    ],
    chart: { type: 'area', height: 300 },
    colors: [CHART_COLORS.primary, CHART_COLORS.cyan],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 95] } },
    markers: { size: series.length === 1 ? 5 : 0, strokeColors: CHART_COLORS.surface, strokeWidth: 2, hover: { size: 5 } },
    xaxis: {
      categories: series.map((b) => bucketLabel(b.key, bucket)),
      tickAmount: Math.min(series.length, 12),
      labels: { rotate: 0, hideOverlappingLabels: true },
      tooltip: { enabled: false },
      crosshairs: { stroke: { color: '#cbd5e1', width: 1, dashArray: 0 } },
    },
    yaxis: { labels: { formatter: (val) => Math.round(val) }, min: 0, forceNiceScale: true },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: {
      shared: true,
      x: { formatter: (val, opts) => bucketTitle(series[opts.dataPointIndex].key, bucket) },
      y: { formatter: (val) => val + ' tasks' },
    },
  });
}

/** Hours logged per bucket of the period - columns with an average line. */
function renderHoursChart(series, bucket) {
  const values = series.map((b) => b.hours);
  const average = values.length ? sum(values) / values.length : 0;
  return renderChart('#dailyHoursChart', {
    series: [{ name: 'Hours logged', data: values }],
    chart: { type: 'bar', height: 280 },
    colors: [CHART_COLORS.primary],
    plotOptions: { bar: { columnWidth: series.length === 1 ? '20%' : '58%', borderRadius: 3 } },
    stroke: { width: 0 },
    xaxis: {
      categories: series.map((b) => bucketLabel(b.key, bucket)),
      tickAmount: Math.min(series.length, 12),
      labels: { rotate: 0, hideOverlappingLabels: true },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { formatter: (val) => Math.round(val) + 'h' } },
    annotations: average > 0 && values.length > 1 ? {
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
      x: { formatter: (val, opts) => bucketTitle(series[opts.dataPointIndex].key, bucket) },
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

/** Hours logged per weekday in the period - columns, Monday first. */
function renderWeekdayChart(weekdayHours) {
  return renderChart('#activityHeatmap', {
    series: [{ name: 'Hours logged', data: WEEKDAYS.map((day, i) => weekdayHours[i] || 0) }],
    chart: { type: 'bar', height: 280 },
    colors: [CHART_COLORS.primary],
    plotOptions: { bar: { columnWidth: '50%', borderRadius: 3 } },
    stroke: { width: 0 },
    xaxis: { categories: WEEKDAYS, tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val) => Math.round(val) + 'h' } },
    tooltip: { y: { formatter: (val) => val.toFixed(1) + ' h' } },
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
