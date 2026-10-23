/**
 * Kanban status column widget — encapsulates the data flow and the scroll
 * pagination for ONE status column. Included 5 times by Task.jsx with
 * different status props:
 *
 *   <KanbanColumn board={board} status="Pending" columnKey="pending" tone="pending" icon="bx-time" />
 *
 * Data flow: the widget reads the projectTasks.kanbanColumn publication with a
 * growable `limit` (starts at 10, +10 per scroll), so any change (own or a
 * colleague's status change, timer start/stop, new tasks) appears without
 * manual refreshes. The column TOTAL comes from the
 * projectTasks.getKanbanColumnCount method and is refreshed on scope changes
 * (and on demand via board.refreshColumnCounts()).
 */
import { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';

import api from '../../api/client';
import { usePublication } from '../../hooks/usePublication';
import TaskCardUpdated from './TaskCardUpdated';

const PAGE_SIZE = 10; // tasks per page (initial load and each "load more")

/** Placeholder shaped like a task card, shown while tasks load. */
function SkeletonCard() {
  return (
    <div className="kanban-skeleton" aria-hidden="true">
      <div className="sk-row"><span className="sk sk-id"></span><span className="sk sk-pill"></span></div>
      <span className="sk sk-chip"></span>
      <span className="sk sk-line"></span>
      <span className="sk sk-line sk-short"></span>
      <div className="sk-row sk-foot"><span className="sk sk-avatar"></span><span className="sk sk-name"></span><span className="sk sk-time"></span></div>
    </div>
  );
}

/**
 * True when a task was completed on the day "YYYY-MM-DD" (local day). Mirrors
 * the server: actualFinish, or updatedAt for old tasks that have none.
 */
function completedOnDay(task, completedOn) {
  const finishedAt = task.actualFinish || task.updatedAt;
  if (!finishedAt) return false;
  const dayStart = new Date(completedOn + 'T00:00:00');
  const dayEnd = new Date(completedOn + 'T23:59:59.999');
  const finished = new Date(finishedAt);
  return finished >= dayStart && finished <= dayEnd;
}

/** True when the task's name or task ID contains the search text (any case), like the server. */
function matchesSearch(task, search) {
  const text = search.toLowerCase();
  return String(task.taskName || '').toLowerCase().includes(text)
    || String(task.taskId || '').toLowerCase().includes(text);
}

export default function KanbanColumn({ board, status, columnKey, tone, icon }) {
  const isActiveRef = useRef(true);
  const containerRef = useRef(null);
  const countRequestIdRef = useRef(0);

  const [total, setTotal] = useState(0);
  const [minimized, setMinimized] = useState(false);

  // The filters this column is scoped to.
  const projectId = board.selectedProject || null;
  const assignedUserId = board.selectedUser || null;
  // Only the Completed column is limited to one day ("YYYY-MM-DD", see Task.jsx).
  const completedOn = status === 'Completed' ? (board.completedOn || null) : null;
  // Search text (task name or ID) - applies to every column.
  const search = board.search || '';
  const scopeKey = `${projectId || ''}|${assignedUserId || ''}|${completedOn || ''}|${search}`;

  // "Load more" raises the limit; a scope change starts again at one page
  // (a limit raised for another scope no longer counts).
  const [raisedLimit, setRaisedLimit] = useState({ scopeKey, limit: PAGE_SIZE });
  const limit = raisedLimit.scopeKey === scopeKey ? raisedLimit.limit : PAGE_SIZE;

  // Own changes reload the column at once (any data-changing call); the interval only picks up
  // colleagues' changes, so 15s is enough - 5 columns polling every 5s queued up the page's requests.
  const { docs, upToDate } = usePublication('projectTasks.kanbanColumn', [status, projectId, assignedUserId, limit, completedOn, search],
    { intervalMs: 15000 });

  // The column is ready only once docs for the CURRENT filters and limit have
  // arrived (the skeleton shows while a new page is loading).
  const subscriptionReady = upToDate;

  /** Selector mirroring the publication's query for this column. */
  const matchesColumn = (task) => {
    if (task.isDeleted === true) return false;
    if (status === 'Pending') {
      if (task.status !== 'Pending' && task.status !== null && task.status !== undefined) return false;
    } else if (task.status !== status) {
      return false;
    }
    if (projectId && task.projectId !== projectId) return false;
    if (assignedUserId && task.assignedTo !== assignedUserId) return false;
    if (completedOn && !completedOnDay(task, completedOn)) return false;
    if (search && !matchesSearch(task, search)) return false;
    return true;
  };

  const loadedTasks = docs.filter(matchesColumn);
  const loaded = loadedTasks.length;
  const tasks = loadedTasks
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest first
    .slice(0, limit);

  const loading = !subscriptionReady;
  const hasMore = loaded < total;

  /** Refresh the column's total count from the server. */
  const refreshTotal = () => {
    if (!isActiveRef.current) return;
    const requestId = ++countRequestIdRef.current;
    api.call('projectTasks.getKanbanColumnCount',
      status, projectId, assignedUserId, completedOn, search,
      (error, count) => {
        if (error || !isActiveRef.current || requestId !== countRequestIdRef.current) return;
        setTotal(count || 0);
      });
  };

  const loadMore = () => {
    if (!subscriptionReady) return; // still loading
    if (loaded >= total || loaded < limit) return; // nothing more
    setRaisedLimit({ scopeKey, limit: limit + PAGE_SIZE });
  };

  // The scroll and drag & drop handlers below are set up once; these refs let
  // them reach the latest board and loadMore.
  const boardRef = useRef(board);
  boardRef.current = board;
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  // The total is refreshed on scope changes and whenever the board asks.
  useEffect(() => {
    refreshTotal();
  }, [scopeKey, board.countsRefreshKey]);

  // Tell the board which task docs this column holds.
  useEffect(() => {
    boardRef.current.setColumnTasks(status, docs);
  }, [status, docs]);

  useEffect(() => {
    isActiveRef.current = true;
    const container = containerRef.current;
    if (!container) return undefined;

    // Infinite scroll: raise the limit near the bottom (50px threshold).
    const scrollHandler = () => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
        loadMoreRef.current();
      }
    };
    container.addEventListener('scroll', scrollHandler);

    // Drag & drop between columns (SortableJS). The container persists across
    // re-renders (only the cards inside change), so this inits once.
    // Data flow on drop: revert Sortable's DOM move so it doesn't fight React,
    // call board.changeTaskStatus, and let the publications re-render both columns from
    // server truth (the server also stops the timer on non-timer statuses and
    // syncs the linked ticket, atomically).
    const sortable = new Sortable(container, {
      group: 'kanban-updated',
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      handle: '.kanban-task-card',
      draggable: '.kanban-task-card',
      // While a card is dragged, every column shows itself as a drop zone
      // (styles: body.kanban-dragging in task.css).
      onStart() {
        document.body.classList.add('kanban-dragging');
      },
      onEnd(evt) {
        document.body.classList.remove('kanban-dragging');
        if (!isActiveRef.current || evt.from === evt.to) return;

        const taskId = evt.item.getAttribute('data-task-id');
        const oldStatus = evt.from.getAttribute('data-status');
        const newStatus = evt.to.getAttribute('data-status');
        if (!taskId || !newStatus) return;

        // Hide the dragged card and return it to its source column. React
        // removes the hidden node as soon as the status change flows back
        // through the publication (the doc leaves the source column).
        evt.item.style.display = 'none';
        evt.from.insertBefore(evt.item, evt.from.children[evt.oldIndex] || null);

        boardRef.current.changeTaskStatus(taskId, newStatus, oldStatus, (error) => {
          if (error && isActiveRef.current) {
            evt.item.style.display = ''; // card stays in its source column
          }
        });
      }
    });

    return () => {
      isActiveRef.current = false;
      document.body.classList.remove('kanban-dragging');
      try { sortable.destroy(); } catch (e) { /* element may already be gone */ }
      container.removeEventListener('scroll', scrollHandler);
      boardRef.current.setColumnTasks(status, null);
    };
  }, []);

  const handleLoadMoreClick = (event) => {
    event.preventDefault();
    loadMore();
  };

  const handleMinimizeClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMinimized(!minimized);
  };

  return (
    <div className={`col${minimized ? ' col-minimized' : ''}`}>
      <div className={`kanban-column tone-${tone}${minimized ? ' minimized' : ''}`} data-column={columnKey}
        onClick={minimized ? () => setMinimized(false) : undefined}
        title={minimized ? `Expand ${status}` : undefined}>
        <div className="kanban-column-head">
          <div className="kanban-column-title">
            <span className="kanban-column-icon"><i className={`bx ${icon}`}></i></span>
            <h6>{status}</h6>
            <span className="kanban-count">{total}</span>
          </div>
          <button className="kanban-minimize-btn" data-column={columnKey}
            title={minimized ? 'Expand column' : 'Collapse column'} aria-label={minimized ? 'Expand column' : 'Collapse column'}
            onClick={handleMinimizeClick}>
            <i className={`bx ${minimized ? 'bx-expand-vertical' : 'bx-collapse-vertical'}`}></i>
          </button>
        </div>
        <div className="kanban-tasks-container" data-status={status} id={`${columnKey}-column`} ref={containerRef}>
          {tasks.map(task => (
            <TaskCardUpdated key={task._id} task={task} board={board} />
          ))}
          {!loading && tasks.length === 0 && (
            <div className="kanban-empty">
              <i className="bx bx-layer"></i>
              <span>{completedOn ? 'No tasks completed on this day' : 'No tasks here'}</span>
              <small>Drag a card into this column</small>
            </div>
          )}
          {loading && (
            <div className="kanban-loading" role="status" aria-label="Loading tasks">
              {(tasks.length === 0 ? [0, 1, 2] : [0]).map((i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {hasMore && (
            <div className="load-more-indicator" data-column={columnKey} onClick={handleLoadMoreClick}>
              <i className="bx bx-chevron-down"></i>
              <span>Load more · {total - loaded} left</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
