/**
 * Folder Browser Component
 * Modal for navigating and selecting folders during file upload (#folderBrowserModal).
 *
 *   <FolderBrowser onFolderSelected={(folderId, folderPath) => ...} />
 *
 *   openFolderBrowser((folderId, folderPath) => { ... });   // open it and get the chosen folder
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { setFolderFormModal } from '../folderTree/folderTreeState';
import './folderBrowser.css';

/** Utility function to open folder browser with callback (was window.openFolderBrowser) */
export function openFolderBrowser(callback) {
  const modal = $('#folderBrowserModal');
  modal.data('callback', callback);
  modal.modal('show');
}

export default function FolderBrowser({ onFolderSelected }) {
  const modalRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolders, setCurrentFolders] = useState([]);
  const [pathFolders, setPathFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const loadFolders = (folderId) => {
    setIsLoading(true);
    setCurrentFolderId(folderId);

    const options = {
      parentId: folderId,
      includeFiles: false,
      visibilityFilter: null
    };

    api.call('folders.getTree', options, (error, folders) => {
      setIsLoading(false);
      if (!error) {
        setCurrentFolders(folders || []);
      } else {
        toastr.error('Failed to load folders');
      }
    });

    // Load breadcrumb path
    if (folderId) {
      api.call('folders.getPath', folderId, (error, path) => {
        if (!error) {
          setPathFolders(path || []);
        }
      });
    } else {
      setPathFolders([]);
    }
  };

  useEffect(() => {
    // Load root folders initially
    loadFolders(null);

    const modal = $(modalRef.current);

    const onShown = () => {
      // Reset to root when modal is opened
      loadFolders(null);
      setSelectedFolderId(null);
    };

    const onHidden = () => {
      // Clean up callback
      modal.removeData('callback');
    };

    modal.on('shown.bs.modal', onShown);
    modal.on('hidden.bs.modal', onHidden);
    return () => {
      modal.off('shown.bs.modal', onShown);
      modal.off('hidden.bs.modal', onHidden);
    };
  }, []);

  const currentFolderPath = pathFolders.length === 0 ? 'Root' : pathFolders.map(f => f.name).join(' / ');

  const handleNavigate = (event, folderId) => {
    event.preventDefault();
    loadFolders(folderId || null);
    setSelectedFolderId(folderId || null);
  };

  const handleItemClick = (event, folderId) => {
    event.preventDefault();

    // Single click selects, double click navigates
    if (selectedFolderId === folderId) {
      // Double click - navigate into folder
      loadFolders(folderId);
    } else {
      // Single click - select folder
      setSelectedFolderId(folderId);
    }
  };

  const handleItemDoubleClick = (event, folderId) => {
    event.preventDefault();
    loadFolders(folderId);
    setSelectedFolderId(folderId);
  };

  const handleCreateNewFolderHere = (event) => {
    event.preventDefault();

    const folderId = currentFolderId;
    const parentFolderName = pathFolders.length > 0 ?
                             pathFolders[pathFolders.length - 1].name :
                             'Root';

    // Close folder browser and open folder form
    $('#folderBrowserModal').modal('hide');

    // Set up folder form modal
    setFolderFormModal({ editingFolderId: null, parentFolderId: folderId, parentFolderName: parentFolderName });

    // Open folder form modal
    setTimeout(() => {
      $('#folderFormModal').modal('show');

      // When folder is created, reopen browser
      $('#folderFormModal').one('hidden.bs.modal', () => {
        setTimeout(() => {
          $('#folderBrowserModal').modal('show');
          loadFolders(folderId);
        }, 300);
      });
    }, 300);
  };

  const handleConfirmSelection = (event) => {
    event.preventDefault();

    const folderId = currentFolderId;
    const folderPath = pathFolders.length > 0 ?
                      pathFolders.map(f => f.name).join(' / ') :
                      'Root (No Folder)';

    // Trigger callback if set
    const modal = $('#folderBrowserModal');
    const callback = modal.data('callback');
    if (callback && typeof callback === 'function') {
      callback(folderId, folderPath);
    }

    // Tell the page
    if (onFolderSelected) onFolderSelected(folderId, folderPath);

    // Close modal
    modal.modal('hide');
  };

  return (
    <div className="modal fade" id="folderBrowserModal" tabIndex="-1" ref={modalRef}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-folder-open"></i> Select Folder
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal"></button>
          </div>

          <div className="modal-body">
            {/* Breadcrumb Navigation */}
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <a href="#" className="navigate-to-folder" data-folder-id="" onClick={(event) => handleNavigate(event, null)}>
                    <i className="fa fa-home"></i> Root
                  </a>
                </li>
                {pathFolders.map((folder) => (
                  <li className="breadcrumb-item" key={folder._id}>
                    <a href="#" className="navigate-to-folder" data-folder-id={folder._id}
                      onClick={(event) => handleNavigate(event, folder._id)}>
                      {folder.name}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Current Location Info */}
            <div className="alert alert-info py-2 mb-3">
              <i className="fa fa-info-circle"></i>
              <strong>Current Location:</strong>
              {' '}{currentFolderId ? currentFolderPath : 'Root (No Folder)'}
            </div>

            {/* Folder List */}
            <div className="folder-browser-list">
              {isLoading ? (
                // Loading State
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2">Loading folders...</p>
                </div>
              ) : currentFolders.length > 0 ? (
                <div className="list-group">
                  {currentFolders.map((folder) => (
                    // The old template compared with `../selectedFolderId` (a field of the surrounding data
                    // context, which has none), so the selected row never got the "active" class.
                    <div className="list-group-item list-group-item-action folder-browser-item " key={folder._id}
                      data-folder-id={folder._id}
                      onClick={(event) => handleItemClick(event, folder._id)}
                      onDoubleClick={(event) => handleItemDoubleClick(event, folder._id)}>
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <i className={`fa fa-folder ${folder.visibility === 'public' ? 'text-success' : 'text-warning'} fa-2x`}></i>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-0">{folder.name}</h6>
                          {folder.description && (
                            <small className="text-muted">{folder.description}</small>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`badge ${folder.visibility === 'public' ? 'bg-success' : 'bg-warning'}`}>
                            {folder.visibility === 'public' ? (
                              <><i className="fa fa-globe"></i> Public</>
                            ) : (
                              <><i className="fa fa-lock"></i> Private</>
                            )}
                          </span>
                          <i className="fa fa-chevron-right ms-2"></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fa fa-folder-open fa-3x text-muted"></i>
                  <p className="text-muted mt-3">No subfolders in this location</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3">
              <button className="btn btn-outline-secondary btn-sm create-new-folder-here" onClick={handleCreateNewFolderHere}>
                <i className="fa fa-plus"></i> Create New Folder Here
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary confirm-folder-selection" onClick={handleConfirmSelection}>
              <i className="fa fa-check"></i> Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
