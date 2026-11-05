/**
 * The project summary card of the Gantt chart (name, health, dates, time elapsed vs work done,
 * progress ring and the tasks by status), and the numbers behind it. The client dashboard shows
 * the same card for each of the client's projects.
 *
 *   const items = normalizeTasks(tasks);            // tasks from projectTasks.getByProject
 *   <ProjectSummary project={project} clientName="Fainger" stats={computeStats(items, project)}
 *     hasTasks={items.length > 0} />
 */
import moment from 'moment';
import { colorFor, initialsOf } from '../../components/detailModal/DetailModal';
import './ganttChart.css';

export const STATUSES = [
  { key: 'Pending', cls: 'pending', color: '#f59e0b', icon: 'bx-time-five' },
  { key: 'In Progress', cls: 'inprogress', color: '#4f46e5', icon: 'bx-loader-circle' },
  { key: 'On Hold', cls: 'onhold', color: '#64748b', icon: 'bx-pause-circle' },
  { key: 'Testing', cls: 'testing', color: '#0891b2', icon: 'bx-test-tube' },
  { key: 'Completed', cls: 'completed', color: '#16a34a', icon: 'bx-check-circle' },
];
export const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

const DATE_FORMATS = [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY'];

export function formatDate(date) {
  if (!date) return 'N/A';
  return moment(date).format('MMM DD, YYYY');
}

export function parseDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? moment(value) : moment(value, DATE_FORMATS);
  return parsed.isValid() ? parsed.startOf('day').toDate() : null;
}

export function normalizeTasks(tasks) {
  const today = moment().startOf('day');

  return tasks.map((task, index) => {
    let start = parseDate(task.baselineStart) || parseDate(task.actualStart) || today.toDate();
    let end = parseDate(task.baselineFinish) || parseDate(task.actualFinish);

    if (!end) {
      // Calculate end date from duration
      end = moment(start).add(task.duration || 1, 'days').toDate();
    }

    // Ensure end date is after start date
    if (!moment(end).isAfter(start)) {
      end = moment(start).add(1, 'days').toDate();
    }

    const status = STATUS_BY_KEY[task.status] ? task.status : 'Pending';
    const progress = status === 'Completed' ? 100 : Math.min(100, Math.max(0, Number(task.workCompletion) || 0));

    return {
      id: index + 1,
      taskId: task.taskId,
      name: task.taskName || task.phase || `Task ${index + 1}`,
      phase: (task.phase || '').trim() || 'Unphased',
      owner: task.responsibility || '',
      priority: task.priority || 'Low',
      status,
      start,
      end,
      duration: Math.max(1, moment(end).diff(start, 'days')),
      progress,
      overdue: status !== 'Completed' && moment(end).isBefore(today),
      dependencies: task.dependencies || '',
    };
  });
}

/** Headline numbers for the KPI tiles and the project summary */
export function computeStats(items, project) {
  const today = moment().startOf('day');
  const count = (status) => items.filter((item) => item.status === status).length;
  const totalDays = items.reduce((sum, item) => sum + item.duration, 0);
  const doneDays = items.reduce((sum, item) => sum + item.duration * item.progress / 100, 0);
  const progress = totalDays ? Math.round(doneDays / totalDays * 100) : 0;

  const starts = items.map((item) => item.start.getTime());
  const ends = items.map((item) => item.end.getTime());
  const projectStart = parseDate(project && project.startDate) || (starts.length ? new Date(Math.min(...starts)) : null);
  const projectEnd = parseDate(project && project.endDate) || (ends.length ? new Date(Math.max(...ends)) : null);

  let elapsed = 0;
  if (projectStart && projectEnd && projectEnd > projectStart) {
    elapsed = Math.round(Math.min(1, Math.max(0, today.diff(projectStart) / (projectEnd - projectStart))) * 100);
  }

  const overdue = items.filter((item) => item.overdue).length;
  const dueSoon = items.filter((item) => item.status !== 'Completed' && !item.overdue
    && moment(item.end).diff(today, 'days') <= 7).length;

  let health = { key: 'on-track', label: 'On track', icon: 'bx-trending-up' };
  if (items.length && count('Completed') === items.length) {
    health = { key: 'done', label: 'Completed', icon: 'bx-badge-check' };
  } else if (progress < elapsed - 15 || overdue > items.length * 0.2) {
    health = { key: 'behind', label: 'Behind schedule', icon: 'bx-trending-down' };
  } else if (progress < elapsed - 5 || overdue > 0) {
    health = { key: 'at-risk', label: 'At risk', icon: 'bx-error' };
  }

  return {
    total: items.length,
    byStatus: Object.fromEntries(STATUSES.map((s) => [s.key, count(s.key)])),
    progress,
    elapsed,
    overdue,
    dueSoon,
    health,
    projectStart,
    projectEnd,
    daysLeft: projectEnd ? moment(projectEnd).diff(today, 'days') : null,
  };
}

function ProgressRing({ value, size = 104, stroke = 10 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="gc-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gcRingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} className="gc-ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className="gc-ring-value" strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="gc-ring-label">
        <strong>{value}%</strong>
        <span>complete</span>
      </div>
    </div>
  );
}

/** The summary card; `children` go at its bottom (the client dashboard adds a link there). */
export function ProjectSummary({ project, clientName, stats, hasTasks, children }) {
  return (
    <div className="card gc-hero">
      <div className="gc-hero-main">
        <span className="gc-hero-avatar" style={{ '--c': colorFor(project.name) }}>{initialsOf(project.name)}</span>
        <div className="gc-hero-info">
          <div className="gc-hero-title">
            <h3>{project.name}</h3>
            {hasTasks && (
              <span className={`gc-health h-${stats.health.key}`}><i className={`bx ${stats.health.icon}`}></i>{stats.health.label}</span>
            )}
          </div>
          <div className="gc-hero-meta">
            <span><i className="bx bx-buildings"></i>{clientName || 'No client'}</span>
            <span><i className="bx bx-calendar"></i>{formatDate(stats.projectStart)} – {formatDate(stats.projectEnd)}</span>
            {stats.daysLeft !== null && (
              <span className={stats.daysLeft < 0 ? 'is-late' : ''}>
                <i className="bx bx-hourglass"></i>
                {stats.daysLeft < 0 ? `${-stats.daysLeft} days past end` : `${stats.daysLeft} days left`}
              </span>
            )}
          </div>

          <div className="gc-compare">
            <div className="gc-compare-row">
              <span>Time elapsed</span>
              <div className="gc-compare-bar t-time"><span style={{ width: `${stats.elapsed}%` }}></span></div>
              <b>{stats.elapsed}%</b>
            </div>
            <div className="gc-compare-row">
              <span>Work done</span>
              <div className="gc-compare-bar t-work"><span style={{ width: `${stats.progress}%` }}></span></div>
              <b>{stats.progress}%</b>
            </div>
          </div>
        </div>
        <ProgressRing value={stats.progress} />
      </div>

      {hasTasks && (
        <div className="gc-distribution">
          <div className="gc-stack">
            {STATUSES.filter((s) => stats.byStatus[s.key]).map((s) => (
              <span
                key={s.key}
                style={{ width: `${stats.byStatus[s.key] / stats.total * 100}%`, background: s.color }}
                title={`${s.key}: ${stats.byStatus[s.key]}`}
              ></span>
            ))}
          </div>
          <div className="gc-stack-legend">
            {STATUSES.map((s) => (
              <span key={s.key}><i style={{ background: s.color }}></i>{s.key}<b>{stats.byStatus[s.key]}</b></span>
            ))}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
