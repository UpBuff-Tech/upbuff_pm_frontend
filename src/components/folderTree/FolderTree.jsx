/**
 * Folder Tree Component
 * Displays hierarchical folder structure with expand/collapse and CRUD operations
 *
 *   <FolderTree context="project" projectId={editingProjectId} onFolderSelected={(folderId, folderName, folder) => ...} />
 *   <FolderTree context="task" taskId={taskId} onFolderSelected={...} />
 *   <FolderTree context="documentRepository" visibilityFilter="public" projectIds={clientProjectIds} onFolderSelected={...} />
 *
 * It renders its own create/edit and delete modals (#folderFormModal, #deleteFolderModal).
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import FolderNode from './FolderNode';
import FolderFormModal from './FolderFormModal';
import DeleteFolderModal from './DeleteFolderModal';
import { onRefreshFolderTrees, setFolderFormContext, setFolderFormModal } from './folderTreeState';
import './folderTree.css';

const SKELETON_COUNT = [1, 2, 3, 4, 5];

export default function FolderTree({
  context = 'default',
  showFileCounts = true,
  visibilityFilter = null,
  projectId = null,
  taskId = null,
  projectIds = [],
  onFolderSelected
}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  // A new array with the same ids must not count as a change.
  const projectIdsKey = JSON.stringify(projectIds || []);

  const isClient = !!user && !!user.profile && user.profile.role === 'client';
  const rootFileCount = 0; // This would need to be calculated from a method call

  const loadRootFolders = () => {
    const options = {
      parentId: null,
      includeFiles: showFileCounts,
      visibilityFilter: visibilityFilter
    };

    // Add project or task context (if available)
    if (projectId) {
      options.projectId = projectId;
    } else if (taskId) {
      options.taskId = taskId;
    } else if (projectIds && projectIds.length > 0) {
      // For document repository with multiple project IDs
      options.projectIds = projectIds;
    }

    api.call('folders.getTree', options, (error, list) => {
      if (!error) {
        setFolders(list || []);
      }
      setIsLoading(false);
    });
  };

  // Load root folders when projectId/taskId/projectIds changes
  useEffect(() => {
    // Special case: document repository context with visibility filter
    // Allow loading public folders across all accessible projects
    const isDocumentRepository = context === 'documentRepository';

    // Skip loading if no project or task context AND not document repository mode
    if (!projectId && !taskId && !isDocumentRepository) {
      setFolders([]);
      setIsLoading(false);
      return;
    }

    loadRootFolders();
  }, [projectId, taskId, projectIdsKey]);

  // Reload when somebody calls refreshFolderTrees() (a folder was created, renamed or deleted)
  useEffect(() => {
    return onRefreshFolderTrees(() => {
      setIsLoading(true);
      loadRootFolders();
    });
  }, [projectId, taskId, projectIdsKey]);

  /** Mark a folder as selected and tell the page. */
  const selectFolder = (folderId, folderName, folder) => {
    setSelectedFolderId(folderId);
    if (onFolderSelected) onFolderSelected(folderId, folderName, folder);
  };

  const handleRootClick = (event) => {
    event.preventDefault();
    selectFolder(null, 'Root (No Folder)');
  };

  const handleCreateRootFolder = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Open folder form modal for creating root folder
    setFolderFormModal({ editingFolderId: null, parentFolderId: null, parentFolderName: null });

    // Set context on modal before showing
    const modal = setFolderFormContext({ projectId, projectIds, taskId });

    modal.modal('show');
  };

  // What every node of this tree needs from the tree
  const tree = {
    expandedFolders,
    setExpandedFolders,
    selectedFolderId,
    selectFolder,
    showFileCounts,
    visibilityFilter,
    projectId,
    taskId,
    projectIds
  };

  return (
    <>
      <div className={`folder-tree ${context}`}>
        {/* Header */}
        <div className="folder-tree-header">
          <h6 className="mb-0">
            <i className="fa fa-folder-open"></i> Folders
          </h6>
          {!isClient && (
            <button className="btn btn-sm btn-outline-primary create-root-folder" title="Create Folder" onClick={handleCreateRootFolder}>
              <i className="fa fa-plus"></i>
            </button>
          )}
        </div>

        {/* Root Level (No Folder) */}
        <div className="folder-tree-root">
          <div className={`folder-item root-item ${selectedFolderId === null ? 'selected' : ''}`}
            data-folder-id="" onClick={handleRootClick}>
            <span className="folder-icon">
              <i className="fa fa-home"></i>
            </span>
            <span className="folder-name">Root (No Folder)</span>
            {showFileCounts && (
              <span className="badge bg-secondary ms-auto">{rootFileCount}</span>
            )}
          </div>
        </div>

        {/* Folder Tree Body */}
        <div className="folder-tree-body">
          {isLoading ? (
            // Loading Skeleton
            <div className="folder-skeleton">
              {SKELETON_COUNT.map((number) => (
                <div className="skeleton-folder-item" key={number}>
                  <div className="skeleton skeleton-text"></div>
                </div>
              ))}
            </div>
          ) : folders.length > 0 ? (
            folders.map((folder) => (
              <FolderNode key={folder._id} folder={folder} level={0} tree={tree} />
            ))
          ) : (
            <div className="empty-state">
              <small className="text-muted">
                <i className="fa fa-folder-o"></i> No folders yet
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Include Modals */}
      <FolderFormModal />
      <DeleteFolderModal />
    </>
  );
}
