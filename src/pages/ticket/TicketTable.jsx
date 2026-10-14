/**
 * Table View of the ticket list.
 * onView / onEdit / onSendEmail / onDelete receive (event, ticketId).
 */
import moment from 'moment';
import TaskRequestTypeBadge from '../../components/TaskRequestTypeBadge';
import { TicketPriorityBadge, TicketStatusBadge } from './TicketBadges';
import { formatDateTime, hasAttachments, typeColorClass } from './ticketHelpers';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

export default function TicketTable({ tickets, onView, onEdit, onSendEmail, onDelete }) {
  // Clicking a row opens the ticket, unless the click was on its actions menu or a link
  const handleRowClick = (event, ticketId) => {
    if (event.target.closest('.dropdown, a, button')) return;
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
    <div className="card tk-table-card">
      <div className="table-responsive">
        <table className="table table-hover tk-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Client</th>
              <th>Type</th>
              <th>Request</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned to</th>
              <th>Created</th>
              <th className="text-end" width="96">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr className={'ticket-row' + (ticket.status === 'closed' ? ' is-closed' : '')} data-id={ticket._id} key={ticket._id}
                onClick={(event) => handleRowClick(event, ticket._id)}>
                <td>
                  <div className="tk-ticket-cell">
                    <a href="#" className="viewTicket tk-ticket-id" data-id={ticket._id}
                      onClick={(event) => onView(event, ticket._id)}>{ticket.ticketId}</a>
                    <span className="tk-ticket-subject" title={ticket.subject}>
                      {ticket.subject}
                      {hasAttachments(ticket.attachments) && <i className="bx bx-paperclip" title="Has attachments"></i>}
                    </span>
                  </div>
                </td>
                <td><span className="tk-client">{ticket.clientName}</span></td>
                <td><span className={'tk-type ' + typeColorClass(ticket.typeCode)}>{ticket.typeCode}</span></td>
                <td><TaskRequestTypeBadge requestType={ticket.requestType} fallback={<span className="text-muted">–</span>} /></td>
                <td><TicketPriorityBadge priority={ticket.priority} fallback="low" /></td>
                <td><TicketStatusBadge status={ticket.status} holdReason={ticket.holdReason} /></td>
                <td>
                  {ticket.assignedToName ? (
                    <span className="tk-assignee">
                      <span className="tk-avatar">{initials(ticket.assignedToName)}</span>
                      <span className="tk-assignee-name">{ticket.assignedToName}</span>
                    </span>
                  ) : (
                    <span className="tk-assignee tk-unassigned">
                      <span className="tk-avatar"><i className="bx bx-user"></i></span>Unassigned
                    </span>
                  )}
                </td>
                <td>
                  <span className="tk-created" title={formatDateTime(ticket.createdAt)}>
                    {ticket.createdAt ? moment(ticket.createdAt).fromNow() : '–'}
                  </span>
                </td>
                <td className="text-end">
                  <div className="tk-row-actions">
                    <button type="button" className="tk-icon-btn viewTicket" title="View" aria-label="View ticket"
                      onClick={(event) => onView(event, ticket._id)}>
                      <i className="bx bx-show"></i>
                    </button>
                    <div className="dropdown">
                      <button className="tk-icon-btn" type="button" data-bs-toggle="dropdown" aria-label="More actions">
                        <i className="bx bx-dots-vertical-rounded"></i>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><a className="dropdown-item viewTicket" href="#" data-id={ticket._id} onClick={(event) => onView(event, ticket._id)}><i className="bx bx-show me-2"></i>View</a></li>
                        <li><a className="dropdown-item editTicket" href="#" data-id={ticket._id} onClick={(event) => onEdit(event, ticket._id)}><i className="bx bx-edit-alt me-2"></i>Edit</a></li>
                        <li><a className="dropdown-item staffSendEmailBtn" href="#" data-id={ticket._id} onClick={(event) => onSendEmail(event, ticket._id)}><i className="bx bx-envelope me-2"></i>Send email</a></li>
                        <li><hr className="dropdown-divider" /></li>
                        <li><a className="dropdown-item text-danger deleteTicket" href="#" data-id={ticket._id} onClick={(event) => onDelete(event, ticket._id)}><i className="bx bx-trash me-2"></i>Delete</a></li>
                      </ul>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
