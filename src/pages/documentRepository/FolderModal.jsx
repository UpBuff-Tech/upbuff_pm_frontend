import { useState } from 'react';
import api from '../../api/client';

/**
 * Create/Edit Folder Modal of the page (#folderModal). Not the folder tree's own #folderFormModal.
 * `form` = { editFolderId, folderName, folderDescription }, changed with onChange({ folderName: '...' });
 * onSaved() is called after the folder was saved.
 */
export default function FolderModal({
  form, onChange, selectedFolderPath, selectedFolderId, selectedFolderProjectId, clientProjects, onSaved
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirmFolder = (event) => {
    event.preventDefault();

    const folderName = form.folderName.trim();
    const folderDescription = form.folderDescription.trim();
    const editFolderId = form.editFolderId;

    if (!folderName) {
      toastr.error('Please enter a folder name.');
      return;
    }

    // Get client's projects
    const projects = clientProjects;
    if (!projects || projects.length === 0) {
      toastr.error('No projects available. Please contact administrator.');
      return;
    }

    const parentId = selectedFolderId;

    // Use the projectId from the selected folder, or fall back to first project if at root
    let projectId = selectedFolderProjectId;
    if (!projectId) {
      projectId = projects[0]._id;
    }

    // Disable button
    setIsSaving(true);

    if (editFolderId) {
      // Update existing folder
      api.call('folders.update', editFolderId, {
        name: folderName,
        description: folderDescription,
        visibility: 'public' // Always public for client folders
      }, (error) => {
        setIsSaving(false);

        if (error) {
          toastr.error(error.reason || 'Failed to update folder');
          return;
        }

        toastr.success('Folder updated successfully!');
        $('#folderModal').modal('hide');

        onSaved();
      });
    } else {
      // Create new folder
      api.call('folders.create', {
        name: folderName,
        projectId: projectId,
        parentId: parentId,
        visibility: 'public', // Always public for client folders
        description: folderDescription
      }, (error) => {
        setIsSaving(false);

        if (error) {
          toastr.error(error.reason || 'Failed to create folder');
          return;
        }

        toastr.success('Folder created successfully!');
        $('#folderModal').modal('hide');

        onSaved();
      });
    }
  };

  return (
    <div className="modal fade" id="folderModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="folderModalTitle">
              <i className="fa fa-folder-plus me-2"></i>Create New Folder
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form id="folderForm">
              <input type="hidden" id="editFolderId" value={form.editFolderId} />

              {/* Parent Folder Info */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Parent Folder</label>
                <div className="alert alert-info py-2">
                  <i className="fa fa-folder-open me-1"></i>
                  <span id="parentFolderPath">{selectedFolderPath}</span>
                </div>
              </div>

              {/* Folder Name */}
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="folderName">Folder Name <span className="text-danger">*</span></label>
                <input type="text" className="form-control" id="folderName" name="folderName" required placeholder="Enter folder name"
                  value={form.folderName} onChange={(event) => onChange({ folderName: event.target.value })} />
              </div>

              {/* Folder Description */}
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="folderDescription">Description (Optional)</label>
                <textarea className="form-control" id="folderDescription" name="folderDescription" rows="2"
                  placeholder="Enter folder description"
                  value={form.folderDescription} onChange={(event) => onChange({ folderDescription: event.target.value })}></textarea>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="confirmFolder" disabled={isSaving} onClick={handleConfirmFolder}>
              {isSaving ? (
                <><i className="fa fa-spinner fa-spin me-1"></i>Saving...</>
              ) : (
                <><i className="fa fa-save me-1"></i>Save Folder</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
