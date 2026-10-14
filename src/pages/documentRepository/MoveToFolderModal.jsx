import { useState } from 'react';
import api from '../../api/client';

/**
 * Move to Folder Modal (#moveToFolderModal).
 * `target` = { projectId, attachmentId, documentName } of the document; onMoved() is called after the move.
 */
export default function MoveToFolderModal({ target, availableFolders, destinationFolderId, setDestinationFolderId, onMoved }) {
  const [isMoving, setIsMoving] = useState(false);

  const handleConfirmMove = (event) => {
    event.preventDefault();

    const projectId = target.projectId;
    const attachmentId = target.attachmentId;

    // A folder that is not in the dropdown cannot be chosen: the document then goes to the root.
    const isListed = availableFolders.some((folder) => folder._id === destinationFolderId);
    const folderId = isListed ? destinationFolderId : null;

    if (!projectId || !attachmentId) {
      toastr.error('Invalid document');
      return;
    }

    // Disable button
    setIsMoving(true);

    api.call('project.moveAttachmentToFolder', projectId, attachmentId, folderId, (error) => {
      setIsMoving(false);

      if (error) {
        toastr.error(error.reason || 'Failed to move document');
        return;
      }

      toastr.success('Document moved successfully!');
      $('#moveToFolderModal').modal('hide');

      // Refresh documents
      onMoved();
    });
  };

  return (
    <div className="modal fade" id="moveToFolderModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-folder me-2"></i>Move Document to Folder
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id="moveProjectId" value={target.projectId} />
            <input type="hidden" id="moveAttachmentId" value={target.attachmentId} />

            <div className="mb-3">
              <label className="form-label fw-semibold">Document</label>
              <div className="alert alert-secondary py-2">
                <i className="fa fa-file me-1"></i>
                <span id="moveDocumentName">{target.documentName}</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Select Destination Folder</label>
              <select className="form-select" id="destinationFolderId"
                value={destinationFolderId} onChange={(event) => setDestinationFolderId(event.target.value)}>
                <option value="">-- Root (No Folder) --</option>
                {availableFolders.map((folder) => (
                  <option value={folder._id} key={folder._id}>{folder.name}</option>
                ))}
              </select>
              <small className="text-muted">Select a folder to move the document to, or choose Root to remove from any folder.</small>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="confirmMoveToFolder" disabled={isMoving} onClick={handleConfirmMove}>
              {isMoving ? (
                <><i className="fa fa-spinner fa-spin me-1"></i>Moving...</>
              ) : (
                <><i className="fa fa-folder me-1"></i>Move</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
