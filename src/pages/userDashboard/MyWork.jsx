/**
 * "My work today" on My Dashboard: the open tasks and open tickets assigned to me, with counts per
 * status and a short list of the most relevant ones (in progress / nearest due date first).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import api, { onDataChanged } from '../../api/client';

const TICKET_STATUS_LABELS = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  in_review: 'In Review',
};

/** "In Progress" / "in_progress" -> "in-progress", used for the status colour class. */
function statusClass(status) {
  return 's-' + String(status || '').toLowerCase().replace(/[\s_]+/g, '-');
}

function dueText(date, isOverdue) {
  if (!date) return '';
  const days = moment(date).startOf('day').diff(moment().startOf('day'), 'days');
  if (isOverdue) return 'Overdue · ' + moment(date).format('D MMM');
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return 'Due ' + moment(date).format('D MMM');
}

export default function MyWork() {
  const [work, setWork] = useState(null);

  useEffect(() => {
    const load = () => {
      api.call('userDashboard.getMyWork', (err, data) => {
        if (err) {
          setWork({ tasks: null, tickets: null });
          return;
        }
        setWork(data);
      });
    };
    load();
    // A status change or a new assignment anywhere in the app updates the lists
    return onDataChanged(load);
  }, []);

  const loading = !work;
  const tasks = work && work.tasks;
  const tickets = work && work.tickets;

  return (
    <div className="row g-3 mb-3">
      <div className="col-xl-6">
        <div className="card h-100 ud-card">
          <div className="ud-card-head">
            <div>
              <h5>My tasks</h5>
              <p>{tasks ? openSummary(tasks.total, tasks.overdue, 'task') : 'Tasks assigned to you that are not completed'}</p>
            </div>
            <Link to="/task/list" className="ud-link">View all</Link>
          </div>
          <div className="ud-card-body pt-0">
            {loading ? [0, 1, 2].map((i) => <span key={i} className="fx-skeleton ud-sk-row"></span>) : !tasks ? (
              <div className="ud-empty">Could not load your tasks.</div>
            ) : (
              <>
                <StatusCounts counts={tasks.counts} />
                {tasks.items.length === 0 ? (
                  <div className="ud-empty">Nothing pending — nice! 🎉</div>
                ) : (
                  <ul className="ud-list">
                    {tasks.items.map((t) => (
                      <li key={t._id}>
                        <Link to="/task/list" className={'ud-work-item' + (t.isOverdue ? ' is-overdue' : '')}>
                          <span className="ud-request-icon"><i className="bx bx-task"></i></span>
                          <span className="ud-request-text">
                            <strong>{t.taskName || 'Untitled task'}</strong>
                            <small>
                              {t.taskId}{t.projectName ? ' · ' + t.projectName : ''}
                              {t.dueDate && <span className="ud-work-due"> · {dueText(t.dueDate, t.isOverdue)}</span>}
                            </small>
                          </span>
                          <span className={'ud-status ' + statusClass(t.status)}>{t.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="col-xl-6">
        <div className="card h-100 ud-card">
          <div className="ud-card-head">
            <div>
              <h5>My tickets</h5>
              <p>{tickets ? openSummary(tickets.total, tickets.overdue, 'ticket') : 'Tickets assigned to you that are not closed'}</p>
            </div>
            <Link to="/ticket/list" className="ud-link">View all</Link>
          </div>
          <div className="ud-card-body pt-0">
            {loading ? [0, 1, 2].map((i) => <span key={i} className="fx-skeleton ud-sk-row"></span>) : !tickets ? (
              <div className="ud-empty">Could not load your tickets.</div>
            ) : (
              <>
                <StatusCounts counts={tickets.counts} labels={TICKET_STATUS_LABELS} />
                {tickets.items.length === 0 ? (
                  <div className="ud-empty">Nothing pending — nice! 🎉</div>
                ) : (
                  <ul className="ud-list">
                    {tickets.items.map((t) => (
                      <li key={t._id}>
                        <Link to="/ticket/list" className={'ud-work-item' + (t.isOverdue ? ' is-overdue' : '')}>
                          <span className="ud-request-icon t-ticket"><i className="bx bx-support"></i></span>
                          <span className="ud-request-text">
                            <strong>{t.subject || 'No subject'}</strong>
                            <small>
                              {t.ticketId}{t.clientName ? ' · ' + t.clientName : ''}
                              {t.priority && <span className={'ud-priority p-' + t.priority}> · {t.priority}</span>}
                              {t.dueDate && <span className="ud-work-due"> · {dueText(t.dueDate, t.isOverdue)}</span>}
                            </small>
                          </span>
                          <span className={'ud-status ' + statusClass(t.status)}>{TICKET_STATUS_LABELS[t.status] || t.status || 'Open'}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "5 open · 2 overdue" */
function openSummary(total, overdue, noun) {
  if (!total) return 'No open ' + noun + 's assigned to you';
  return total + ' open ' + noun + (total === 1 ? '' : 's') + (overdue ? ' · ' + overdue + ' overdue' : '');
}

/** One small pill per status with its count, e.g. "In Progress 3". */
function StatusCounts({ counts, labels }) {
  const statuses = Object.keys(counts || {});
  if (statuses.length === 0) return null;
  return (
    <div className="ud-work-counts">
      {statuses.map((status) => (
        <span key={status} className={'ud-status ' + statusClass(status) + (counts[status] ? '' : ' is-zero')}>
          {(labels && labels[status]) || status} <strong>{counts[status]}</strong>
        </span>
      ))}
    </div>
  );
}
