/**
 * View Ticket Modal (#viewTicketModal) of the client ticket page: details, attachments, comments,
 * "add comment" and "close ticket".
 *
 *   <ViewTicketModal ticket={viewedTicket} newComment={newComment} onNewCommentChange={setNewComment}
 *     onTicketChanged={loadTickets} onPreviewImage={showImagePreview} />
 *
 * `ticket` is the ticket the page last opened (nothing until the first "View" click).
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { DetailHeader, DetailSection, DetailGrid, DetailField, Pill, Person, EmptyState, colorFor, initialsOf } from '../../components/detailModal/DetailModal';
import TicketAttachmentRow from './TicketAttachmentRow';
import {
  formatTicketDate,
  formatTicketPriority,
  formatTicketStatus,
  ticketPriorityBadgeClass,
  ticketStatusBadgeClass
} from './utils';
import '../ticket/ticketDetail.css';

const HIDDEN = { display: 'none' };

// Bootstrap badge class ("bg-danger", "bg-label-info", ...) -> Pill tone
const BADGE_TONES = { success: 'green', warning: 'amber', danger: 'red', info: 'cyan', primary: 'indigo', secondary: 'gray', dark: 'gray' };

function toneOf(badgeClass) {
  const match = /bg-(?:label-)?(\w+)/.exec(badgeClass || '');
  return (match && BADGE_TONES[match[1]]) || 'gray';
}

export default function ViewTicketModal({ ticket, newComment, onNewCommentChange, onTicketChanged, onPreviewImage }) {
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Reset the view modal footer to default whenever it's closed
  useEffect(() => {
    const modal = $('#viewTicketModal');
    const onHidden = () => setIsConfirmingClose(false);
    modal.on('hidden.bs.modal', onHidden);
    return () => modal.off('hidden.bs.modal', onHidden);
  }, []);

  const ticketMongoId = ticket ? ticket._id : '';
  const attachments = (ticket && ticket.attachments) || [];
  const comments = (ticket && ticket.comments) || [];

  const handleAddComment = (event) => {
    event.preventDefault();

    const ticketId = ticketMongoId;
    const commentText = newComment.trim();

    if (!commentText) {
      toastr.error('Please enter a comment');
      return;
    }

    setIsAddingComment(true);

    api.call('tickets.addClientComment', ticketId, commentText, (error, result) => {
      setIsAddingComment(false);

      if (error) {
        toastr.error(error.reason || 'Failed to add comment');
        return;
      }

      toastr.success('Comment added');
      onNewCommentChange('');

      // Reload tickets to get updated comments
      onTicketChanged();

      // Re-open the modal with updated data after a short delay
      setTimeout(() => {
        $(`.viewTicketBtn[data-id="${ticketId}"]`).click();
      }, 500);
    });
  };

  const handleCloseTicket = (event) => {
    event.preventDefault();
    // Swap to confirmation footer — ticket details remain fully visible
    setIsConfirmingClose(true);
  };

  const handleCancelClose = (event) => {
    event.preventDefault();
    setIsConfirmingClose(false);
  };

  const handleConfirmClose = (event) => {
    event.preventDefault();
    const ticketId = ticketMongoId;

    setIsClosing(true);

    api.call('tickets.closeByClient', ticketId, (error) => {
      setIsClosing(false);

      if (error) {
        toastr.error(error.reason || 'Failed to close ticket');
        return;
      }

      toastr.success('Ticket closed successfully');
      $('#viewTicketModal').modal('hide');
      // Reset footer state for next open
      setIsConfirmingClose(false);
      onTicketChanged();
    });
  };

  return (
    <div className="modal fade dm-modal" id="viewTicketModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">
          <DetailHeader
            icon="bx-support"
            tone={ticket ? toneOf(ticketStatusBadgeClass(ticket.status)) : 'indigo'}
            eyebrow={<span id="viewTicketId">{ticket ? ticket.ticketId : 'Ticket'}</span>}
            title={<span id="viewTicketSubject">{ticket ? ticket.subject : 'Ticket Details'}</span>}
            meta={ticket && (
              <>
                <span id="viewTicketStatus">
                  <Pill tone={toneOf(ticketStatusBadgeClass(ticket.status))} dot>{formatTicketStatus(ticket.status)}</Pill>
                </span>
                <span id="viewTicketPriority">
                  <Pill tone={toneOf(ticketPriorityBadgeClass(ticket.priority))} icon="bx-flag">{formatTicketPriority(ticket.priority, ticket.priority)}</Pill>
                </span>
                <span className="dm-meta">
                  <i className="bx bx-calendar"></i>Created on <span id="viewTicketDate">{formatTicketDate(ticket.createdAt)}</span>
                </span>
              </>
            )}
          />
          <div className="modal-body p-0">
            <div className="dm-body">
              <div className="row g-3">
                <div className="col-lg-8 d-flex flex-column gap-3">
                  {/* Description */}
                  <DetailSection title="Description" icon="bx-message-detail">
                    {ticket && ticket.description ? (
                      <p id="viewTicketDescription" className="dm-callout mb-0">{ticket.description}</p>
                    ) : (
                      <p id="viewTicketDescription" className="dm-value is-empty mb-0">No description provided</p>
                    )}
                  </DetailSection>

                  {/* Attachments */}
                  <div id="viewAttachmentsSection" style={attachments.length > 0 ? undefined : HIDDEN}>
                    <DetailSection title="Attachments" icon="bx-paperclip" count={<span id="viewAttachmentsCount">{attachments.length}</span>}>
                      <div id="viewAttachmentsContainer" className="dm-files">
                        {attachments.map((attachment, index) => (
                          <TicketAttachmentRow key={ticketMongoId + index} attachment={attachment} onPreviewImage={onPreviewImage} />
                        ))}
                      </div>
                    </DetailSection>
                  </div>

                  {/* Comments Section */}
                  <DetailSection title="Comments" icon="bx-comment" count={comments.length}>
                    <div id="commentsContainer" className="tdm-comments">
                      {comments.length > 0 ? comments.map((comment, index) => (
                        <div key={index} className={'tdm-comment' + (comment.isClientComment ? ' is-client' : '')}>
                          <span className="dm-person-avatar" style={{ '--c': colorFor(comment.userName) }}>{initialsOf(comment.userName)}</span>
                          <div className="tdm-comment-bubble">
                            <div className="tdm-comment-head">
                              <strong>{comment.userName}</strong>
                              <small>{formatTicketDate(comment.createdAt)}</small>
                            </div>
                            <p className="tdm-comment-text">{comment.text}</p>
                          </div>
                        </div>
                      )) : (
                        <EmptyState icon="bx-message-rounded">No comments yet</EmptyState>
                      )}
                    </div>

                    {/* Add Comment (hidden for closed tickets) */}
                    <div className="tdm-comment-box" id="addCommentSection" style={ticket && ticket.status === 'closed' ? HIDDEN : undefined}>
                      <label className="dm-label" htmlFor="newComment">Add Comment</label>
                      <div className="input-group">
                        <textarea className="form-control" id="newComment" rows="2" placeholder="Type your message..."
                          value={newComment} onChange={(event) => onNewCommentChange(event.target.value)}></textarea>
                        <button className="btn btn-primary" type="button" id="addCommentBtn" disabled={isAddingComment} onClick={handleAddComment} title="Send">
                          {isAddingComment ? <span className="spinner-border spinner-border-sm"></span> : <i className="bx bx-send"></i>}
                        </button>
                      </div>
                    </div>
                  </DetailSection>
                </div>

                <div className="col-lg-4 d-flex flex-column gap-3">
                  {/* Assigned To */}
                  <div id="assignedToSection" style={ticket && ticket.assignedToName ? undefined : HIDDEN}>
                    <DetailSection title="Assigned To" icon="bx-user">
                      <div id="viewAssignedTo">
                        {ticket && ticket.assignedToName && <Person name={ticket.assignedToName} inline />}
                      </div>
                    </DetailSection>
                  </div>

                  {/* Contact Details */}
                  <DetailSection title="Contact Details" icon="bx-phone">
                    <DetailGrid cols={1}>
                      <DetailField label="Contact Person" icon="bx-user" id="viewContactPerson">{ticket && ticket.contactPerson}</DetailField>
                      <DetailField label="Email" icon="bx-envelope" id="viewContactEmail">{ticket && ticket.contactEmail}</DetailField>
                      <DetailField label="Contact Number" icon="bx-phone" id="viewContactNumber">{ticket && ticket.contactNumber}</DetailField>
                    </DetailGrid>
                  </DetailSection>
                </div>
              </div>
            </div>
            <input type="hidden" id="viewTicketMongoId" value={ticketMongoId} readOnly />
          </div>
          {/* Default footer */}
          <div className={'modal-footer dm-footer' + (isConfirmingClose ? ' d-none' : '')} id="viewTicketFooterDefault">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            {/* Close Ticket is offered only when the ticket is in_review */}
            <button type="button" className={'btn btn-success' + (ticket && ticket.status === 'in_review' ? '' : ' d-none')} id="closeTicketBtn"
              onClick={handleCloseTicket}>
              <i className="bx bx-check-circle me-1"></i>Close Ticket
            </button>
          </div>
          {/* Inline confirmation footer (shown when Close Ticket is clicked) */}
          <div className={'modal-footer dm-footer' + (isConfirmingClose ? '' : ' d-none')} id="viewTicketFooterConfirm">
            <div className="w-100">
              <p className="tdm-confirm-note">
                <i className="bx bx-info-circle text-warning me-1"></i>
                Closing this ticket confirms you have reviewed the work and are satisfied. This action cannot be undone.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" id="cancelCloseTicketBtn" onClick={handleCancelClose}>Cancel</button>
                <button type="button" className="btn btn-success" id="confirmCloseTicketBtn" disabled={isClosing} onClick={handleConfirmClose}>
                  <span className={'spinner-border spinner-border-sm me-1' + (isClosing ? '' : ' d-none')} id="closeSpinner"></span>
                  Yes, Close Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
