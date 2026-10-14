/**
 * Folder Node (Recursive): one folder of the tree, with its sub-folders when expanded.
 *
 *   <FolderNode folder={folder} level={0} tree={tree} />
 *
 * `tree` is what the node needs from its <FolderTree>: which folders are expanded / selected,
 * how to select one, and the options used to load sub-folders.
 */
import { useState } from 'react';
import api from '../../api/client';
import {
  prefillFolderForm,
  setDeleteFolderModal,
  setFolderFormContext,
  setFolderFormModal
} from './folderTreeState';

export default function FolderNode({ folder, level, tree }) {
  const [children, setChildren] = useState([]);

  const isExpanded = tree.expandedFolders.includes(folder._id);
  const isSelected = tree.selectedFolderId === folder._id;
  // Check if folder has any children (from cached data or initial load)
  const hasChildren = children.length > 0;
  const visibilityClass = folder.visibility === 'public' ? 'text-success' : 'text-warning';
  const fileCount = folder.fileCount || 0;

  // The old template checked `../showFileCounts` and `../isClient`: fields of the surrounding data
  // context, which is the folder document itself and has neither. So a node never showed its file
  // count badge and always showed its actions menu. Kept exactly like that.
  const showFileCounts = folder.showFileCounts;
  const isClient = folder.isClient;

  const handleSelect = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Update selected folder in the tree and tell the page
    tree.selectFolder(folder._id, folder.name, folder);
  };

  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const folderId = folder._id;
    const expandedFolders = tree.expandedFolders;

    if (expandedFolders.includes(folderId)) {
      // Collapse
      tree.setExpandedFolders(expandedFolders.filter(id => id !== folderId));
    } else {
      // Expand - load children if not loaded
      if (children.length === 0) {
        const options = {
          parentId: folderId,
          includeFiles: tree.showFileCounts,
          visibilityFilter: tree.visibilityFilter
        };

        // Add project or task context (if available)
        const projectId = tree.projectId;
        const taskId = tree.taskId;
        const projectIds = tree.projectIds || [];

        if (projectId) {
          options.projectId = projectId;
        } else if (projectIds && projectIds.length > 0) {
          options.projectIds = projectIds;
        } else if (taskId) {
          options.taskId = taskId;
        }

        api.call('folders.getTree', options, (error, list) => {
          if (!error) {
            setChildren(list || []);
            tree.setExpandedFolders([...expandedFolders, folderId]);
          }
        });
      } else {
        tree.setExpandedFolders([...expandedFolders, folderId]);
      }
    }
  };

  // Used by the "Create Subfolder" menu entry, which is switched off in the markup below.
  const handleCreateSubfolder = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Open folder form modal for creating subfolder
    setFolderFormModal({ editingFolderId: null, parentFolderId: folder._id, parentFolderName: folder.name });

    // Set context on modal before showing - use folder's projectId if available
    const modal = setFolderFormContext({
      folderProjectId: folder.projectId,
      projectId: tree.projectId,
      projectIds: tree.projectIds || [],
      taskId: tree.taskId
    });

    modal.modal('show');
  };

  const handleEditFolder = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Open folder form modal for editing
    const modal = $('#folderFormModal');
    setFolderFormModal({ editingFolderId: folder._id, parentFolderId: folder.parentId, parentFolderName: null });

    // Pre-fill form
    setTimeout(() => {
      prefillFolderForm({
        name: folder.name,
        description: folder.description || '',
        visibility: folder.visibility
      });
    }, 100);

    modal.modal('show');
  };

  // Used by the "Delete" menu entry, which is switched off in the markup below.
  const handleDeleteFolder = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Open delete confirmation modal
    const modal = $('#deleteFolderModal');
    setDeleteFolderModal({ deletingFolderId: folder._id, deletingFolderName: folder.name });

    // Check for subfolders and files
    api.call('folders.getContents', folder._id, { includeSubfolders: true }, (error, contents) => {
      if (!error) {
        setDeleteFolderModal({
          hasSubfolders: contents.folders.length > 0,
          hasFiles: contents.files.length > 0,
          fileCount: contents.files.length
        });
      }
      modal.modal('show');
    });
  };

  return (
    <div className={`folder-item-wrapper level-${level}`} data-folder-id={folder._id}>
      <div className={`folder-item ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`}
        data-folder-id={folder._id} onClick={handleSelect}>
        {/* Toggle Icon */}
        <span className="folder-toggle" onClick={handleToggle}>
          {hasChildren ? (
            <i className={`fa fa-caret-${isExpanded ? 'down' : 'right'}`}></i>
          ) : (
            <i className="fa fa-caret-right invisible"></i>
          )}
        </span>

        {/* Folder Icon (with visibility indicator) */}
        <span className="folder-icon">
          <i className={`fa fa-folder${isExpanded ? '-open' : ''} ${visibilityClass}`}></i>
        </span>

        {/* Folder Name */}
        <span className="folder-name">{folder.name}</span>

        {/* File Count Badge */}
        {showFileCounts && fileCount ? (
          <span className="badge bg-secondary ms-auto">{fileCount}</span>
        ) : null}

        {/* Actions Menu */}
        {!isClient && (
          <div className="folder-actions">
            <div className="dropdown">
              <button className="btn btn-sm btn-link folder-menu-btn" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="fa fa-ellipsis-v"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                {/* <li>
                  <a className="dropdown-item create-subfolder" href="#" data-folder-id={folder._id} onClick={handleCreateSubfolder}>
                    <i className="fa fa-plus"></i> Create Subfolder
                  </a>
                </li> */}
                <li>
                  <a className="dropdown-item edit-folder" href="#" data-folder-id={folder._id} onClick={handleEditFolder}>
                    <i className="fa fa-pencil"></i> Edit
                  </a>
                </li>
                {/* <li>
                  <a className="dropdown-item move-folder" href="#" data-folder-id={folder._id}>
                    <i className="fa fa-arrows"></i> Move
                  </a>
                </li> */}
                <li><hr className="dropdown-divider" /></li>
                {/* <li>
                  <a className="dropdown-item text-danger delete-folder" href="#" data-folder-id={folder._id} onClick={handleDeleteFolder}>
                    <i className="fa fa-trash"></i> Delete
                  </a>
                </li> */}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Children (rendered recursively if expanded) */}
      {isExpanded && (
        <div className="folder-children">
          {children.map((child) => (
            <FolderNode key={child._id} folder={child} level={level + 1} tree={tree} />
          ))}
        </div>
      )}
    </div>
  );
}
