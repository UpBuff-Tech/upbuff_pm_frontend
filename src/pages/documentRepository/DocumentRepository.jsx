/**
 * Document Repository: the public documents of the client's projects, by folder.
 * Folder tree on the left, documents on the right, and modals to upload / update / delete / move a
 * document and to create a folder.
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import FolderTree from '../../components/folderTree/FolderTree';
import { refreshFolderTrees } from '../../components/folderTree/folderTreeState';
import DeleteConfirmModal from './DeleteConfirmModal';
import DocumentCard from './DocumentCard';
import { downloadDataUrl, openDataUrlInNewTab, showProjectSelect2 } from './documentHelpers';
import FolderModal from './FolderModal';
import MoveToFolderModal from './MoveToFolderModal';
import UpdateDocumentModal from './UpdateDocumentModal';
import UploadDocumentModal from './UploadDocumentModal';
import { CardGridSkeleton } from '../../components/skeleton/Skeleton';

// The document a modal (update / delete / move) is about
const NO_DOCUMENT = { projectId: '', attachmentId: '', documentName: '' };

const EMPTY_FOLDER_FORM = { editFolderId: '', folderName: '', folderDescription: '' };

export default function DocumentRepository() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  // Folder-related state
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState('All Documents');
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState([]);
  const [selectedFolderProjectId, setSelectedFolderProjectId] = useState(null); // Track project ID of selected folder

  // Upload-related state
  const [pendingFiles, setPendingFiles] = useState([]);
  const [clientProjects, setClientProjects] = useState([]);
  const [availableFolders, setAvailableFolders] = useState([]);
  const documentFileInput = useRef(null);

  // Modals
  const [folderForm, setFolderForm] = useState(EMPTY_FOLDER_FORM);
  const [updateTarget, setUpdateTarget] = useState(NO_DOCUMENT);
  const newDocumentFileInput = useRef(null);
  const [deleteTarget, setDeleteTarget] = useState(NO_DOCUMENT);
  const [moveTarget, setMoveTarget] = useState(NO_DOCUMENT);
  const [destinationFolderId, setDestinationFolderId] = useState('');

  /* ---------------------------------------------------------------- loading */

  // Load the folders of the "Move to Folder" dropdown
  const loadAvailableFolders = (projects) => {
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p._id);
      api.call('folders.getTree', {
        projectIds: projectIds,
        visibilityFilter: 'public'
      }, (err, folders) => {
        if (!err) {
          setAvailableFolders(folders || []);
        }
      });
    }
  };

  // Load public documents for the client, optionally filtered by folder
  const loadDocuments = (folderId) => {
    setIsLoading(true);

    const params = folderId ? { folderId } : {};

    api.call('project.getClientPublicDocuments', params, (error, result) => {
      setIsLoading(false);
      if (error) {
        console.error('Error loading documents:', error);
        toastr.error('Failed to load documents');
        return;
      }
      console.log("res", result);

      setDocuments(result || []);
    });
  };

  /** After a document was changed: load the documents of the selected folder again. */
  const reloadDocuments = () => loadDocuments(selectedFolderId);

  useEffect(() => {
    // Load client's projects for upload functionality
    api.call('project.getClientProjects', (error, projects) => {
      if (error) {
        console.error('Error loading client projects:', error);
      } else {
        setClientProjects(projects || []);

        // Load available folders for move functionality
        loadAvailableFolders(projects);
      }
    });

    // Load initial documents (all folders)
    loadDocuments(null);
  }, []);

  // Reload documents when folder selection changes.
  // (This also runs once at the start, so the first list is asked for twice - as the old page did.)
  useEffect(() => {
    loadDocuments(selectedFolderId);
  }, [selectedFolderId]);

  /* ---------------------------------------------------------------- folders */

  const showAllDocuments = () => {
    setSelectedFolderId(null);
    setSelectedFolderPath('All Documents');
    setFolderBreadcrumbs([]);
    setSelectedFolderProjectId(null);
  };

  // A folder was clicked in the folder tree
  const handleFolderSelected = (folderId, folderName, folder) => {
    console.log('Folder selected:', folderId, folderName, folder);

    setSelectedFolderId(folderId);
    setSelectedFolderPath(folderName || 'All Documents');

    // Get folder path for breadcrumbs and projectId
    if (folderId) {
      api.call('folders.getPath', folderId, (error, path) => {
        if (error) {
          console.error('Error loading folder path:', error);
          return;
        }
        if (path && Array.isArray(path)) {
          setFolderBreadcrumbs(path);

          // Get projectId from the folder
          if (folder && folder.projectId) {
            setSelectedFolderProjectId(folder.projectId);
          } else if (path.length > 0 && path[0].projectId) {
            setSelectedFolderProjectId(path[0].projectId);
          }
        }
      });
    } else {
      // Root folder - clear breadcrumbs and projectId
      setFolderBreadcrumbs([]);
      setSelectedFolderProjectId(null);
    }
  };

  const handleBreadcrumbClick = (event, folderId, folderName) => {
    event.preventDefault();

    // Check if we're clicking on root/home (empty string, null, or "null")
    if (!folderId || folderId === 'null' || folderId === '') {
      // Clicked on "All Documents" - reset to root
      showAllDocuments();
      return;
    }

    // Navigate to specific folder
    setSelectedFolderId(folderId);
    setSelectedFolderPath(folderName || 'Unknown Folder');

    // Get folder path for breadcrumbs and projectId
    api.call('folders.getPath', folderId, (error, path) => {
      if (error) {
        console.error('Error loading folder path:', error);
        // Keep current breadcrumbs on error
        return;
      }
      if (path && Array.isArray(path)) {
        setFolderBreadcrumbs(path);

        // Get projectId from the first folder in path
        if (path.length > 0 && path[0].projectId) {
          setSelectedFolderProjectId(path[0].projectId);
        }
      }
    });
  };

  // The breadcrumbs with what the list below needs: is it the last one?
  const breadcrumbs = (Array.isArray(folderBreadcrumbs) ? folderBreadcrumbs : [])
    .map((crumb, index) => {
      // Ensure crumb has required properties
      if (!crumb || typeof crumb !== 'object') {
        return null;
      }

      return {
        _id: crumb._id || '',
        name: crumb.name || 'Unnamed Folder',
        isLast: index === folderBreadcrumbs.length - 1
      };
    })
    .filter(Boolean); // Remove any null entries

  const clientProjectIds = clientProjects ? clientProjects.map(p => p._id) : [];

  /* ---------------------------------------------------------------- view / download */

  const handleViewDocument = (projectId, attachmentId) => {
    if (!projectId || !attachmentId) {
      toastr.error('Invalid document');
      return;
    }

    // Find the document in the current list
    const docEntry = documents.find(d => d.projectId === projectId);

    if (!docEntry) {
      toastr.error('Document not found');
      return;
    }

    if (!docEntry.document) {
      toastr.error('Document not available');
      return;
    }

    // Download document using the new method
    api.call('project.downloadAttachment', projectId, attachmentId, (error, fileData) => {
      if (error) {
        toastr.error('Failed to load document: ' + error.reason);
        return;
      }

      // Open document in new tab
      try {
        openDataUrlInNewTab(fileData.data);
      } catch (err) {
        console.error('Error opening document:', err);
        toastr.error('Failed to open document');
      }
    });
  };

  const handleDownloadDocument = (projectId, attachmentId) => {
    if (!projectId || !attachmentId) {
      toastr.error('Invalid document');
      return;
    }

    // Find the document in the current list to get the name
    // (looked up by project, as the old page did: the first document of that project gives the file name)
    const docEntry = documents.find(d => d.projectId === projectId);

    if (!docEntry || !docEntry.document) {
      toastr.error('Document not found');
      return;
    }

    const documentName = docEntry.document.name;

    // Download document using the new method
    api.call('project.downloadAttachment', projectId, attachmentId, (error, fileData) => {
      if (error) {
        toastr.error('Failed to download document: ' + error.reason);
        return;
      }

      // Create download link
      try {
        downloadDataUrl(fileData.data, documentName);
        toastr.success('Document downloaded successfully');
      } catch (err) {
        console.error('Download error:', err);
        toastr.error('Failed to download document');
      }
    });
  };

  /* ---------------------------------------------------------------- opening the modals */

  const handleUploadDocumentClick = (event) => {
    event.preventDefault();

    // Clear previous files
    setPendingFiles([]);
    documentFileInput.current.value = '';

    // Pre-select project based on selected folder's projectId, or first project if at root
    let preselectedProjectId = '';
    if (selectedFolderProjectId) {
      preselectedProjectId = selectedFolderProjectId;
    } else if (clientProjects && clientProjects.length > 0) {
      preselectedProjectId = clientProjects[0]._id;
    }

    // Initialize Select2 for project selection
    showProjectSelect2('#uploadProjectId', '#uploadDocumentModal', '-- Select a Project --', preselectedProjectId);

    // Show modal
    $('#uploadDocumentModal').modal('show');
  };

  const handleCreateFolderClick = (event) => {
    event.preventDefault();

    // Reset form
    setFolderForm(EMPTY_FOLDER_FORM);

    // Show modal
    $('#folderModal').modal('show');
  };

  const handleUpdateDocumentClick = (projectId, attachmentId, documentName) => {
    if (!projectId || !attachmentId) {
      toastr.error('Invalid document');
      return;
    }

    // Set form values
    setUpdateTarget({ projectId, attachmentId, documentName });
    newDocumentFileInput.current.value = '';

    // Initialize Select2 for project selection, with the current project pre-selected
    showProjectSelect2('#updateDocProjectId', '#updateDocumentModal', '-- Keep Current Project --', projectId);

    // Show modal
    $('#updateDocumentModal').modal('show');
  };

  const handleDeleteDocumentClick = (projectId, attachmentId, documentName) => {
    if (!projectId || !attachmentId) {
      toastr.error('Invalid document');
      return;
    }

    // Set form values
    setDeleteTarget({ projectId, attachmentId, documentName });

    // Show modal
    $('#deleteConfirmModal').modal('show');
  };

  const handleMoveToFolderClick = (projectId, attachmentId, documentName, currentFolder) => {
    const currentFolderId = currentFolder || '';

    if (!projectId || !attachmentId) {
      toastr.error('Invalid document');
      return;
    }

    // Set form values
    setMoveTarget({ projectId, attachmentId, documentName });
    setDestinationFolderId(currentFolderId);

    // Show modal
    $('#moveToFolderModal').modal('show');
  };

  // After a folder was saved: reload documents, reload available folders and refresh the folder tree
  const handleFolderSaved = () => {
    reloadDocuments();
    loadAvailableFolders(clientProjects);
    refreshFolderTrees();
  };

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">
              <i className="fa fa-folder-open me-2"></i>Document Repository
            </h4>
            <p className="text-muted mb-0">Access and manage your project documents</p>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-primary" id="createFolderBtn" onClick={handleCreateFolderClick}>
              <i className="fa fa-folder-plus me-1"></i> New Folder
            </button>
            <button type="button" className="btn btn-primary" id="uploadDocumentBtn" onClick={handleUploadDocumentClick}>
              <i className="fa fa-upload me-1"></i> Upload Document
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="row">
          {/* Folder Tree Sidebar */}
          <div className="col-lg-3 col-md-4 mb-4">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="fa fa-folder me-1"></i>Folders
                </h6>

                {/* All Documents (Root) Option. It only shows that no folder is selected: the old page
                    had no click handler for it either (the tree's own "Root (No Folder)" row is the one to click). */}
                <div className="folder-tree-container">
                  <div className={'folder-item root-item p-2 rounded mb-2 ' + (selectedFolderId ? '' : 'bg-primary text-white')}
                    style={{ cursor: 'pointer' }}
                    data-folder-id="null"
                    data-folder-name="All Documents">
                    <i className="fa fa-folder-open me-2"></i>
                    <span>All Documents</span>
                  </div>

                  {/* Public Folders Tree */}
                  <div className="ms-2">
                    <FolderTree context="documentRepository" visibilityFilter="public" projectIds={clientProjectIds}
                      onFolderSelected={handleFolderSelected} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="col-lg-9 col-md-8">
            {/* Breadcrumb Navigation */}
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="#" className="breadcrumb-link" data-folder-id="" data-folder-name="All Documents"
                    onClick={(event) => handleBreadcrumbClick(event, '', 'All Documents')}>
                    <i className="fa fa-home me-1"></i>All Documents
                  </a>
                </li>
                {breadcrumbs.map((crumb, index) => (
                  crumb.isLast ? (
                    <li className="breadcrumb-item active" aria-current="page" key={index}>
                      {crumb.name}
                    </li>
                  ) : (
                    <li className="breadcrumb-item" key={index}>
                      <a href="#" className="breadcrumb-link" data-folder-id={crumb._id} data-folder-name={crumb.name}
                        onClick={(event) => handleBreadcrumbClick(event, crumb._id, crumb.name)}>{crumb.name}</a>
                    </li>
                  )
                ))}
              </ol>
            </nav>

            {/* Current Folder Info */}
            <div className="alert alert-info mb-4">
              <i className="fa fa-folder-open me-2"></i>
              <strong>Viewing:</strong> {selectedFolderPath}
            </div>

            {/* Documents Grid */}
            <div className="row">
              {isLoading ? (
                <div className="col-12">
                  <CardGridSkeleton count={6} label="Loading documents…" />
                </div>
              ) : documents && documents.length > 0 ? (
                documents.map((entry, index) => (
                  <DocumentCard key={index} entry={entry}
                    onView={handleViewDocument}
                    onDownload={handleDownloadDocument}
                    onMove={handleMoveToFolderClick}
                    onUpdate={handleUpdateDocumentClick}
                    onDelete={handleDeleteDocumentClick} />
                ))
              ) : (
                <div className="col-12">
                  <div className="card">
                    <div className="card-body text-center py-5">
                      <i className="fa fa-folder-open-o" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
                      <h5 className="mt-3">No Documents Available</h5>
                      <p className="text-muted">There are no public documents available at this time.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        selectedFolderPath={selectedFolderPath}
        selectedFolderId={selectedFolderId}
        clientProjects={clientProjects}
        pendingFiles={pendingFiles}
        setPendingFiles={setPendingFiles}
        fileInputRef={documentFileInput}
        onUploaded={reloadDocuments} />

      {/* Update Document Modal */}
      <UpdateDocumentModal target={updateTarget} clientProjects={clientProjects} fileInputRef={newDocumentFileInput}
        onUpdated={reloadDocuments} />

      {/* Create/Edit Folder Modal */}
      <FolderModal
        form={folderForm}
        onChange={(changes) => setFolderForm((old) => ({ ...old, ...changes }))}
        selectedFolderPath={selectedFolderPath}
        selectedFolderId={selectedFolderId}
        selectedFolderProjectId={selectedFolderProjectId}
        clientProjects={clientProjects}
        onSaved={handleFolderSaved} />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal target={deleteTarget} onDeleted={reloadDocuments} />

      {/* Move to Folder Modal */}
      <MoveToFolderModal target={moveTarget} availableFolders={availableFolders}
        destinationFolderId={destinationFolderId} setDestinationFolderId={setDestinationFolderId}
        onMoved={reloadDocuments} />
    </>
  );
}
