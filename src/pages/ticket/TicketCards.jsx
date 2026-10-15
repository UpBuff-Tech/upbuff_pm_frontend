/**
 * Card View of the ticket list. onView receives (event, ticketId).
 */
import moment from 'moment';
import TaskRequestTypeBadge from '../../components/TaskRequestTypeBadge';
import { TicketPriorityBadge, TicketStatusBadge } from './TicketBadges';
import {
  calcElapsedHours,
  formatDateTime,
  formatHours,
  hasAttachments,
  showProgress,
  typeColorClass
} from './ticketHelpers';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

/** Hours logged against the estimate (the list has always assumed 8h when there is none). */
function progressOf(ticket) {
  const estimated = ticket.estimatedHours || 8;
  const logged = calcElapsedHours(ticket);
  return { logged, estimated, percent: Math.min(100, Math.round((logged / estimated) * 100)), over: logged > estimated };
}

export default function TicketCards({ tickets, onView }) {
  // Click on card to view ticket
  const handleCardClick = (event, ticketId) => {
    // Don't trigger if clicking on dropdown or buttons
    if (event.target.closest('.dropdown, .viewTicket, .editTicket, .deleteTicket')) return;
    onView(event, ticketId);
  };

  if (tickets.length === 0) {
    return (
      <div className="card">
        <div className="tk-empty">
          <span className="tk-empty-icon"><i className="bx bx-receipt"></i></span>
          <h5>No tickets found</h5>
          <p>Try clearing the filters, or click &quot;Create Ticket&quot; to add one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tk-card-grid">
      {tickets.map((ticket) => {
        const progress = showProgress(ticket.status) ? progressOf(ticket) : null;
        return (
          <div key={ticket._id} role="button" tabIndex={0}
            className={'ticket-card tk-card st-' + ticket.status + (ticket.status === 'closed' ? ' card-closed' : '')}
            data-id={ticket._id}
            onClick={(event) => handleCardClick(event, ticket._id)}
            onKeyDown={(event) => { if (event.key === 'Enter') handleCardClick(event, ticket._id); }}>
            {/* ID + age */}
            <div className="tk-card-top">
              <a href="#" className="viewTicket tk-card-id" data-id={ticket._id}
                onClick={(event) => onView(event, ticket._id)}>{ticket.ticketId}</a>
              <span className="tk-card-age" title={formatDateTime(ticket.createdAt)}>
                <i className="bx bx-time-five"></i>{ticket.createdAt ? moment(ticket.createdAt).fromNow(true) : '–'}
              </span>
            </div>

            {/* Subject: always two lines tall, so the cards of a row line up */}
            <div className="tk-card-subject" title={ticket.subject}>
              {ticket.subject}
              {hasAttachments(ticket.attachments) && <i className="bx bx-paperclip" title="Has attachments"></i>}
            </div>

            {/* Client + type */}
            <div className="tk-card-meta">
              <span className="tk-card-client" title={ticket.clientName || ''}>
                <i className="bx bx-buildings"></i>{ticket.clientName || 'No client'}
              </span>
              <span className="tk-card-tags">
                {ticket.typeCode && <span className={'tk-type ' + typeColorClass(ticket.typeCode)}>{ticket.typeCode}</span>}
                <TaskRequestTypeBadge requestType={ticket.requestType} />
              </span>
            </div>

            {progress && (
              <div className={'tk-card-progress' + (progress.over ? ' is-over' : '') + (ticket.status === 'on_hold' ? ' is-hold' : '')}
                title={`${progress.logged}h logged / ${formatHours(ticket.estimatedHours) || 8}h estimated`}>
                <div className="tk-progress-track"><span style={{ width: progress.percent + '%' }}></span></div>
                <span className="tk-progress-label">{progress.logged}h / {progress.estimated}h</span>
              </div>
            )}

            {/* Status + priority, assignee */}
            <div className="tk-card-footer">
              <span className="tk-card-state">
                <TicketStatusBadge status={ticket.status} holdReason={ticket.holdReason} />
                <TicketPriorityBadge priority={ticket.priority} fallback="low" />
              </span>
              {ticket.assignedToName ? (
                <span className="tk-assignee" title={'Assigned to ' + ticket.assignedToName}>
                  <span className="tk-avatar">{initials(ticket.assignedToName)}</span>
                  <span className="tk-assignee-name">{ticket.assignedToName.split(' ')[0]}</span>
                </span>
              ) : (
                <span className="tk-assignee tk-unassigned" title="Unassigned">
                  <span className="tk-avatar"><i className="bx bx-user"></i></span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
