import { useState } from 'react';
import api from '../../api/client';

/**
 * Delete Confirmation Modal (#deleteConfirmModal).
 * `target` = { projectId, attachmentId, documentName } of the document; onDeleted() is called after the delete.
 */
export default function DeleteConfirmModal({ target, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = (event) => {
    event.preventDefault();

    const projectId = target.projectId;
    const attachmentId = target.attachmentId;

    if (!projectId || !attachmentId) {
      toastr.error('Invalid document');
      return;
    }

    // Disable button
    setIsDeleting(true);

    api.call('project.clientRemoveAttachment', projectId, attachmentId, (error) => {
      setIsDeleting(false);

      if (error) {
        toastr.error(error.reason || 'Failed to delete document');
        return;
      }

      toastr.success('Document deleted successfully!');
      $('#deleteConfirmModal').modal('hide');

      // Refresh documents
      onDeleted();
    });
  };

  return (
    <div className="modal fade" id="deleteConfirmModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-sm">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="fa fa-exclamation-triangle me-2"></i>Confirm Delete
            </h5>
            <button type="button" className="btn-close btn-close-white" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id="deleteProjectId" value={target.projectId} />
            <input type="hidden" id="deleteAttachmentId" value={target.attachmentId} />
            <p>Are you sure you want to delete this document?</p>
            <p className="fw-bold text-danger" id="deleteDocumentName">{target.documentName}</p>
            <p className="text-muted small">This action cannot be undone.</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-danger" id="confirmDelete" disabled={isDeleting} onClick={handleConfirmDelete}>
              {isDeleting ? (
                <><i className="fa fa-spinner fa-spin me-1"></i>Deleting...</>
              ) : (
                <><i className="fa fa-trash me-1"></i>Delete</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
