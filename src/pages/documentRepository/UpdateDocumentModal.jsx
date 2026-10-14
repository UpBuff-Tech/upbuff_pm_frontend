import { useEffect, useState } from 'react';
import api from '../../api/client';
import { destroyProjectSelect2, MAX_FILE_SIZE } from './documentHelpers';
import ProjectOptions from './ProjectOptions';

/**
 * Update Document Modal (#updateDocumentModal): replace a document with a new file.
 * `target` = { projectId, attachmentId, documentName } of the document; onUpdated() is called after the update.
 */
export default function UpdateDocumentModal({ target, clientProjects, fileInputRef, onUpdated }) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    return () => destroyProjectSelect2('#updateDocProjectId');
  }, []);

  const handleConfirmUpdate = (event) => {
    event.preventDefault();

    const originalProjectId = target.projectId;
    const attachmentId = target.attachmentId;
    const newProjectId = $('#updateDocProjectId').val();
    const fileInput = fileInputRef.current;

    if (!fileInput.files || fileInput.files.length === 0) {
      toastr.error('Please select a file to upload.');
      return;
    }

    const file = fileInput.files[0];

    if (file.size > MAX_FILE_SIZE) {
      toastr.error('File exceeds 5MB limit.');
      return;
    }

    // Disable button
    setIsUpdating(true);

    const reader = new FileReader();

    reader.onload = function (e) {
      const newAttachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result,
        newProjectId: newProjectId || null // Include new project ID for project change
      };

      api.call('project.clientUpdateAttachment', originalProjectId, attachmentId, newAttachment, (error) => {
        setIsUpdating(false);

        if (error) {
          toastr.error(error.reason || 'Failed to update document');
          return;
        }

        toastr.success('Document updated successfully!');
        $('#updateDocumentModal').modal('hide');

        // Refresh documents
        onUpdated();
      });
    };

    reader.onerror = function () {
      setIsUpdating(false);
      toastr.error('Failed to read file');
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="modal fade" id="updateDocumentModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-pencil me-2"></i>Update Document
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form id="updateDocumentForm">
              <input type="hidden" id="updateProjectId" value={target.projectId} />
              <input type="hidden" id="updateAttachmentId" value={target.attachmentId} />

              {/* Current Document Name */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Current Document</label>
                <div className="alert alert-secondary py-2">
                  <i className="fa fa-file me-1"></i>
                  <span id="currentDocumentName">{target.documentName}</span>
                </div>
              </div>

              {/* Project Selection (a select2 dropdown: read through jQuery when updating) */}
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="updateDocProjectId">Change Project</label>
                <select className="form-select" id="updateDocProjectId" name="updateDocProjectId" style={{ width: '100%' }}>
                  <option value="">-- Keep Current Project --</option>
                  <ProjectOptions projects={clientProjects} />
                </select>
                <small className="text-muted">Select a different project to move the document, or leave empty to keep current.</small>
              </div>

              {/* New File Input */}
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="newDocumentFile">Replace with New File</label>
                <input type="file" className="form-control" id="newDocumentFile" name="newDocumentFile" required ref={fileInputRef} />
                <small className="text-muted">Select a new file to replace the existing document. Maximum file size: 5MB.</small>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-warning" id="confirmUpdate" disabled={isUpdating} onClick={handleConfirmUpdate}>
              {isUpdating ? (
                <><i className="fa fa-spinner fa-spin me-1"></i>Updating...</>
              ) : (
                <><i className="fa fa-pencil me-1"></i>Update</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
