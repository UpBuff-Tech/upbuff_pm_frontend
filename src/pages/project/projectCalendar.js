/**
 * @author Visakh
 */

// The task calendar of the project form (Calendar tab, #projectCalendar).

import moment from 'moment';
import api from '../../api/client';
import { findKnownUser, getStatusBadgeClass, profileFullName } from './projectHelpers';

// Calendar colours per task status (default: primary blue)
const STATUS_COLORS = {
  'Pending': '#d97706', // Warning yellow
  'In Progress': '#4f46e5', // Primary blue
  'On Hold': '#64748b', // Secondary gray
  'Testing': '#0891b2', // Info cyan
  'Completed': '#16a34a' // Success green
};

let projectCalendar = null;
// Re-measures the calendar when its container changes size (see renderProjectCalendar)
let calendarResizeObserver = null;

/** Convert tasks to calendar events */
function tasksToEvents(tasks) {
  const events = [];

  (tasks || []).forEach(task => {
    // Determine color based on status
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
        workCompletion: task.workCompletion,
        phase: task.phase,
        responsibility: task.responsibility,
        description: task.taskName
      }
    };

    // Only add events with dates
    if (event.start) {
      events.push(event);
    }
  });

  return events;
}

/** Show task details when a calendar event is clicked */
function showEventDetails(info, loggedInUser) {
  const task = info.event.extendedProps;

  let assignedUserName = 'Unassigned';
  if (task.assignedTo) {
    const user = findKnownUser(loggedInUser, task.assignedTo);
    if (user && user.profile) {
      assignedUserName = profileFullName(user.profile);
    }
  }

  const detailsHTML = `
          <div style="padding: 10px;">
            <h6 style="margin-bottom: 10px; color: #4f46e5;">${info.event.title}</h6>
            <p style="margin: 5px 0;"><strong>Task ID:</strong> ${task.taskId || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span class="badge bg-label-${getStatusBadgeClass(task.status)}">${task.status}</span></p>
            <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Assigned To:</strong> ${assignedUserName}</p>
            <p style="margin: 5px 0;"><strong>Phase:</strong> ${task.phase || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Responsibility:</strong> ${task.responsibility || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Completion:</strong> ${task.workCompletion || 0}%</p>
            <p style="margin: 5px 0;"><strong>Start:</strong> ${info.event.start ? moment(info.event.start).format('MMM DD, YYYY') : 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>End:</strong> ${info.event.end ? moment(info.event.end).format('MMM DD, YYYY') : 'N/A'}</p>
          </div>
        `;

  // SweetAlert shows the details; without the library on the page nothing opens.
  if (window.Swal) {
    window.Swal.fire({
      html: detailsHTML,
      showCloseButton: true,
      showConfirmButton: false,
      width: '500px'
    });
  }
}

/**
 * Initialize FullCalendar with project tasks
 */
export function initializeProjectCalendar(projectId, loggedInUser, unsavedTasks) {
  // A project that is not saved yet has no tasks on the server: show the tasks of the form
  if (!projectId) {
    renderProjectCalendar(unsavedTasks || [], loggedInUser);
    return;
  }

  // Load tasks for the project
  api.call('projectTasks.getByProject', projectId, (error, tasks) => {
    if (error) {
      console.error('Error loading tasks for calendar:', error);
      toastr.error('Failed to load tasks for calendar');
      return;
    }
    renderProjectCalendar(tasks, loggedInUser);
  });
}

/** Draw the calendar of the given tasks (an empty month when none of them has dates). */
function renderProjectCalendar(tasks, loggedInUser) {
  const events = tasksToEvents(tasks);

  // Destroy existing calendar if it exists
  destroyProjectCalendar();

  // Initialize FullCalendar (loaded dynamically)
  const calendarEl = document.getElementById('projectCalendar');
  if (!calendarEl) {
    console.error('Calendar element not found');
    return;
  }

  Promise.all([
    import('@fullcalendar/core'),
    import('@fullcalendar/daygrid'),
    import('@fullcalendar/timegrid'),
    import('@fullcalendar/list'),
    import('@fullcalendar/interaction')
  ]).then(([core, dayGrid, timeGrid, list, interaction]) => {
    projectCalendar = new core.Calendar(calendarEl, {
      plugins: [dayGrid.default, timeGrid.default, list.default, interaction.default],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listMonth'
      },
      events: events,
      eventClick: (info) => showEventDetails(info, loggedInUser),
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
      contentHeight: 550
    });

    projectCalendar.render();

    // The Calendar tab fades in, so at first render the container can still be 0px wide and the
    // month grid collapses. Re-measure whenever the container's size changes (tab shown, modal
    // resized, window resized).
    if (typeof ResizeObserver !== 'undefined') {
      calendarResizeObserver = new ResizeObserver(() => {
        if (projectCalendar && calendarEl.offsetWidth > 0) projectCalendar.updateSize();
      });
      calendarResizeObserver.observe(calendarEl);
    }
  });
}

/** Remove the calendar (before building a new one, and when the page goes away). */
export function destroyProjectCalendar() {
  if (calendarResizeObserver) {
    calendarResizeObserver.disconnect();
    calendarResizeObserver = null;
  }
  if (projectCalendar) {
    projectCalendar.destroy();
    projectCalendar = null;
  }
}
