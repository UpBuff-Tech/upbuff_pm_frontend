/**
 * Task Calendar Page
 * Displays tasks in calendar view with project filtering
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';

// Import FullCalendar
import { Calendar as FullCalendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarSkeleton } from '../../components/skeleton/Skeleton';

const STATUS_COLORS = {
  'Pending': '#d97706',     // Warning yellow
  'In Progress': '#4f46e5', // Primary blue
  'On Hold': '#64748b',     // Secondary gray
  'Testing': '#0891b2',     // Info cyan
  'Completed': '#16a34a'    // Success green
};

/**
 * Convert tasks to calendar events
 */
function tasksToEvents(tasks) {
  const events = [];

  if (tasks && tasks.length > 0) {
    tasks.forEach(task => {
      // Determine color based on status (default blue)
      const color = STATUS_COLORS[task.status] || '#4f46e5';

      // Create event for task
      const event = {
        id: task._id,
        title: task.taskName || 'Unnamed Task',
        start: task.baselineStart || task.actualStart,
        end: task.baselineFinish || task.actualFinish,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          taskId: task.taskId,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo,
          assignedToName: task.assignedToName,
          workCompletion: task.workCompletion,
          phase: task.phase,
          responsibility: task.responsibility,
          description: task.taskName,
          projectId: task.projectId,
          projectName: task.projectName,
          actualStart: task.actualStart,
          actualFinish: task.actualFinish,
          baselineStart: task.baselineStart,
          baselineFinish: task.baselineFinish
        }
      };

      // Only add events with dates
      if (event.start) {
        events.push(event);
      }
    });
  }

  return events;
}

/**
 * Helper function to get status badge class
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'In Progress':
      return 'primary';
    case 'On Hold':
      return 'secondary';
    case 'Testing':
      return 'info';
    case 'Completed':
      return 'success';
    default:
      return 'secondary';
  }
}

/**
 * Helper function to get priority badge class
 */
function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'Critical':
      return 'danger';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'info';
    case 'Low':
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Progress bar color based on completion
 */
function getProgressBarClass(completion) {
  if (completion < 25) return 'bg-danger';
  if (completion < 50) return 'bg-warning';
  if (completion < 75) return 'bg-info';
  return 'bg-success';
}

function formatTaskDate(date, emptyText) {
  return date ? moment(date).format('MMM DD, YYYY') : emptyText;
}

const CALENDAR_STYLES = `
    /* Calendar button active state */
    .calendar-view-btn.active {
      background-color: #4f46e5;
      color: white;
      border-color: #4f46e5;
    }

    /* FullCalendar custom styles */
    .fc-event {
      cursor: pointer;
      border-radius: 4px;
      padding: 2px 4px;
      font-size: 0.875rem;
    }

    .fc-event:hover {
      opacity: 0.8;
      transform: scale(1.02);
      transition: all 0.2s ease;
    }

    /* Calendar toolbar */
    .fc-toolbar-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #334155;
    }

    .fc-button {
      background-color: #4f46e5;
      border-color: #4f46e5;
      color: white;
      text-transform: capitalize;
    }

    .fc-button:hover {
      background-color: #4338ca;
      border-color: #4338ca;
    }

    .fc-button-active {
      background-color: #4338ca !important;
      border-color: #4338ca !important;
    }

    /* Loading spinner overlay */
    .calendar-loading {
      position: relative;
    }

    .calendar-loading::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
  `;

export default function Calendar() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [clientProjects, setClientProjects] = useState([]);
  // The tasks the calendar shows; null until they are loaded (and while they are being reloaded).
  const [allTasks, setAllTasks] = useState(null);
  const [activeView, setActiveView] = useState('');
  // The event that was clicked: { title, task } shown in the Task Detail modal.
  const [taskDetail, setTaskDetail] = useState(null);
  const calendarInstance = useRef(null);

  // Load all tasks for the client
  const loadTasks = (projectId = null) => {
    setIsLoading(true);
    setAllTasks(null);

    api.call('tasks.getClientCalendarTasks', projectId, (error, tasks) => {
      setIsLoading(false);

      if (error) {
        console.error('Error loading tasks for calendar:', error);
        toastr.error('Failed to load tasks for calendar');
        return;
      }

      // No tasks: an empty calendar is shown
      setAllTasks(tasks && tasks.length > 0 ? tasks : []);
    });
  };

  useEffect(() => {
    // Load client's projects
    api.call('tasks.getClientProjects', (error, projects) => {
      if (!error && projects) {
        setClientProjects(projects);
      }
    });

    // Initial load of all tasks
    loadTasks();

    // Auto-activate the Month view button
    const timer = setTimeout(() => setActiveView('dayGridMonth'), 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize FullCalendar with the tasks, once they are loaded and the container is on the page
  useEffect(() => {
    if (!allTasks) return undefined;

    const calendarEl = document.getElementById('taskCalendar');
    if (!calendarEl) {
      console.error('Calendar element not found');
      return undefined;
    }

    const calendar = new FullCalendar(calendarEl, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth'
      },
      events: tasksToEvents(allTasks),
      eventClick: function (info) {
        // Show task details in modal
        setTaskDetail({ title: info.event.title, task: info.event.extendedProps });
        $('#taskDetailModal').modal('show');
      },
      eventDidMount: function (info) {
        // Add tooltip on hover
        $(info.el).tooltip({
          title: `${info.event.title} (${info.event.extendedProps.status})`,
          placement: 'top',
          trigger: 'hover',
          container: 'body'
        });
      },
      height: 'auto',
      contentHeight: 600,
      // Additional calendar options
      editable: false,
      selectable: false,
      selectMirror: true,
      dayMaxEvents: true,
      weekends: true,
      navLinks: true,
      businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
        startTime: '09:00',
        endTime: '18:00'
      }
    });

    calendar.render();
    calendarInstance.current = calendar;

    // Clean up calendar instance
    return () => {
      calendar.destroy();
      calendarInstance.current = null;
    };
  }, [allTasks]);

  const handleProjectFilterChange = (event) => {
    event.preventDefault();

    const selectedProjectId = event.currentTarget.value;
    setSelectedProject(selectedProjectId);

    // Reload tasks with filter
    loadTasks(selectedProjectId || null);
  };

  const handleViewClick = (event, viewType) => {
    event.preventDefault();

    // Update active button state
    setActiveView(viewType);

    // Change calendar view
    if (calendarInstance.current) {
      calendarInstance.current.changeView(viewType);
    }
  };

  const viewButtonClass = (viewType) =>
    'btn btn-outline-secondary btn-sm calendar-view-btn' + (activeView === viewType ? ' active' : '');

  // What the Task Detail modal shows
  const task = taskDetail ? taskDetail.task : null;
  const completion = task ? (task.workCompletion || 0) : 0;

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Task Calendar</h4>
            <p className="text-muted mb-0">View and track your tasks in calendar view</p>
          </div>
        </div>

        {/* Filter Card */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              {/* Project Filter */}
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="calendarProjectFilter">
                  <i className="fa fa-filter me-1"></i>Filter by Project
                </label>
                <select className="form-select" id="calendarProjectFilter" value={selectedProject} onChange={handleProjectFilterChange}>
                  <option value="">All Projects</option>
                  {clientProjects.map((project) => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Calendar View Options */}
              <div className="col-md-6 text-end">
                <button type="button" className={viewButtonClass('dayGridMonth')} data-view="dayGridMonth" onClick={(event) => handleViewClick(event, 'dayGridMonth')}>
                  <i className="fa fa-calendar me-1"></i>Month
                </button>
                {' '}
                <button type="button" className={viewButtonClass('timeGridWeek')} data-view="timeGridWeek" onClick={(event) => handleViewClick(event, 'timeGridWeek')}>
                  <i className="fa fa-calendar-week me-1"></i>Week
                </button>
                {' '}
                <button type="button" className={viewButtonClass('listMonth')} data-view="listMonth" onClick={(event) => handleViewClick(event, 'listMonth')}>
                  <i className="fa fa-list me-1"></i>List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="card">
          <div className="card-body">
            {/* Calendar Legend */}
            <div className="mb-3 d-flex flex-wrap gap-3">
              <div className="d-flex align-items-center">
                <span className="badge bg-label-warning me-2">Pending</span>
                <small className="text-muted">Tasks not started</small>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge bg-label-primary me-2">In Progress</span>
                <small className="text-muted">Currently working</small>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge bg-label-secondary me-2">On Hold</span>
                <small className="text-muted">Paused tasks</small>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge bg-label-info me-2">Testing</span>
                <small className="text-muted">Under testing</small>
              </div>
              <div className="d-flex align-items-center">
                <span className="badge bg-label-success me-2">Completed</span>
                <small className="text-muted">Finished tasks</small>
              </div>
            </div>

            {isLoading ? (
              /* Loading State */
              <CalendarSkeleton label="Loading your tasks…" />
            ) : (
              /* Calendar Container */
              <div id="taskCalendar" style={{ minHeight: '600px' }}></div>
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <div className="modal fade" id="taskDetailModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fa fa-tasks me-2"></i><span id="taskDetailTitle">{taskDetail ? taskDetail.title : 'Task Details'}</span>
              </h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="row">
                {/* Left Column */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Task ID</label>
                  <p id="taskDetailId" className="text-muted">{task ? (task.taskId || 'N/A') : '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Status</label>
                  <p id="taskDetailStatus">
                    {task ? <span className={`badge bg-label-${getStatusBadgeClass(task.status)}`}>{task.status}</span> : '-'}
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Priority</label>
                  <p id="taskDetailPriority" className="text-muted">
                    {task ? <span className={`badge bg-label-${getPriorityBadgeClass(task.priority)}`}>{task.priority || 'Not Set'}</span> : '-'}
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Assigned To</label>
                  <p id="taskDetailAssignedTo" className="text-muted">{task ? (task.assignedToName || 'Unassigned') : '-'}</p>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-bold">Project</label>
                  <p id="taskDetailProject" className="text-muted">{task ? (task.projectName || 'N/A') : '-'}</p>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-bold">Phase/Activity</label>
                  <p id="taskDetailPhase" className="text-muted">{task ? (task.phase || 'N/A') : '-'}</p>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-bold">Responsibility</label>
                  <p id="taskDetailResponsibility" className="text-muted">{task ? (task.responsibility || 'N/A') : '-'}</p>
                </div>

                {/* Right Column */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Baseline Start</label>
                  <p id="taskDetailBaselineStart" className="text-muted">{task ? formatTaskDate(task.baselineStart, 'Not set') : '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Baseline Finish</label>
                  <p id="taskDetailBaselineFinish" className="text-muted">{task ? formatTaskDate(task.baselineFinish, 'Not set') : '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Actual Start</label>
                  <p id="taskDetailActualStart" className="text-muted">{task ? formatTaskDate(task.actualStart, 'Not started') : '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Actual Finish</label>
                  <p id="taskDetailActualFinish" className="text-muted">{task ? formatTaskDate(task.actualFinish, 'Not finished') : '-'}</p>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-bold">Work Completion</label>
                  <div className="d-flex align-items-center">
                    <div className="progress flex-grow-1 me-3" style={{ height: '20px' }}>
                      {/* Progress bar: width and color based on completion */}
                      <div className={'progress-bar' + (task ? ' ' + getProgressBarClass(completion) : '')} id="taskDetailProgressBar" role="progressbar"
                        style={{ width: `${completion}%` }} aria-valuenow={task ? completion : undefined}>
                        <span id="taskDetailProgressText" className="fw-bold">{completion}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{CALENDAR_STYLES}</style>
    </>
  );
}
