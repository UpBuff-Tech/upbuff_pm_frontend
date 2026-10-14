/**
 * Comment Email Confirmation Modal (#commentEmailConfirmModal): asked before a comment is
 * added, "Do you want to send an email notification to the client about this comment?".
 *
 *   openCommentEmailConfirm(ticketId, comment);
 */
import { useState } from 'react';
import api from '../../api/client';
import { createModalHandle, useModalHandle } from './modalHandle';

const modal = createModalHandle();

export function openCommentEmailConfirm(ticketId, comment) {
  modal.call('open', ticketId, comment);
}

export default function CommentEmailConfirmModal({ onCommentAdded }) {
  const [pendingCommentTicketId, setPendingCommentTicketId] = useState('');
  const [pendingCommentText, setPendingCommentText] = useState('');

  const open = (ticketId, comment) => {
    setPendingCommentTicketId(ticketId);
    setPendingCommentText(comment);
    $('#commentEmailConfirmModal').modal('show');
  };

  useModalHandle(modal, { open });

  // Yes: add comment + send email.  No: add comment only.
  const addComment = (event, sendEmail) => {
    event.preventDefault();
    const ticketId = pendingCommentTicketId;
    const comment = pendingCommentText;
    if (!ticketId || !comment) return;

    $('#commentEmailConfirmModal').modal('hide');
    api.call('tickets.addComment', ticketId, comment, sendEmail, (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to add comment');
        return;
      }
      toastr.success(sendEmail ? 'Comment added and email sent to client' : 'Comment added');
      onCommentAdded(ticketId);
    });
  };

  return (
    <div className="modal fade" id="commentEmailConfirmModal" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title"><i className="fa fa-envelope me-2 text-primary"></i>Send Email Notification?</h6>
          </div>
          <div className="modal-body">
            <p className="mb-0" style={{ fontSize: '0.9rem' }}>Do you want to send an email notification to the client about this comment?</p>
            <input type="hidden" id="pendingCommentTicketId" value={pendingCommentTicketId} readOnly />
            <input type="hidden" id="pendingCommentText" value={pendingCommentText} readOnly />
          </div>
          <div className="modal-footer justify-content-between">
            <button type="button" className="btn btn-secondary btn-sm" id="commentNoEmailBtn" onClick={(event) => addComment(event, false)}>
              <i className="fa fa-comment me-1"></i>No, just comment
            </button>
            <button type="button" className="btn btn-primary btn-sm" id="commentSendEmailBtn" onClick={(event) => addComment(event, true)}>
              <i className="fa fa-paper-plane me-1"></i>Yes, send email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
