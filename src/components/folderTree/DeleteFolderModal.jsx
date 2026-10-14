/**
 * Delete Folder Confirmation Modal (#deleteFolderModal).
 *
 * <FolderTree> renders one itself; a page may render another <DeleteFolderModal /> where the old page
 * included {{> deleteFolderModal}}. Whoever opens it says which folder first:
 *
 *   setDeleteFolderModal({ deletingFolderId, deletingFolderName, hasSubfolders, hasFiles, fileCount });
 *   $('#deleteFolderModal').modal('show');
 */
import api from '../../api/client';
import { showButtonLoader } from '../loader';
import { getDeleteFolderModal, refreshFolderTrees } from './folderTreeState';

export default function DeleteFolderModal() {
  const handleConfirmDelete = (event) => {
    event.preventDefault();

    const folderId = getDeleteFolderModal().deletingFolderId;
    // Mirrors what OLD sent: the two checkboxes were never on screen, so both options were always false.
    const recursive = false;
    const moveFiles = false;

    const restoreButton = showButtonLoader('#confirmDeleteFolder', 'Deleting...');

    api.call('folders.delete', folderId, {
      recursive: recursive,
      moveFilesToParent: moveFiles
    }, (error) => {
      restoreButton();
      if (error) {
        toastr.error(error.reason || 'Failed to delete folder');
      } else {
        toastr.success('Folder deleted successfully');
        $('#deleteFolderModal').modal('hide');

        // Refresh folder tree
        refreshFolderTrees();
      }
    });
  };

  return (
    <div className="modal fade" id="deleteFolderModal" tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="fa fa-exclamation-triangle"></i> Delete Folder
            </h5>
            <button type="button" className="btn-close btn-close-white" data-dismiss="modal"></button>
          </div>

          <div className="modal-body">
            {/* Mirrors what OLD displayed: the folder name was always empty. */}
            <p>Are you sure you want to delete the folder <strong>&quot;&quot;</strong>?</p>

            {/* Mirrors what OLD displayed: the subfolder / file warnings and their checkboxes never appeared. */}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-danger" id="confirmDeleteFolder" onClick={handleConfirmDelete}>
              <i className="fa fa-trash"></i> Delete Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
