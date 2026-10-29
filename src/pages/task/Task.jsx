/**
 * Server-paginated Task Kanban board (/task/list and /updated/task/list).
 *
 * The five status columns are KanbanColumn widgets (see KanbanColumn.jsx) that
 * each load their own pages of 10 slim task docs. The page owns everything the
 * widgets share - filters, lookup maps, the 1s timer tick, the detail-modal
 * state and the timer functions - and hands it to them as the `board` prop.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './task.css';
import api, { onDataChanged } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Session } from '../../lib/session';
import { currentUserId } from '../../lib/customFunctions';
import { formatSeconds, formatHoursMinutesSeconds, clearLegacyTimerShadow, userFullName } from './updatedTaskUtils';
import KanbanColumn from './KanbanColumn';
import TaskDetailModalUpdated from './TaskDetailModalUpdated';
import TodayHoursModalUpdated from './TodayHoursModalUpdated';
import CreateTaskModalUpdated from './CreateTaskModalUpdated';
import { hideEmptyOption } from '../../lib/select2Options';

/** Turn a list of docs into an _id -> doc lookup map. */
function mapById(list) {
  const map = {};
  (list || []).forEach(doc => { if (doc && doc._id) map[doc._id] = doc; });
  return map;
}

/** Today's date as "YYYY-MM-DD" (the value of an <input type="date">). */
function todayDateString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function Task() {
  const { user, userCan } = useAuth();
  const navigate = useNavigate();

  // False once the page is gone, so late server answers are ignored.
  const isActiveRef = useRef(true);

  // Filters — the column widgets react to these.
  // Default the board to the current user's tasks, like the original page.
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUser, setSelectedUser] = useState(() => currentUserId() || '');
  // The Completed column only shows the tasks completed between these days ("YYYY-MM-DD", both included).
  const [completedFrom, setCompletedFrom] = useState(todayDateString);
  const [completedTo, setCompletedTo] = useState(todayDateString);
  // Search box (task name or task ID). searchText follows what is typed; the columns use
  // appliedSearch, which updates 400 ms after the user stops typing (not on every key).
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  // One shared 1s tick: card time displays and the banner re-render from this
  // while a timer is running.
  const [timerTick, setTimerTick] = useState(0);

  // Today's Working Hours banner state (server-anchored)
  const [todayWorkingSeconds, setTodayWorkingSeconds] = useState(0);
  const [todayWorkingAnchorMs, setTodayWorkingAnchorMs] = useState(() => Date.now());
  const [todayTimerRunning, setTodayTimerRunning] = useState(false);

  // Dropdown data + id -> doc lookup maps for the card display helpers.
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const projectMap = useMemo(() => mapById(projectsList), [projectsList]);
  const userMap = useMemo(() => mapById(usersList), [usersList]);

  // Users offered in the "All Users" filter (null until they are known).
  const [userFilterOptions, setUserFilterOptions] = useState(null);

  // Task Detail modal state (read by TaskDetailModalUpdated).
  const [detailTask, setDetailTask] = useState(null);         // slim card doc — instant display
  const [detailFullTask, setDetailFullTask] = useState(null); // full doc (comments, activity ...)
  const [detailTicket, setDetailTicket] = useState(null);     // linked ticket, when present
  const [detailLoading, setDetailLoading] = useState(false);

  // Raising this number makes every column re-fetch its total badge.
  const [countsRefreshKey, setCountsRefreshKey] = useState(0);

  // The task docs each column currently holds, keyed by status — lets the
  // detail modal check a task's live timer state.
  const columnTasksRef = useRef({});

  // The modals put their "open" function in these.
  const createTaskModalRef = useRef(null);
  const todayHoursModalRef = useRef(null);

  const lastVisibleRefreshRef = useRef(0);
  const projectsFilterInitializedRef = useRef(false);
  const usersFilterInitializedRef = useRef(false);

  /**
   * Open the detail modal for a task: show the slim card data immediately,
   * fetch the full doc (and linked ticket) on demand.
   */
  const openTaskDetail = (task) => {
    if (!task || !isActiveRef.current) return;
    setDetailTask(task);
    setDetailFullTask(null);
    setDetailTicket(null);
    setDetailLoading(true);
    api.call('projectTasks.getById', task._id, (error, fullTask) => {
      if (!isActiveRef.current) return;
      setDetailLoading(false);
      if (!error && fullTask) {
        setDetailFullTask(fullTask);
        if (fullTask.ticketId) {
          api.call('tickets.getById', fullTask.ticketId, (ticketError, ticket) => {
            if (!ticketError && ticket && isActiveRef.current) setDetailTicket(ticket);
          });
        }
      }
    });
    $('#taskDetailModal').modal('show');
  };

  /**
   * Refresh every column's total badge. The columns' task lists reload by
   * themselves and need no manual refresh; only the totals are method-based.
   */
  const refreshColumnCounts = () => {
    setCountsRefreshKey(key => key + 1);
  };

  /**
   * Refresh the Today's Working Hours banner from the server. The server folds
   * committed logs AND the live running session into totalSeconds; the client
   * only ticks forward from the anchor while a timer runs.
   */
  const refreshTodayHours = () => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    api.call('projectTasks.getMyTodayHours', dayStart.getTime(), dayEnd.getTime(), (error, result) => {
      if (!error && result && isActiveRef.current) {
        setTodayWorkingSeconds(result.totalSeconds || 0);
        setTodayWorkingAnchorMs(Date.now());
        setTodayTimerRunning(!!result.isRunning);
      }
    });
  };

  /**
   * Start the timer on a task. The server is authoritative for everything:
   * it enforces the punch-in requirement (throws 'not-punched-in'), validates
   * the task status, auto-stops any other timer of this user (single-timer
   * rule), and logs the "Timer started" activity.
   */
  const startTaskTimer = (taskId) => {
    api.call('projectTasks.setTimerState', taskId, {
      isRunning: true,
      isPaused: false,
      startTime: new Date(),
      accumulated: 0
    }, (error) => {
      if (!isActiveRef.current) return;
      if (error) {
        if (error.error === 'not-punched-in') {
          toastr.warning(error.reason);
        } else {
          toastr.error('Failed to start timer');
        }
        return;
      }
      toastr.success('Timer started');
      // Cards update by themselves (incl. another card the server auto-stopped);
      // only the banner needs a server-recomputed refresh.
      refreshTodayHours();
    });
  };

  /**
   * Stop the timer on a task. The server recomputes the duration from its own
   * timerState (8h-capped, overlap-clamped) and commits it to timeSpent.
   */
  const stopTaskTimer = (taskId) => {
    // Drop the legacy engine's local copy first, so its keep-alive sync and
    // the old page's UI can't act on a timer the user just stopped.
    clearLegacyTimerShadow(taskId);
    api.call('projectTasks.stopTimer', taskId, (error, result) => {
      if (!isActiveRef.current) return;
      if (error) {
        toastr.error('Failed to save timer');
        return;
      }
      if (result && result.success === false) {
        toastr.info('Timer was already stopped');
      } else {
        toastr.success(`Timer stopped and saved (${formatSeconds(result ? result.duration : 0)})`);
      }
      refreshTodayHours();
    });
  };

  /**
   * Auto-start a task's timer, but non-destructively — if the user already
   * has another timer running, warn instead of stealing it (only the manual
   * Start button auto-stops other timers, via the server). Used after a drag
   * to In Progress and after creating a task directly into In Progress/Testing.
   */
  const autoStartTimerIfFree = (taskId) => {
    api.call('projectTasks.getRunningTimers', (error, runningTimers) => {
      if (error || !isActiveRef.current) return;
      const otherRunning = (runningTimers || []).some(rt =>
        rt && rt.taskId !== taskId && rt.timerState && rt.timerState.isRunning && !rt.timerState.isPaused);
      if (otherRunning) {
        toastr.warning('Timer not auto-started — another timer is already running');
        return;
      }
      startTaskTimer(taskId);
    });
  };

  const autoStartTimerAfterDrop = (taskId, newStatus, oldStatus) => {
    if (newStatus !== 'In Progress') return;
    if ((oldStatus || '').toLowerCase() === 'completed') return;
    autoStartTimerIfFree(taskId);
  };

  /**
   * Move a task to another status column - used by drag & drop and by the
   * status dropdown on the cards. The server stops the timer on non-timer
   * statuses and syncs the linked ticket. `onDone(error)` is optional.
   */
  const changeTaskStatus = (taskId, newStatus, oldStatus, onDone) => {
    api.call('projectTasks.updateStatus', taskId, newStatus, (error) => {
      if (!isActiveRef.current) return;
      if (error) {
        toastr.error(error.reason || 'Failed to update task status');
        if (onDone) onDone(error);
        return;
      }
      toastr.success(`Task moved to ${newStatus}`);
      // A move out of In Progress/Testing stops the timer server-side —
      // drop the legacy engine's local copy of it too.
      clearLegacyTimerShadow(taskId);
      autoStartTimerAfterDrop(taskId, newStatus, oldStatus);
      // Totals are method-based; the move may also have stopped a timer.
      refreshColumnCounts();
      refreshTodayHours();
      if (onDone) onDone(null);
    });
  };

  /**
   * Open the Create Task modal. Punch-in is enforced server-side by
   * projectTasks.create — the save button surfaces its error.
   */
  const openCreateTask = () => {
    if (createTaskModalRef.current) createTaskModalRef.current();
  };

  /** A column tells the board which task docs it holds (null when it goes away). */
  const setColumnTasks = (status, tasks) => {
    if (tasks) {
      columnTasksRef.current[status] = tasks;
    } else {
      delete columnTasksRef.current[status];
    }
  };

  /** The live (column) copy of a task, or undefined when no column holds it. */
  const findLiveTask = (taskId) => {
    const columns = Object.values(columnTasksRef.current);
    for (const tasks of columns) {
      const found = tasks.find(task => task._id === taskId);
      if (found) return found;
    }
    return undefined;
  };

  // Everything the widgets need from the page.
  const board = {
    isActive: () => isActiveRef.current,
    selectedProject,
    selectedUser,
    completedOn: completedFrom,
    completedTo,
    search: appliedSearch,
    timerTick,
    projectsList,
    usersList,
    projectMap,
    userMap,
    detailTask,
    detailFullTask,
    detailTicket,
    detailLoading,
    setDetailTask,
    setDetailFullTask,
    countsRefreshKey,
    openTaskDetail,
    refreshColumnCounts,
    refreshTodayHours,
    startTaskTimer,
    stopTaskTimer,
    autoStartTimerIfFree,
    autoStartTimerAfterDrop,
    changeTaskStatus,
    setColumnTasks,
    findLiveTask
  };

  // Page start: live tick + periodic banner refresh + silent refresh on tab
  // return (throttled), then the dropdown data.
  useEffect(() => {
    isActiveRef.current = true;

    const tickInterval = setInterval(() => {
      if (isActiveRef.current) setTimerTick(tick => tick + 1);
    }, 1000);
    refreshTodayHours();
    const todayHoursInterval = setInterval(() => refreshTodayHours(), 30000);
    // After any data-changing call - e.g. a punch-out, which stops the running timers on the
    // server - re-read the hours at once so the banner stops counting.
    const stopListeningForChanges = onDataChanged(refreshTodayHours);

    const visibilityHandler = () => {
      if (document.visibilityState !== 'visible' || !isActiveRef.current) return;
      if (Date.now() - lastVisibleRefreshRef.current < 30000) return;
      lastVisibleRefreshRef.current = Date.now();
      refreshColumnCounts();
      refreshTodayHours();
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // This app's Bootstrap build does not act on data-bs-dismiss natively
    // (which is why the legacy pages use data-dismiss plus click shims), so
    // close buttons in this page's modals need an explicit handler. Scoped to
    // our modal ids and namespaced for clean removal; closes only the modal
    // the clicked button belongs to.
    $(document).on(
      'click.taskUpdatedDismiss',
      '#taskDetailModal [data-bs-dismiss="modal"], #taskCreationModal [data-bs-dismiss="modal"], #todayHoursModal [data-bs-dismiss="modal"]',
      function (event) {
        event.preventDefault();
        $(this).closest('.modal').modal('hide');
      }
    );

    const cleanup = () => {
      isActiveRef.current = false;
      $(document).off('click.taskUpdatedDismiss');
      clearInterval(tickInterval);
      clearInterval(todayHoursInterval);
      stopListeningForChanges();
      document.removeEventListener('visibilitychange', visibilityHandler);
    };

    // Clients have their own dedicated task page
    const isClient = !!(Session.get('clientId') ||
      (user && user.profile && user.profile.role === 'client'));
    if (isClient) {
      navigate('/client/tasks');
      return cleanup;
    }

    api.call('project.getAllForDropdown', (error, projects) => {
      if (!error && projects && isActiveRef.current) setProjectsList(projects);
    });
    api.call('user.getAllForAssignment', (error, users) => {
      if (!error && users && isActiveRef.current) setUsersList(users);
    });

    return cleanup;
  }, []);

  // The filter dropdowns are Select2 widgets: listen for their changes here
  // and remove the widgets when the page goes away.
  useEffect(() => {
    const $project = $('#filterByProject');
    const $user = $('#filterByUser');
    $project.on('change.taskUpdatedFilter', (event) => {
      setSelectedProject($(event.currentTarget).val() || '');
    });
    $user.on('change.taskUpdatedFilter', (event) => {
      setSelectedUser($(event.currentTarget).val() || '');
    });
    return () => {
      $project.off('change.taskUpdatedFilter');
      $user.off('change.taskUpdatedFilter');
      if ($project.data('select2')) $project.select2('destroy');
      if ($user.data('select2')) $user.select2('destroy');
    };
  }, []);

  // Initialize Select2 on the project filter once its data arrives
  // (same flow and look as the original page).
  useEffect(() => {
    if (projectsFilterInitializedRef.current || projectsList.length === 0) return;
    projectsFilterInitializedRef.current = true;
    const $project = $('#filterByProject');
    if ($project.length) {
      if ($project.data('select2')) { $project.select2('destroy'); }
      $project.select2({ placeholder: 'All Projects', allowClear: true, width: '100%', templateResult: hideEmptyOption });
    }
  }, [projectsList]);

  // Work out who is listed in the user filter once the users arrive.
  // With allAccounts_view, show everyone; otherwise only the current
  // user's role-hierarchy subordinates (same rule as the original page).
  useEffect(() => {
    if (usersFilterInitializedRef.current || usersList.length === 0) return;
    usersFilterInitializedRef.current = true;
    if (userCan('allAccounts_view')) {
      setUserFilterOptions(usersList);
    } else {
      api.call('user.getSubordinates', (err, subordinates) => {
        if (!isActiveRef.current) return;
        const list = (!err && subordinates) ? subordinates : usersList.filter(u => u.active !== 'N');
        setUserFilterOptions(list);
      });
    }
  }, [usersList]);

  // Init Select2 on the user filter and pre-select the current user (board
  // defaults to "my tasks", matching selectedUser's initial value).
  useEffect(() => {
    if (!userFilterOptions) return;
    const $user = $('#filterByUser');
    if (!$user.length) return;
    if ($user.data('select2')) { $user.select2('destroy'); }
    $user.select2({ placeholder: 'All Users', allowClear: true, width: '100%', templateResult: hideEmptyOption });
    const uid = currentUserId();
    if (uid && $user.find('option[value="' + uid + '"]').length) {
      $user.val(uid).trigger('change');
    }
  }, [userFilterOptions]);

  /**
   * Live "Today's Working Hours": server-anchored total, ticking forward one
   * second at a time (via the shared tick) while the server says a timer runs.
   */
  const todayWorkingHours = () => {
    let totalSeconds = todayWorkingSeconds;
    if (todayTimerRunning) {
      const elapsed = Math.floor((Date.now() - todayWorkingAnchorMs) / 1000);
      if (elapsed > 0) totalSeconds += elapsed;
    }
    return formatHoursMinutesSeconds(totalSeconds);
  };

  /** Today's worked time as a share of an 8-hour day (0-100), for the progress ring. */
  const todayProgressPercent = () => {
    let totalSeconds = todayWorkingSeconds;
    if (todayTimerRunning) {
      const elapsed = Math.floor((Date.now() - todayWorkingAnchorMs) / 1000);
      if (elapsed > 0) totalSeconds += elapsed;
    }
    return Math.min(100, Math.round((totalSeconds / (8 * 3600)) * 100));
  };

  const handleCreateTaskClick = (event) => {
    event.preventDefault();
    openCreateTask();
  };

  const handleTodayHoursCardClick = (event) => {
    event.preventDefault();
    if (todayHoursModalRef.current) todayHoursModalRef.current();
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">

      {/* Page Header */}
      <div className="tb-header">
        <div>
          <h4 className="fw-bold mb-1">Tasks</h4>
          <p className="text-muted mb-0">Plan, track and move work across every project</p>
        </div>
        {userCan('task_create') && (
          <button type="button" className="btn btn-primary createTaskBtn" onClick={handleCreateTaskClick}>
            <i className="bx bx-plus me-1"></i> Create Task
          </button>
        )}
      </div>

      {/* Toolbar: filters + today's hours */}
      <div className="tb-toolbar">
        <div className="tb-filters">
          <div className="tb-filter">
            <span className="tb-filter-label"><i className="bx bx-search"></i>Search</span>
            <input type="search" className="form-control" id="filterBySearch"
              placeholder="Task name or ID" title="Show only the tasks whose name or task ID contains this text"
              value={searchText} onChange={(event) => setSearchText(event.target.value)} />
          </div>
          <div className="tb-filter">
            <span className="tb-filter-label"><i className="bx bx-folder"></i>Project</span>
            <select className="form-select" id="filterByProject">
              <option value="">All Projects</option>
              {projectsList.map(project => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div className="tb-filter">
            <span className="tb-filter-label"><i className="bx bx-user"></i>Assignee</span>
            <select className="form-select" id="filterByUser">
              <option value="">All Users</option>
              {(userFilterOptions || []).map(u => (
                <option key={u._id} value={u._id}>{userFullName(u)}</option>
              ))}
            </select>
          </div>
          <div className="tb-filter tb-filter-range">
            <span className="tb-filter-label"><i className="bx bx-calendar-check"></i>Completed between</span>
            <div className="tb-range">
              <input type="date" className="form-control" id="filterByCompletedFrom" aria-label="Completed from"
                title="First day of the completed tasks the Completed column shows"
                value={completedFrom} max={completedTo}
                onChange={(event) => setCompletedFrom(event.target.value || completedTo)} />
              <span className="tb-range-sep">–</span>
              <input type="date" className="form-control" id="filterByCompletedTo" aria-label="Completed to"
                title="Last day of the completed tasks the Completed column shows"
                value={completedTo} min={completedFrom} max={todayDateString()}
                onChange={(event) => setCompletedTo(event.target.value || todayDateString())} />
            </div>
          </div>
        </div>

        {/* Today's Working Hours — click for the sessions/adjustments breakdown */}
        <button type="button" className={'todayHoursCard tb-today' + (todayTimerRunning ? ' is-live' : '')}
          title="View today's sessions and adjustments" onClick={handleTodayHoursCardClick}>
          <span className="tb-today-ring" style={{ '--progress': todayProgressPercent() }}
            title={todayProgressPercent() + '% of an 8h day'}>
            <i className="bx bx-time-five"></i>
          </span>
          <span className="tb-today-text">
            <span className="tb-today-label">
              Today&apos;s working hours
              {todayTimerRunning && <span className="tb-live"><i></i>Live</span>}
            </span>
            <span className="tb-today-value">{todayWorkingHours()}</span>
          </span>
          <i className="bx bx-chevron-right tb-today-arrow"></i>
        </button>
      </div>

      <section className="content">
        {/* Kanban Board — one self-contained, server-paginated column per status */}
        <div className="kanban-board">
          <div className="row g-2">
            <KanbanColumn board={board} status="Pending" columnKey="pending" tone="pending" icon="bx-time" />
            <KanbanColumn board={board} status="In Progress" columnKey="inprogress" tone="inprogress" icon="bx-loader-circle" />
            <KanbanColumn board={board} status="On Hold" columnKey="onhold" tone="onhold" icon="bx-pause-circle" />
            <KanbanColumn board={board} status="Testing" columnKey="testing" tone="testing" icon="bx-test-tube" />
            <KanbanColumn board={board} status="Completed" columnKey="completed" tone="completed" icon="bx-check-circle" />
          </div>
        </div>
      </section>

      {/* Task Detail Modal */}
      <TaskDetailModalUpdated board={board} />

      {/* Today's Hours breakdown modal */}
      <TodayHoursModalUpdated board={board} openRef={todayHoursModalRef} />

      {/* Create Task Modal */}
      <CreateTaskModalUpdated board={board} openRef={createTaskModalRef} />
      {/* Note: folder create/delete modals are rendered by the folderTree
          component itself (inside the attachments widget) — including them
          here again would duplicate their DOM ids. */}

    </div>
  );
}
