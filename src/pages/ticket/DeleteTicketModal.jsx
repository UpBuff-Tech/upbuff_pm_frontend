/**
 * Delete Confirmation Modal (#deleteTicketModal).
 *
 *   openDeleteTicketModal(ticket);
 */
import { useState } from 'react';
import api from '../../api/client';
import { createModalHandle, useModalHandle } from './modalHandle';

const modal = createModalHandle();

export function openDeleteTicketModal(ticket) {
  modal.call('open', ticket);
}

export default function DeleteTicketModal({ onTicketDeleted }) {
  const [deleteTicketId, setDeleteTicketId] = useState('');
  const [deleteTicketIdText, setDeleteTicketIdText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const open = (ticket) => {
    setDeleteTicketId(ticket._id);
    setDeleteTicketIdText(ticket.ticketId);
    $('#deleteTicketModal').modal('show');
  };

  useModalHandle(modal, { open });

  // Confirm delete
  const confirmDelete = (event) => {
    event.preventDefault();
    const ticketId = deleteTicketId;

    setDeleting(true);

    api.call('tickets.delete', ticketId, (error) => {
      setDeleting(false);
      if (error) {
        toastr.error(error.reason || 'Failed to delete ticket');
        return;
      }
      toastr.success('Ticket deleted successfully');
      $('#deleteTicketModal').modal('hide');
      onTicketDeleted();
    });
  };

  return (
    <div className="modal fade" id="deleteTicketModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Delete Ticket</h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete ticket <strong id="deleteTicketIdText">{deleteTicketIdText}</strong>?</p>
            <p className="text-danger"><i className="fa fa-exclamation-triangle me-1"></i> This action cannot be undone.</p>
            <input type="hidden" id="deleteTicketId" value={deleteTicketId} readOnly />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-danger" id="confirmDeleteTicket" disabled={deleting} onClick={confirmDelete}>
              {deleting ? <><i className="fa fa-spinner fa-spin"></i> Deleting...</> : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
