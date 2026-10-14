/**
 * Move Attachment to Folder Modal (#moveAttachmentModal).
 *
 *   <MoveAttachmentModal />
 *
 *   openMoveAttachmentModal({ projectId, fileName, currentFolderId, onMoved });
 *   // onMoved(fileName, newFolderId) is called when the user confirms
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { createComponentHandle } from './projectHelpers';

const handle = createComponentHandle();

/** Open move to folder modal */
export function openMoveAttachmentModal(request) {
  handle.call('open', request);
}

/**
 * The folders of a project as dropdown options, children under their parent,
 * with indentation based on hierarchy.
 */
function buildFolderOptions(folders) {
  const options = [];
  const getChildren = (parentId) => folders.filter(f => f.parentId === parentId);

  const addFolderOptions = (folderList, level = 0) => {
    folderList.forEach(folder => {
      const indent = ' '.repeat(level * 4);
      const prefix = level > 0 ? '└─ ' : '';
      options.push({ value: folder._id, label: `${indent}${prefix}${folder.name}` });

      // Add children
      const children = getChildren(folder._id);
      if (children.length > 0) {
        addFolderOptions(children, level + 1);
      }
    });
  };
  addFolderOptions(folders.filter(f => !f.parentId));

  return options;
}

export default function MoveAttachmentModal() {
  // What openMoveAttachmentModal() was called with
  const requestRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [folderOptions, setFolderOptions] = useState([]);
  const [destFolder, setDestFolder] = useState('');

  const open = (request) => {
    const currentFolderId = request.currentFolderId || '';
    requestRef.current = request;

    // Set modal values
    setFileName(request.fileName);

    // Load ALL folders for the project (use folders.getAllForProject method)
    api.call('folders.getAllForProject', request.projectId, (error, folders) => {
      if (error) {
        console.error('Error loading folders:', error);
        toastr.error('Failed to load folders');
        return;
      }

      // Populate folder dropdown
      const options = folders && folders.length > 0 ? buildFolderOptions(folders) : [];
      setFolderOptions(options);
      setDestFolder(options.some(option => option.value === currentFolderId) ? currentFolderId : '');

      // Show modal
      $('#moveAttachmentModal').modal('show');
    });
  };

  // Let openMoveAttachmentModal() reach this modal
  useEffect(() => handle.register({ open }));

  /**
   * Confirm move attachment to folder
   */
  const confirmMove = (event) => {
    event.preventDefault();
    const request = requestRef.current;
    const newFolderId = destFolder || null;
    const projectId = request.projectId;

    // Update the attachment's folderId in the page
    request.onMoved(fileName, newFolderId);

    // Also update in database for saved projects
    if (projectId) {
      api.call('project.moveAttachmentToFolderByName', {
        projectId: projectId,
        attachmentName: fileName,
        folderId: newFolderId
      }, (error) => {
        if (error) {
          console.error('Error moving attachment:', error);
          // Don't show error - local update already done
        }
      });
    }

    // Close modal
    $('#moveAttachmentModal').modal('hide');

    // Show success message
    const selectedOption = folderOptions.find(option => option.value === newFolderId);
    const folderName = selectedOption ? selectedOption.label.trim() : 'Root (No Folder)';
    toastr.success(`Document moved to ${folderName}`);
  };

  return (
    <div className="modal fade" id="moveAttachmentModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-folder me-2"></i>Move to Folder
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id="moveAttachmentFilename" value={fileName} readOnly />

            <div className="mb-3">
              <label className="form-label fw-semibold">Document</label>
              <div className="alert alert-secondary py-2 mb-0">
                <i className="fa fa-file me-1"></i>
                <span id="moveAttachmentDocName">{fileName}</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Select Destination Folder</label>
              <select className="form-select" id="moveAttachmentDestFolder" value={destFolder} onChange={(event) => setDestFolder(event.target.value)}>
                <option value="">-- Root (No Folder) --</option>
                {folderOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <small className="text-muted">Select a folder or choose &quot;Root&quot; to remove from folder.</small>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="confirmMoveAttachment" onClick={confirmMove}>
              <i className="fa fa-folder me-1"></i>Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
