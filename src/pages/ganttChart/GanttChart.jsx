/**
 * @author Visakh
 * Gantt Chart Page for Project Task Visualization
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { colorFor, initialsOf } from '../../components/detailModal/DetailModal';
import { exportRowsToExcel, toFileNameSlug } from '../../lib/tableExport';

// Import dhtmlxGantt CSS and JS
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';
import { GanttSkeleton } from '../../components/skeleton/Skeleton';
import './ganttChart.css';

const STATUSES = [
  { key: 'Pending', cls: 'pending', color: '#f59e0b', icon: 'bx-time-five' },
  { key: 'In Progress', cls: 'inprogress', color: '#4f46e5', icon: 'bx-loader-circle' },
  { key: 'On Hold', cls: 'onhold', color: '#64748b', icon: 'bx-pause-circle' },
  { key: 'Testing', cls: 'testing', color: '#0891b2', icon: 'bx-test-tube' },
  { key: 'Completed', cls: 'completed', color: '#16a34a', icon: 'bx-check-circle' },
];
const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
const statusOf = (key) => STATUS_BY_KEY[key] || STATUS_BY_KEY.Pending;

const ZOOM_LEVELS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
];

const DATE_FORMATS = [moment.ISO_8601, 'YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY'];
const ROW_HEIGHT = 42;

function formatDate(date) {
  if (!date) return 'N/A';
  return moment(date).format('MMM DD, YYYY');
}

function parseDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? moment(value) : moment(value, DATE_FORMATS);
  return parsed.isValid() ? parsed.startOf('day').toDate() : null;
}

/** Task names and owners go into gantt's HTML templates, so escape them. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Initialize or reinitialize Select2 on the project dropdown
 */
function initSelect2(preserveValue = null) {
  const $select = $('#projectSelect');

  // Destroy existing Select2 if present
  if ($select.data('select2')) {
    $select.select2('destroy');
  }

  // Initialize Select2
  $select.select2({
    placeholder: 'Select a project',
    allowClear: true,
    width: '100%'
  });

  // Restore previous value if provided
  if (preserveValue) {
    $select.val(preserveValue).trigger('change.select2');
  }
}

/**
 * Turn the server's project tasks into one clean shape the page and the chart both use
 */
function normalizeTasks(tasks) {
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
function computeStats(items, project) {
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

/** Progress per phase, in the order the phases first appear */
function computePhases(items) {
  const phases = new Map();
  items.forEach((item) => {
    if (!phases.has(item.phase)) phases.set(item.phase, []);
    phases.get(item.phase).push(item);
  });

  return [...phases.entries()].map(([name, list]) => {
    const totalDays = list.reduce((sum, item) => sum + item.duration, 0);
    const doneDays = list.reduce((sum, item) => sum + item.duration * item.progress / 100, 0);
    return {
      name,
      total: list.length,
      completed: list.filter((item) => item.status === 'Completed').length,
      overdue: list.filter((item) => item.overdue).length,
      progress: totalDays ? Math.round(doneDays / totalDays * 100) : 0,
      start: new Date(Math.min(...list.map((item) => item.start.getTime()))),
      end: new Date(Math.max(...list.map((item) => item.end.getTime()))),
    };
  });
}

/**
 * Convert the visible tasks to Gantt chart format (optionally grouped under their phase)
 */
function buildGanttData(items, groupByPhase) {
  const data = [];
  const visibleIds = new Set(items.map((item) => item.id));

  if (groupByPhase) {
    computePhases(items).forEach((phase, index) => {
      data.push({
        id: `phase-${index}`,
        text: phase.name,
        type: 'project',
        open: true,
        progress: phase.progress / 100,
        bar_height: 10,
        $phaseInfo: phase,
      });
      items.filter((item) => item.phase === phase.name).forEach((item) => {
        data.push(toGanttTask(item, `phase-${index}`));
      });
    });
  } else {
    items.forEach((item) => data.push(toGanttTask(item, 0)));
  }

  // Parse dependencies for links (only between tasks that are on screen)
  const links = [];
  items.forEach((item) => {
    if (!item.dependencies || !item.dependencies.trim()) return;
    item.dependencies.split(',').map((dep) => dep.trim()).forEach((depId) => {
      const source = items.find((other) => other.taskId === depId);
      if (source && visibleIds.has(source.id)) {
        links.push({ id: links.length + 1, source: source.id, target: item.id, type: '0' }); // finish-to-start
      }
    });
  });

  return { data, links };
}

function toGanttTask(item, parent) {
  return {
    id: item.id,
    text: item.name,
    start_date: item.start,
    end_date: item.end,
    progress: item.progress / 100,
    parent,
    $item: item,
  };
}

/* ---------------------------------------------------------------------------
   Gantt configuration
   ------------------------------------------------------------------------- */

const shortDate = gantt.date.date_to_str('%d %M');

function ownerAvatar(owner, size = '') {
  if (!owner) return '<span class="gc-avatar is-empty" title="Unassigned">–</span>';
  return `<span class="gc-avatar ${size}" style="--c:${colorFor(owner)}" title="${esc(owner)}">${esc(initialsOf(owner))}</span>`;
}

function statusPill(status) {
  return `<span class="gc-pill s-${statusOf(status).cls}">${esc(status)}</span>`;
}

function buildColumns(compact) {
  const name = {
    name: 'text', label: 'Task', tree: true, width: compact ? 200 : 240, min_width: 160,
    template: (task) => {
      if (task.$phaseInfo) {
        const info = task.$phaseInfo;
        return `<span class="gc-phase-name">${esc(task.text)}</span><span class="gc-phase-count">${info.completed}/${info.total}</span>`;
      }
      const item = task.$item;
      return `<span class="gc-prio p-${esc(item.priority.toLowerCase())}" title="${esc(item.priority)} priority"></span>`
        + `<span class="gc-task-name${item.overdue ? ' is-overdue' : ''}">${esc(task.text)}</span>`;
    },
  };
  const status = {
    name: 'status', label: 'Status', align: 'center', width: 104,
    template: (task) => (task.$item ? statusPill(task.$item.status) : ''),
  };
  if (compact) return [name, status];

  return [
    name,
    {
      name: 'owner', label: 'Owner', align: 'center', width: 58,
      template: (task) => (task.$item ? ownerAvatar(task.$item.owner) : ''),
    },
    {
      name: 'start_date', label: 'Start', align: 'center', width: 70,
      template: (task) => shortDate(task.start_date),
    },
    {
      name: 'progress', label: 'Progress', align: 'center', width: 96,
      template: (task) => {
        const pct = Math.round((task.progress || 0) * 100);
        return `<div class="gc-meter"><span style="width:${pct}%"></span></div><span class="gc-meter-text">${pct}%</span>`;
      },
    },
    status,
  ];
}

/**
 * Configure Gantt chart settings
 */
function configureGantt() {
  gantt.plugins({ marker: true, tooltip: true });

  gantt.config.date_format = '%d-%m-%Y';
  gantt.config.readonly = true; // nothing on this page saves back to the project
  gantt.config.fit_tasks = true;
  gantt.config.show_errors = false;
  gantt.config.row_height = ROW_HEIGHT;
  gantt.config.bar_height = 24;
  gantt.config.scale_height = 56;
  gantt.config.link_radius = 4;
  gantt.config.open_tree_initially = true;
  gantt.config.show_tasks_outside_timescale = true;
  gantt.config.tooltip_timeout = 120;
  gantt.config.tooltip_offset_x = 12;
  gantt.config.tooltip_offset_y = 18;

  const compact = window.innerWidth < 768;
  gantt.config.columns = buildColumns(compact);
  gantt.config.grid_width = gantt.config.columns.reduce((sum, column) => sum + column.width, 0);

  const today = moment().startOf('day');

  gantt.templates.task_class = (_start, _end, task) => {
    if (task.$phaseInfo) return 'gc-bar-phase';
    const item = task.$item;
    return `gc-bar s-${statusOf(item.status).cls}${item.overdue ? ' is-overdue' : ''}`;
  };

  gantt.templates.grid_row_class = (_start, _end, task) => (task.$phaseInfo ? 'gc-row-phase' : '');
  gantt.templates.task_row_class = (_start, _end, task) => (task.$phaseInfo ? 'gc-row-phase' : '');

  gantt.templates.task_text = (_start, _end, task) => (task.$phaseInfo ? '' : esc(task.text));

  gantt.templates.rightside_text = (_start, _end, task) => {
    if (task.$phaseInfo) return `<span class="gc-side-phase">${task.$phaseInfo.progress}%</span>`;
    const item = task.$item;
    const late = item.overdue ? `<span class="gc-side-late"><i class="bx bx-error-circle"></i>${today.diff(item.end, 'days')}d late</span>` : '';
    return `<span class="gc-side">${ownerAvatar(item.owner, 'is-sm')}<span>${item.progress}%</span>${late}</span>`;
  };

  // Shade weekends and today's column
  gantt.templates.timeline_cell_class = (_task, date) => {
    if (!gantt.config.scales || gantt.config.scales[gantt.config.scales.length - 1].unit !== 'day') return '';
    if (moment(date).isSame(today, 'day')) return 'gc-cell-today';
    return date.getDay() === 0 || date.getDay() === 6 ? 'gc-cell-weekend' : '';
  };

  gantt.templates.tooltip_text = (_start, _end, task) => {
    if (task.$phaseInfo) {
      const info = task.$phaseInfo;
      return `<div class="gc-tip">
        <div class="gc-tip-title">${esc(info.name)}</div>
        <div class="gc-tip-sub">Phase · ${info.total} tasks</div>
        <div class="gc-tip-grid">
          <span>Dates</span><b>${formatDate(info.start)} – ${formatDate(info.end)}</b>
          <span>Done</span><b>${info.completed} of ${info.total}</b>
          <span>Progress</span><b>${info.progress}%</b>
        </div></div>`;
    }
    const item = task.$item;
    return `<div class="gc-tip">
      <div class="gc-tip-head">${statusPill(item.status)}${item.overdue ? '<span class="gc-pill s-late">Overdue</span>' : ''}</div>
      <div class="gc-tip-title">${esc(item.name)}</div>
      <div class="gc-tip-sub">${esc(item.phase)}${item.taskId ? ' · ' + esc(item.taskId) : ''}</div>
      <div class="gc-tip-grid">
        <span>Owner</span><b>${item.owner ? esc(item.owner) : 'Unassigned'}</b>
        <span>Dates</span><b>${formatDate(item.start)} – ${formatDate(item.end)}</b>
        <span>Duration</span><b>${item.duration} day${item.duration === 1 ? '' : 's'}</b>
        <span>Priority</span><b>${esc(item.priority)}</b>
      </div>
      <div class="gc-tip-progress"><div class="gc-meter"><span style="width:${item.progress}%"></span></div><b>${item.progress}%</b></div>
    </div>`;
  };
}

/**
 * Set Gantt zoom level
 */
function applyZoom(scale) {
  const monthYear = gantt.date.date_to_str('%F %Y');
  switch (scale) {
    case 'day':
      gantt.config.min_column_width = 44;
      gantt.config.scales = [
        { unit: 'month', step: 1, format: monthYear },
        { unit: 'day', step: 1, format: '%D %d' },
      ];
      break;
    case 'month':
      gantt.config.min_column_width = 64;
      gantt.config.scales = [
        { unit: 'month', step: 1, format: monthYear },
        { unit: 'week', step: 1, format: (date) => 'Wk ' + gantt.date.date_to_str('%W')(date) },
      ];
      break;
    case 'quarter':
      gantt.config.min_column_width = 80;
      gantt.config.scales = [
        { unit: 'quarter', step: 1, format: (date) => `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}` },
        { unit: 'month', step: 1, format: '%M' },
      ];
      break;
    default: // week
      gantt.config.min_column_width = 34;
      gantt.config.scales = [
        { unit: 'week', step: 1, format: (date) => `${shortDate(date)} – ${shortDate(gantt.date.add(date, 6, 'day'))}` },
        { unit: 'day', step: 1, format: '%d' },
      ];
  }
}

/** The zoom level that shows the whole project without much scrolling */
function bestZoomFor(items) {
  if (!items.length) return 'week';
  const start = Math.min(...items.map((item) => item.start.getTime()));
  const end = Math.max(...items.map((item) => item.end.getTime()));
  const days = moment(end).diff(start, 'days');
  if (days <= 21) return 'day';
  if (days <= 100) return 'week';
  if (days <= 365) return 'month';
  return 'quarter';
}

/* ---------------------------------------------------------------------------
   Small presentational pieces
   ------------------------------------------------------------------------- */

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

function KpiTile({ tone, icon, label, value, caption }) {
  return (
    <div className={`gc-kpi tone-${tone}`}>
      <span className="gc-kpi-icon"><i className={`bx ${icon}`}></i></span>
      <div className="gc-kpi-body">
        <span className="gc-kpi-label">{label}</span>
        <strong className="gc-kpi-value">{value}</strong>
        {caption && <span className="gc-kpi-caption">{caption}</span>}
      </div>
    </div>
  );
}

// The container the gantt was last initialised in (React draws a new one when the page is opened again).
let lastGanttContainer = null;

export default function GanttChart() {
  const { user } = useAuth();
  const currentUserId = user ? user._id : null;

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [items, setItems] = useState([]);
  const [zoomScale, setZoomScale] = useState('week');
  const [search, setSearch] = useState('');
  const [hiddenStatuses, setHiddenStatuses] = useState([]);
  const [groupByPhase, setGroupByPhase] = useState(true);
  const [allOpen, setAllOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const projectListRef = useRef([]);
  const scrollPending = useRef(false);
  const pageClosed = useRef(false);
  const timers = useRef([]);

  projectListRef.current = projectList;

  // setTimeout that is cancelled when the page is closed
  const later = (callback, delay) => {
    timers.current.push(setTimeout(callback, delay));
  };

  const stats = useMemo(() => computeStats(items, currentProject), [items, currentProject]);
  const phases = useMemo(() => computePhases(items), [items]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => !hiddenStatuses.includes(item.status)
      && (!term || [item.name, item.phase, item.owner, item.taskId].some((v) => (v || '').toLowerCase().includes(term))));
  }, [items, search, hiddenStatuses]);

  const ganttData = useMemo(() => buildGanttData(visibleItems, groupByPhase), [visibleItems, groupByPhase]);

  const attention = useMemo(() => {
    const today = moment().startOf('day');
    return items
      .filter((item) => item.overdue || (item.status !== 'Completed' && moment(item.end).diff(today, 'days') <= 14))
      .sort((a, b) => a.end - b.end)
      .slice(0, 6);
  }, [items]);

  /**
   * Load project tasks and render Gantt chart
   */
  const loadProjectTasks = (project) => {
    setLoadingTasks(true);

    api.call('projectTasks.getByProject', project._id, (error, tasks) => {
      if (pageClosed.current) return;
      setLoadingTasks(false);

      if (error) {
        console.error('Error loading tasks:', error);
        toastr.error('Failed to load project tasks');
        return;
      }

      const normalized = normalizeTasks(tasks || []);
      scrollPending.current = true;
      setZoomScale(bestZoomFor(normalized));
      setItems(normalized);

      if (!normalized.length) {
        toastr.info('No tasks found for this project');
      }
    });
  };

  const openProject = (project) => {
    setCurrentProject(project);
    setSearch('');
    setHiddenStatuses([]);
    loadProjectTasks(project);
  };

  // Helper function to enrich projects with client names
  const enrichProjectsWithClientNames = (projects) => {
    if (!projects || projects.length === 0) return projects;

    // Collect all unique client IDs
    const clientIds = [...new Set(projects
      .filter(p => p.companyName)
      .map(p => p.companyName))];

    if (clientIds.length === 0) return projects;

    // Track pending requests
    let pendingRequests = clientIds.length;
    const clientMap = {};

    // Fetch all client names and batch update
    clientIds.forEach(clientId => {
      api.call('clients.getById', clientId, (error, client) => {
        pendingRequests--;

        if (!error && client) {
          clientMap[clientId] = client.name;
        }

        // Only update once all requests are complete
        if (pendingRequests === 0 && !pageClosed.current) {
          const withName = (project) => (project && project.companyName && clientMap[project.companyName]
            ? { ...project, companyDisplayName: clientMap[project.companyName] }
            : project);
          setProjectList(projects.map(withName));
          setCurrentProject((current) => withName(current));
        }
      });
    });

    return projects;
  };

  // The projects came back from the server: show them and open the last one
  const showProjects = (projects) => {
    if (projects && projects.length > 0) {
      // Enrich projects with client names
      const enrichedProjects = enrichProjectsWithClientNames(projects);
      setProjectList(enrichedProjects);

      // Auto-load the last (most recent) project
      openProject(enrichedProjects[enrichedProjects.length - 1]);
    } else {
      toastr.info('No projects available');
    }
  };

  // Select2 + Gantt configuration (once), and the clean up when the page is closed
  useEffect(() => {
    pageClosed.current = false;

    initSelect2();
    configureGantt();

    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === boardRef.current);
      later(() => gantt.setSizes(), 60);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      pageClosed.current = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      document.removeEventListener('fullscreenchange', onFullscreenChange);

      // Clean up Select2
      if ($('#projectSelect').data('select2')) {
        $('#projectSelect').off('change.gantt').select2('destroy');
      }

      // Clean up gantt instance
      gantt.clearAll();
    };
  }, []);

  // Load projects based on user type (as soon as the logged-in user is known)
  useEffect(() => {
    if (!user) return;

    // Check if user is a client
    const isClient = user.profile && user.profile.role === 'client';

    setLoadingProjects(true);

    if (isClient) {
      // For client users, load only their projects
      api.call('project.getByClient', (error, projects) => {
        setLoadingProjects(false);
        if (error) {
          console.error('Error loading client projects:', error);
          toastr.error('Failed to load projects');
          return;
        }

        showProjects(projects);
      });
    } else {
      // For admin users, load all projects
      api.call('project.getList', { page: 1, perPage: 1000 }, (error, result) => {
        setLoadingProjects(false);
        if (error) {
          console.error('Error loading projects:', error);
          toastr.error('Failed to load projects');
          return;
        }

        showProjects(result && result.data);
      });
    }
  }, [currentUserId]);

  // Watch for projectList changes and refresh Select2 (the new options are on the page by now).
  // Picking a project opens it straight away.
  useEffect(() => {
    if (!projectList || projectList.length === 0) return;
    initSelect2($('#projectSelect').val());
    $('#projectSelect').off('change.gantt').on('change.gantt', (event) => {
      const project = projectListRef.current.find((p) => p._id === event.target.value);
      if (project) openProject(project);
    });
  }, [projectList]);

  // Keep the dropdown showing the open project
  const currentProjectId = currentProject ? currentProject._id : null;
  useEffect(() => {
    if (currentProjectId && $('#projectSelect').val() !== currentProjectId) {
      $('#projectSelect').val(currentProjectId).trigger('change.select2');
    }
  }, [currentProjectId, projectList]);

  // Draw the chart whenever the visible tasks change
  const hasChart = Boolean(currentProject) && items.length > 0;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (lastGanttContainer !== container) {
        gantt.init(container);
        lastGanttContainer = container;
      }

      applyZoom(zoomScale);
      gantt.clearAll();
      gantt.parse(ganttData);
      gantt.addMarker({ start_date: new Date(), css: 'gc-today', text: 'Today', title: formatDate(new Date()) });
      gantt.setSizes();
      setAllOpen(true);

      if (scrollPending.current) {
        scrollPending.current = false;
        const inRange = stats.projectStart && stats.projectEnd && moment().isBetween(stats.projectStart, stats.projectEnd);
        const firstStart = visibleItems.length ? new Date(Math.min(...visibleItems.map((item) => item.start.getTime()))) : new Date();
        gantt.showDate(inRange ? new Date() : firstStart);
      }
    } catch (error) {
      console.error('Error rendering gantt:', error);
      toastr.error('Failed to render Gantt chart: ' + error.message);
    }
  }, [ganttData, hasChart]);

  /**
   * Change zoom scale
   */
  const handleZoomScale = (scale) => {
    setZoomScale(scale);
    if (!lastGanttContainer) return;
    applyZoom(scale);
    gantt.render();
  };

  const handleToday = () => {
    gantt.showDate(new Date());
  };

  const handleToggleAll = () => {
    const open = !allOpen;
    gantt.batchUpdate(() => {
      gantt.eachTask((task) => {
        if (task.$phaseInfo) {
          if (open) gantt.open(task.id);
          else gantt.close(task.id);
        }
      });
    });
    setAllOpen(open);
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (boardRef.current && boardRef.current.requestFullscreen) {
      boardRef.current.requestFullscreen();
    }
  };

  const toggleStatus = (status) => {
    setHiddenStatuses((hidden) => (hidden.includes(status) ? hidden.filter((s) => s !== status) : [...hidden, status]));
  };

  /**
   * Export the tasks to Excel
   */
  const handleExport = () => {
    if (!items.length) {
      toastr.info('There are no tasks to export');
      return;
    }
    const columns = [
      { header: 'Task ID', value: (item) => item.taskId },
      { header: 'Task', value: (item) => item.name },
      { header: 'Phase', value: (item) => item.phase },
      { header: 'Owner', value: (item) => item.owner },
      { header: 'Priority', value: (item) => item.priority },
      { header: 'Status', value: (item) => item.status },
      { header: 'Start', value: (item) => formatDate(item.start) },
      { header: 'End', value: (item) => formatDate(item.end) },
      { header: 'Duration (days)', value: (item) => item.duration },
      { header: 'Progress (%)', value: (item) => item.progress },
      { header: 'Overdue', value: (item) => (item.overdue ? 'Yes' : 'No') },
      { header: 'Depends on', value: (item) => item.dependencies },
    ];
    exportRowsToExcel(columns, visibleItems, {
      fileName: `${toFileNameSlug(currentProject.name, 'project')}_timeline`,
      sheetName: 'Timeline',
    }).catch(() => toastr.error('Export failed'));
  };

  const ganttRows = ganttData.data.length;
  const canvasHeight = Math.min(680, Math.max(320, ganttRows * ROW_HEIGHT + 56 + 20));
  const projectColor = currentProject ? colorFor(currentProject.name) : null;

  return (
    <div className="container-xxl flex-grow-1 container-p-y gc-page">
      {/* Page Header */}
      <div className="gc-header">
        <div>
          <span className="gc-eyebrow"><i className="bx bx-git-branch"></i> Project timeline</span>
          <h4 className="gc-title">Gantt Chart</h4>
          <p className="gc-subtitle">Plan, track and spot schedule risks across every phase.</p>
        </div>
        <div className="gc-header-actions">
          <div className="gc-project-picker">
            <i className="bx bx-briefcase-alt-2"></i>
            <select className="form-select select2" id="projectSelect" name="projectSelect" defaultValue="">
              <option value="">Choose a project...</option>
              {projectList.map((project) => (
                <option key={project._id} value={project._id}>{project.name}{project.companyDisplayName ? ` - ${project.companyDisplayName}` : ''}</option>
              ))}
            </select>
          </div>
          {currentProject && (
            <>
              <button type="button" className="btn btn-outline-secondary gc-icon-btn" title="Reload" onClick={() => openProject(currentProject)}>
                <i className="bx bx-refresh"></i>
              </button>
              <button type="button" className="btn btn-primary" onClick={handleExport}>
                <i className="bx bx-download me-1"></i> Export
              </button>
            </>
          )}
        </div>
      </div>

      {loadingProjects && !currentProject ? (
        <div className="card"><div className="card-body"><GanttSkeleton /></div></div>
      ) : !currentProject ? (
        <div className="card gc-empty">
          <div className="gc-empty-art"><i className="bx bx-bar-chart-alt-2"></i></div>
          <h5>No project selected</h5>
          <p>Pick a project above to see its timeline, progress and risks.</p>
        </div>
      ) : (
        <>
          {/* Project summary */}
          <div className="card gc-hero">
            <div className="gc-hero-main">
              <span className="gc-hero-avatar" style={{ '--c': projectColor }}>{initialsOf(currentProject.name)}</span>
              <div className="gc-hero-info">
                <div className="gc-hero-title">
                  <h3>{currentProject.name}</h3>
                  {items.length > 0 && (
                    <span className={`gc-health h-${stats.health.key}`}><i className={`bx ${stats.health.icon}`}></i>{stats.health.label}</span>
                  )}
                </div>
                <div className="gc-hero-meta">
                  <span><i className="bx bx-buildings"></i>{currentProject.companyDisplayName || 'No client'}</span>
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

            {items.length > 0 && (
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
          </div>

          {/* KPI tiles */}
          <div className="gc-kpis">
            <KpiTile tone="indigo" icon="bx-list-check" label="Total tasks" value={stats.total} caption={`${phases.length} phase${phases.length === 1 ? '' : 's'}`} />
            <KpiTile tone="violet" icon="bx-loader-circle" label="In progress" value={stats.byStatus['In Progress']} caption={`${stats.byStatus.Testing} in testing`} />
            <KpiTile tone="green" icon="bx-check-double" label="Completed" value={stats.byStatus.Completed}
              caption={stats.total ? `${Math.round(stats.byStatus.Completed / stats.total * 100)}% of tasks` : '—'} />
            <KpiTile tone="red" icon="bx-error-circle" label="Overdue" value={stats.overdue} caption={stats.overdue ? 'Need attention' : 'All on schedule'} />
            <KpiTile tone="amber" icon="bx-calendar-exclamation" label="Due in 7 days" value={stats.dueSoon} caption="Upcoming deadlines" />
          </div>

          {/* Timeline board */}
          <div className={'card gc-board' + (isFullscreen ? ' is-fullscreen' : '')} ref={boardRef}>
            <div className="gc-toolbar">
              <div className="gc-toolbar-left">
                <div className="gc-search">
                  <i className="bx bx-search"></i>
                  <input
                    type="search"
                    placeholder="Search tasks, phases, owners…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="gc-chips">
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={'gc-chip' + (hiddenStatuses.includes(s.key) ? ' is-off' : '')}
                      style={{ '--c': s.color }}
                      onClick={() => toggleStatus(s.key)}
                      title={hiddenStatuses.includes(s.key) ? `Show ${s.key}` : `Hide ${s.key}`}
                    >
                      <i className="gc-chip-dot"></i>{s.key}<b>{stats.byStatus[s.key]}</b>
                    </button>
                  ))}
                </div>
              </div>

              <div className="gc-toolbar-right">
                <label className="gc-switch" title="Group tasks under their phase">
                  <input type="checkbox" checked={groupByPhase} onChange={(event) => setGroupByPhase(event.target.checked)} />
                  <span className="gc-switch-track"></span>
                  Phases
                </label>
                <div className="gc-segmented" role="group">
                  {ZOOM_LEVELS.map((level) => (
                    <button
                      key={level.key}
                      type="button"
                      className={zoomScale === level.key ? 'is-active' : ''}
                      onClick={() => handleZoomScale(level.key)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="gc-tool" title="Fit the whole project" onClick={() => handleZoomScale(bestZoomFor(visibleItems))}>
                  <i className="bx bx-move-horizontal"></i>
                </button>
                <button type="button" className="gc-tool" title="Jump to today" onClick={handleToday}>
                  <i className="bx bx-target-lock"></i>
                </button>
                {groupByPhase && (
                  <button type="button" className="gc-tool" title={allOpen ? 'Collapse phases' : 'Expand phases'} onClick={handleToggleAll}>
                    <i className={`bx ${allOpen ? 'bx-collapse' : 'bx-expand'}`}></i>
                  </button>
                )}
                <button type="button" className="gc-tool" title={isFullscreen ? 'Exit full screen' : 'Full screen'} onClick={handleFullscreen}>
                  <i className={`bx ${isFullscreen ? 'bx-exit-fullscreen' : 'bx-fullscreen'}`}></i>
                </button>
              </div>
            </div>

            <div className="gc-canvas-wrap">
              {items.length > 0 ? (
                <div
                  ref={containerRef}
                  className="gc-canvas"
                  style={{ height: isFullscreen ? undefined : canvasHeight }}
                ></div>
              ) : !loadingTasks && (
                <div className="gc-empty is-inline">
                  <div className="gc-empty-art"><i className="bx bx-task"></i></div>
                  <h5>No tasks yet</h5>
                  <p>This project has no tasks to plot. Add tasks to the project to build its timeline.</p>
                </div>
              )}
              {items.length > 0 && visibleItems.length === 0 && (
                <div className="gc-no-match">
                  <i className="bx bx-filter-alt"></i> No tasks match your filters.
                  <button type="button" onClick={() => { setSearch(''); setHiddenStatuses([]); }}>Clear filters</button>
                </div>
              )}
              {loadingTasks && (
                <div className="gc-loading"><GanttSkeleton /></div>
              )}
            </div>
          </div>

          {/* Phases + attention */}
          {items.length > 0 && (
            <div className="row g-3 mt-0">
              <div className="col-lg-7">
                <div className="card h-100 gc-panel">
                  <div className="gc-panel-head">
                    <h6><i className="bx bx-layer"></i> Phase progress</h6>
                    <span>{phases.length} phase{phases.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="gc-phases">
                    {phases.map((phase) => (
                      <div key={phase.name} className="gc-phase">
                        <div className="gc-phase-top">
                          <strong title={phase.name}>{phase.name}</strong>
                          <span className="gc-phase-dates">{shortDate(phase.start)} – {shortDate(phase.end)}</span>
                        </div>
                        <div className="gc-phase-bar">
                          <span style={{ width: `${phase.progress}%` }} className={phase.progress === 100 ? 'is-done' : ''}></span>
                        </div>
                        <div className="gc-phase-foot">
                          <span>{phase.completed}/{phase.total} tasks done</span>
                          {phase.overdue > 0 && <span className="gc-late-tag">{phase.overdue} overdue</span>}
                          <b>{phase.progress}%</b>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="card h-100 gc-panel">
                  <div className="gc-panel-head">
                    <h6><i className="bx bx-bell"></i> Needs attention</h6>
                    <span>Overdue &amp; due in 14 days</span>
                  </div>
                  {attention.length ? (
                    <ul className="gc-attention">
                      {attention.map((item) => {
                        const days = moment(item.end).diff(moment().startOf('day'), 'days');
                        return (
                          <li key={item.id}>
                            <span className="gc-avatar" style={{ '--c': colorFor(item.owner || '?') }} title={item.owner || 'Unassigned'}>
                              {item.owner ? initialsOf(item.owner) : '–'}
                            </span>
                            <div className="gc-attention-text">
                              <strong title={item.name}>{item.name}</strong>
                              <span>{item.phase} · <span className={`gc-status-text s-${statusOf(item.status).cls}`}>{item.status}</span></span>
                            </div>
                            <span className={'gc-due' + (item.overdue ? ' is-late' : days <= 3 ? ' is-soon' : '')}>
                              {item.overdue ? `${-days}d late` : days === 0 ? 'Today' : `in ${days}d`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="gc-all-clear">
                      <i className="bx bx-happy-beaming"></i>
                      <strong>All clear</strong>
                      <span>Nothing overdue or due in the next two weeks.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
