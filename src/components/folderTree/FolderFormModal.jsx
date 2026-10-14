/**
 * Create/Edit Folder Modal (#folderFormModal).
 *
 * <FolderTree> renders one itself; a page may render another <FolderFormModal /> where the old page
 * included {{> folderFormModal}}. Whoever opens it says what it is for first:
 *
 *   setFolderFormModal({ editingFolderId: null, parentFolderId: null, parentFolderName: null });
 *   $('#folderFormModal').data('projectId', projectId);   // or .data('taskId', taskId)
 *   $('#folderFormModal').modal('show');
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { showButtonLoader } from '../loader';
import {
  getFolderFormModal,
  onPrefillFolderForm,
  refreshFolderTrees,
  resetFolderFormModal
} from './folderTreeState';

const VISIBILITIES = ['private', 'public'];

export default function FolderFormModal() {
  const modalRef = useRef(null);

  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderVisibility, setFolderVisibility] = useState('private');

  const resetForm = () => {
    setFolderName('');
    setFolderDescription('');
    setFolderVisibility('private');
  };

  // Pre-fill form (when a folder is opened for editing)
  useEffect(() => {
    return onPrefillFolderForm((values) => {
      setFolderName(values.name);
      setFolderDescription(values.description);
      if (VISIBILITIES.includes(values.visibility)) setFolderVisibility(values.visibility);
    });
  }, []);

  useEffect(() => {
    const modal = $(modalRef.current);
    const onHidden = () => {
      // Reset form when modal is closed
      resetForm();
      resetFolderFormModal();
    };
    modal.on('hidden.bs.modal', onHidden);
    return () => modal.off('hidden.bs.modal', onHidden);
  }, []);

  const handleSave = (event) => {
    event.preventDefault();

    const name = folderName.trim();
    const description = folderDescription.trim();
    const visibility = folderVisibility;

    if (!name) {
      toastr.error('Folder name is required');
      return;
    }

    const { editingFolderId, parentFolderId } = getFolderFormModal();

    const restoreButton = showButtonLoader('#saveFolderBtn', 'Saving...');

    if (editingFolderId) {
      // Update existing folder
      api.call('folders.update', editingFolderId, {
        name: name,
        description: description,
        visibility: visibility
      }, (error) => {
        restoreButton();
        if (error) {
          toastr.error(error.reason || 'Failed to update folder');
        } else {
          toastr.success('Folder updated successfully');
          $('#folderFormModal').modal('hide');
          resetForm();

          // Refresh folder tree
          refreshFolderTrees();
        }
      });
    } else {
      // Create new folder
      // Get project or task ID from modal data
      const modal = $('#folderFormModal');
      const projectId = modal.data('projectId');
      const taskId = modal.data('taskId');

      if (!projectId && !taskId) {
        toastr.error('Project or task context is required');
        restoreButton();
        return;
      }

      const folderData = {
        name: name,
        visibility: visibility || 'private' // Default to private if not set
      };

      // Only add optional fields if they have values (to avoid null/empty string validation issues)
      if (parentFolderId) {
        folderData.parentId = parentFolderId;
      }
      if (description) {
        folderData.description = description;
      }

      if (projectId) {
        folderData.projectId = projectId;
      } else if (taskId) {
        folderData.taskId = taskId;
      }

      api.call('folders.create', folderData, (error) => {
        restoreButton();
        if (error) {
          toastr.error(error.reason || 'Failed to create folder');
        } else {
          toastr.success('Folder created successfully');
          $('#folderFormModal').modal('hide');
          resetForm();

          // Refresh folder tree
          refreshFolderTrees();
        }
      });
    }
  };

  return (
    <div className="modal fade" id="folderFormModal" tabIndex="-1" ref={modalRef}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            {/* Mirrors what OLD displayed: the title always read "Create Folder", also while editing. */}
            <h5 className="modal-title">
              Create Folder
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal"></button>
          </div>

          <div className="modal-body">
            <form id="folderForm">
              <div className="mb-3">
                <label htmlFor="folderName" className="form-label">Folder Name <span className="text-danger">*</span></label>
                <input type="text" className="form-control" id="folderName"
                  placeholder="Enter folder name" required
                  value={folderName} onChange={(event) => setFolderName(event.target.value)} />
              </div>

              {/* Mirrors what OLD displayed: the "Parent Folder" block never appeared. */}

              <div className="mb-3">
                <label htmlFor="folderDescription" className="form-label">Description</label>
                <textarea className="form-control" id="folderDescription" rows="2"
                  placeholder="Optional description"
                  value={folderDescription} onChange={(event) => setFolderDescription(event.target.value)}></textarea>
              </div>

              <div className="mb-3">
                <label className="form-label">Visibility</label>
                <div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="folderVisibility"
                      value="private" id="visibilityPrivate"
                      checked={folderVisibility === 'private'} onChange={() => setFolderVisibility('private')} />
                    <label className="form-check-label" htmlFor="visibilityPrivate">
                      <i className="fa fa-lock text-warning"></i> Private (Team Only)
                    </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="folderVisibility"
                      value="public" id="visibilityPublic"
                      checked={folderVisibility === 'public'} onChange={() => setFolderVisibility('public')} />
                    <label className="form-check-label" htmlFor="visibilityPublic">
                      <i className="fa fa-globe text-success"></i> Public (Visible to Client)
                    </label>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            {/* Mirrors what OLD displayed: the button always read "Create Folder", also while editing. */}
            <button type="button" className="btn btn-primary" id="saveFolderBtn" onClick={handleSave}>
              Create Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
