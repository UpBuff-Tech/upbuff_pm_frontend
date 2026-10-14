/**
 * @author Visakh
 * Gantt Chart Page for Project Task Visualization
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

// Import dhtmlxGantt CSS and JS
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';
import { GanttSkeleton } from '../../components/skeleton/Skeleton';

function formatDate(date) {
  if (!date) return 'N/A';
  return moment(date).format('MMM DD, YYYY');
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
 * Configure Gantt chart settings
 */
function configureGantt() {
  // Configure gantt settings
  gantt.config.date_format = '%d-%m-%Y';
  gantt.config.xml_date = '%d-%m-%Y';
  gantt.config.scale_unit = 'week';
  gantt.config.step = 1;
  gantt.config.date_scale = 'Week %W';
  gantt.config.subscales = [
    { unit: 'day', step: 1, date: '%d %M' }
  ];

  // Enable features
  gantt.config.auto_scheduling = false;
  gantt.config.auto_scheduling_strict = false;
  gantt.config.fit_tasks = true;
  gantt.config.show_errors = true;

  // Configure columns
  gantt.config.columns = [
    { name: 'text', label: 'Task Name', tree: true, width: 250 },
    { name: 'start_date', label: 'Start Date', align: 'center', width: 100 },
    { name: 'duration', label: 'Duration', align: 'center', width: 80 },
    { name: 'status', label: 'Status', align: 'center', width: 100 }
  ];

  // Configure task colors based on status
  gantt.templates.task_class = function (_start, _end, task) {
    switch (task.status) {
      case 'Pending': return 'gantt-task-pending';
      case 'In Progress': return 'gantt-task-inprogress';
      case 'On Hold': return 'gantt-task-onhold';
      case 'Testing': return 'gantt-task-testing';
      case 'Completed': return 'gantt-task-completed';
      default: return '';
    }
  };

  // Task text template
  gantt.templates.task_text = function (_start, _end, task) {
    return task.text;
  };

  // Right side text template
  gantt.templates.rightside_text = function (_start, _end, task) {
    return task.status || '';
  };

  // Add custom CSS for task colors
  addGanttStyles();
}

/**
 * Add custom styles for Gantt tasks
 */
function addGanttStyles() {
  if (!document.getElementById('gantt-custom-styles')) {
    const style = document.createElement('style');
    style.id = 'gantt-custom-styles';
    style.innerHTML = `
      .gantt-task-pending .gantt_task_progress { background-color: #ffc107; }
      .gantt-task-pending .gantt_task_line { background-color: #ffc107; border-color: #e0a800; }

      .gantt-task-inprogress .gantt_task_progress { background-color: #4f46e5; }
      .gantt-task-inprogress .gantt_task_line { background-color: #4f46e5; border-color: #4338ca; }

      .gantt-task-onhold .gantt_task_progress { background-color: #6c757d; }
      .gantt-task-onhold .gantt_task_line { background-color: #6c757d; border-color: #5a6268; }

      .gantt-task-testing .gantt_task_progress { background-color: #17a2b8; }
      .gantt-task-testing .gantt_task_line { background-color: #17a2b8; border-color: #117a8b; }

      .gantt-task-completed .gantt_task_progress { background-color: #28a745; }
      .gantt-task-completed .gantt_task_line { background-color: #28a745; border-color: #1e7e34; }

      .gantt_task .gantt_task_content { color: #fff; font-weight: 500; }
      .gantt_grid_scale .gantt_grid_head_cell { background-color: #f8fafc; font-weight: 600; }
      .gantt_task_line { border-radius: 4px; }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Set Gantt zoom level
 */
function setGanttZoom(scale) {
  switch (scale) {
    case 'day':
      gantt.config.scale_unit = 'day';
      gantt.config.date_scale = '%d %M';
      gantt.config.subscales = [
        { unit: 'hour', step: 6, date: '%H:%i' }
      ];
      break;
    case 'week':
      gantt.config.scale_unit = 'week';
      gantt.config.date_scale = 'Week %W';
      gantt.config.subscales = [
        { unit: 'day', step: 1, date: '%d %M' }
      ];
      break;
    case 'month':
      gantt.config.scale_unit = 'month';
      gantt.config.date_scale = '%F %Y';
      gantt.config.subscales = [
        { unit: 'week', step: 1, date: 'Week %W' }
      ];
      break;
  }
  gantt.render();
}

/**
 * Convert project tasks to Gantt chart format
 */
function convertTasksToGanttFormat(tasks) {
  const ganttTasks = [];
  const ganttLinks = [];

  tasks.forEach((task, index) => {
    // Parse dates
    let startDate = task.baselineStart || task.actualStart || new Date();
    let endDate = task.baselineFinish || task.actualFinish;

    // Ensure dates are valid
    if (typeof startDate === 'string') {
      startDate = moment(startDate, ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY']).toDate();
    }

    // Validate start date
    if (!moment(startDate).isValid()) {
      console.warn('Invalid start date for task', task.taskName, '- using today');
      startDate = new Date();
    }

    if (!endDate) {
      // Calculate end date from duration
      const duration = task.duration || 1;
      endDate = moment(startDate).add(duration, 'days').toDate();
    } else if (typeof endDate === 'string') {
      endDate = moment(endDate, ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY']).toDate();
    }

    // Validate end date
    if (!moment(endDate).isValid()) {
      console.warn('Invalid end date for task', task.taskName, '- calculating from duration');
      endDate = moment(startDate).add(task.duration || 1, 'days').toDate();
    }

    // Ensure end date is after start date
    if (moment(endDate).isBefore(startDate)) {
      endDate = moment(startDate).add(1, 'days').toDate();
    }

    // Calculate duration in days
    const duration = Math.max(1, moment(endDate).diff(moment(startDate), 'days') || 1);

    // Get progress percentage (0 to 1)
    const progress = Math.min(1, Math.max(0, (task.workCompletion || 0) / 100));

    const ganttTask = {
      id: index + 1,
      text: task.taskName || task.phase || `Task ${index + 1}`,
      start_date: moment(startDate).format('DD-MM-YYYY'),
      duration: duration,
      progress: progress,
      status: task.status || 'Pending',
      phase: task.phase || '',
      responsibility: task.responsibility || '',
      priority: task.priority || 'Low'
    };

    ganttTasks.push(ganttTask);

    // Parse dependencies for links
    if (task.dependencies && task.dependencies.trim()) {
      const depIds = task.dependencies.split(',').map(dep => dep.trim());
      depIds.forEach(depId => {
        const depTaskIndex = tasks.findIndex(t => t.taskId === depId);
        if (depTaskIndex >= 0) {
          ganttLinks.push({
            id: ganttLinks.length + 1,
            source: depTaskIndex + 1,
            target: index + 1,
            type: '0' // finish-to-start
          });
        }
      });
    }
  });

  return {
    data: ganttTasks,
    links: ganttLinks
  };
}

const STATUS_LEGEND = [
  { label: 'Pending', color: '#ffc107' },
  { label: 'In Progress', color: '#4f46e5' },
  { label: 'On Hold', color: '#6c757d' },
  { label: 'Testing', color: '#17a2b8' },
  { label: 'Completed', color: '#28a745' },
];

// The container the gantt was last initialised in (React draws a new one after every load).
let lastGanttContainer = null;

export default function GanttChart() {
  const { user } = useAuth();
  const currentUserId = user ? user._id : null;

  const [isLoading, setIsLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [taskCount, setTaskCount] = useState(0);
  const [zoomScale, setZoomScale] = useState('week');
  const ganttInitialized = useRef(false);
  const pageClosed = useRef(false);
  const timers = useRef([]);

  // setTimeout that is cancelled when the page is closed
  const later = (callback, delay) => {
    timers.current.push(setTimeout(callback, delay));
  };

  /**
   * Render Gantt chart
   */
  const renderGanttChart = (ganttData) => {
    // Wait for DOM to be ready and container to be visible
    later(() => {
      if (pageClosed.current) return;

      const container = document.getElementById('ganttChartContainer');
      if (!container) {
        console.error('Gantt container not found - waiting for DOM...');
        // Try again after a longer delay
        later(() => {
          renderGanttChart(ganttData);
        }, 500);
        return;
      }

      try {
        // Clear existing data
        gantt.clearAll();

        // Check if container element changed (recreated after a load)
        const containerChanged = lastGanttContainer !== container;

        // Initialize or reinitialize gantt if needed
        if (!ganttInitialized.current || containerChanged) {
          gantt.init(container);
          ganttInitialized.current = true;
          lastGanttContainer = container;
        }

        // Parse and load data
        gantt.parse(ganttData);

        // Check if tasks were loaded
        const loadedTasks = gantt.getTaskCount();
        // Ensure gantt is properly sized
        gantt.setSizes();

        // Render the chart
        gantt.render();

        // Scroll to the first task instead of today to ensure tasks are visible
        if (loadedTasks > 0) {
          const firstTask = gantt.getTask(1);
          if (firstTask && firstTask.start_date) {
            gantt.showDate(firstTask.start_date);
          }
        }

        if (loadedTasks === 0) {
          console.warn('WARNING: Gantt has 0 tasks after parsing!');
          toastr.warning('No tasks visible in Gantt chart. Check console for details.');
        }
      } catch (error) {
        console.error('Error rendering gantt:', error);
        toastr.error('Failed to render Gantt chart: ' + error.message);
      }
    }, 300);
  };

  /**
   * Load project tasks and render Gantt chart
   */
  const loadProjectTasks = (projectId) => {
    setIsLoading(true);
    setZoomScale('week'); // the scale buttons are drawn again after the load, with Week marked

    api.call('projectTasks.getByProject', projectId, (error, tasks) => {
      setIsLoading(false);

      if (error) {
        console.error('Error loading tasks:', error);
        toastr.error('Failed to load project tasks');
        return;
      }

      if (!tasks || tasks.length === 0) {
        toastr.info('No tasks found for this project');
        setTaskCount(0);
        gantt.clearAll();
        return;
      }

      setTaskCount(tasks.length);

      // Convert tasks to Gantt format
      const ganttData = convertTasksToGanttFormat(tasks);

      // Initialize or update Gantt chart (it waits until the container is on the page)
      renderGanttChart(ganttData);

      toastr.success(`Loaded ${tasks.length} tasks`);
    });
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
        if (pendingRequests === 0) {
          const updatedProjects = projects.map(project => {
            if (project.companyName && clientMap[project.companyName]) {
              return { ...project, companyDisplayName: clientMap[project.companyName] };
            }
            return project;
          });
          setProjectList(updatedProjects);
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
      const lastProject = enrichedProjects[enrichedProjects.length - 1];
      setCurrentProject(lastProject);

      // Load tasks for the last project after a short delay
      later(() => {
        loadProjectTasks(lastProject._id);
      }, 500);
    } else {
      toastr.info('No projects available');
    }
  };

  // Select2 + Gantt configuration (once), and the clean up when the page is closed
  useEffect(() => {
    pageClosed.current = false;

    // Initial Select2 setup
    initSelect2();

    // Initialize Gantt configuration
    configureGantt();

    return () => {
      pageClosed.current = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];

      // Clean up Select2
      if ($('#projectSelect').data('select2')) {
        $('#projectSelect').select2('destroy');
      }

      // Clean up gantt instance
      if (gantt) {
        gantt.clearAll();
      }
    };
  }, []);

  // Load projects based on user type (as soon as the logged-in user is known)
  useEffect(() => {
    if (!user) return;

    // Check if user is a client
    const isClient = user.profile && user.profile.role === 'client';

    setIsLoading(true);

    if (isClient) {
      // For client users, load only their projects
      api.call('project.getByClient', (error, projects) => {
        setIsLoading(false);
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
        setIsLoading(false);
        if (error) {
          console.error('Error loading projects:', error);
          toastr.error('Failed to load projects');
          return;
        }

        showProjects(result && result.data);
      });
    }
  }, [currentUserId]);

  // Watch for projectList changes and refresh Select2 (the new options are on the page by now)
  useEffect(() => {
    if (projectList && projectList.length > 0) {
      const currentValue = $('#projectSelect').val();
      initSelect2(currentValue);
    }
  }, [projectList]);

  /**
   * Load Gantt chart for selected project
   */
  const handleLoadGanttChart = (event) => {
    event.preventDefault();

    const projectId = $('#projectSelect').val();
    if (!projectId) {
      toastr.error('Please select a project');
      return;
    }

    // Find selected project
    const selectedProject = projectList.find(p => p._id === projectId);

    if (selectedProject) {
      setCurrentProject(selectedProject);
      loadProjectTasks(projectId);
    } else {
      console.error('Project not found in list');
      toastr.error('Selected project not found');
    }
  };

  /**
   * Zoom to fit
   */
  const handleZoomToFit = (event) => {
    event.preventDefault();
    if (gantt) {
      gantt.render();
    }
  };

  /**
   * Export to PDF
   */
  const handleExportToPDF = (event) => {
    event.preventDefault();
    const project = currentProject;

    if (gantt && gantt.exportToPDF) {
      gantt.exportToPDF({
        name: `${project.name}_gantt_chart.pdf`
      });
    } else {
      toastr.info('PDF export feature requires dhtmlxGantt Pro version');
    }
  };

  /**
   * Change zoom scale
   */
  const handleZoomScale = (event, scale) => {
    event.preventDefault();

    // Update active button
    setZoomScale(scale);

    // Set zoom scale
    setGanttZoom(scale);
  };

  const zoomButtonClass = (scale) => 'btn btn-outline-secondary zoom-scale' + (zoomScale === scale ? ' active' : '');

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <i className="fa fa-tasks me-2"></i>Project Gantt Chart
          </h4>
          <p className="text-muted mb-0">Visualize project timeline and task dependencies</p>
        </div>
        <div className="d-flex gap-2">
          {currentProject && (
            <>
              <button type="button" className="btn btn-outline-primary" id="zoomToFit" onClick={handleZoomToFit}>
                <i className="fa fa-arrows-alt me-1"></i> Zoom to Fit
              </button>
              <button type="button" className="btn btn-outline-success" id="exportToPDF" onClick={handleExportToPDF}>
                <i className="fa fa-file-pdf-o me-1"></i> Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project Selection Card */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-8">
              <label htmlFor="projectSelect" className="form-label">Select Project <span className="text-danger">*</span></label>
              <select className="form-select select2" id="projectSelect" name="projectSelect" defaultValue="">
                <option value="">Choose a project...</option>
                {projectList.map((project) => (
                  <option key={project._id} value={project._id}>{project.name}{project.companyDisplayName ? ` - ${project.companyDisplayName}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <button type="button" className="btn btn-primary w-100" id="loadGanttChart" onClick={handleLoadGanttChart}>
                <i className="fa fa-refresh me-1"></i> Load Gantt Chart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart Container */}
      {isLoading ? (
        <div className="card">
          <div className="card-body">
            <GanttSkeleton />
          </div>
        </div>
      ) : currentProject ? (
        <>
          {/* Project Info */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <h6 className="text-muted mb-1">Project Name</h6>
                  <p className="mb-0 fw-bold">{currentProject.name}</p>
                </div>
                <div className="col-md-3">
                  <h6 className="text-muted mb-1">Company</h6>
                  <p className="mb-0 fw-bold">{currentProject.companyDisplayName ? currentProject.companyDisplayName : 'N/A'}</p>
                </div>
                <div className="col-md-2">
                  <h6 className="text-muted mb-1">Start Date</h6>
                  <p className="mb-0 fw-bold">{formatDate(currentProject.startDate)}</p>
                </div>
                <div className="col-md-2">
                  <h6 className="text-muted mb-1">End Date</h6>
                  <p className="mb-0 fw-bold">{formatDate(currentProject.endDate)}</p>
                </div>
                <div className="col-md-1">
                  <h6 className="text-muted mb-1">Tasks</h6>
                  <p className="mb-0 fw-bold">{taskCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gantt Chart */}
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="fa fa-calendar me-2"></i>Project Timeline
                </h6>
                <div className="btn-group btn-group-sm" role="group">
                  <button type="button" className={zoomButtonClass('day')} data-scale="day" onClick={(event) => handleZoomScale(event, 'day')}>Day</button>
                  <button type="button" className={zoomButtonClass('week')} data-scale="week" onClick={(event) => handleZoomScale(event, 'week')}>Week</button>
                  <button type="button" className={zoomButtonClass('month')} data-scale="month" onClick={(event) => handleZoomScale(event, 'month')}>Month</button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div id="ganttChartContainer" style={{ width: '100%', height: '600px' }}></div>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="text-center py-5">
              <i className="fa fa-bar-chart" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
              <h5 className="mt-3">No Project Selected</h5>
              <p className="text-muted">Please select a project from the dropdown above to view the Gantt chart</p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {currentProject && (
        <div className="card mt-3">
          <div className="card-body">
            <h6 className="mb-3">Status Legend</h6>
            <div className="d-flex gap-4 flex-wrap">
              {STATUS_LEGEND.map((status) => (
                <div key={status.label} className="d-flex align-items-center">
                  <div style={{ width: '20px', height: '20px', backgroundColor: status.color, borderRadius: '3px', marginRight: '8px' }}></div>
                  <span>{status.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
