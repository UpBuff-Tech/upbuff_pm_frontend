/**
 * Project Delete Confirmation Modal (#projectDeleteModal).
 *
 *   <ProjectDeleteModal />
 *
 *   openProjectDeleteModal(projectId);
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { createComponentHandle } from './projectHelpers';

const handle = createComponentHandle();

/** Delete project - show confirmation */
export function openProjectDeleteModal(projectId) {
  handle.call('open', projectId);
}

export default function ProjectDeleteModal() {
  const [deleteProjectId, setDeleteProjectId] = useState('');
  const [deleteProjectName, setDeleteProjectName] = useState('');

  const open = (projectId) => {
    api.call('project.getById', projectId, (error, project) => {
      if (error) {
        toastr.error(error.reason || 'Failed to load project');
        return;
      }

      setDeleteProjectId(project._id);
      setDeleteProjectName(project.name);
      $('#projectDeleteModal').modal('show');
    });
  };

  // Let openProjectDeleteModal() reach this modal
  useEffect(() => handle.register({ open }));

  /**
   * Confirm delete project
   */
  const confirmDelete = (event) => {
    event.preventDefault();

    api.call('project.remove', deleteProjectId, (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to delete project');
        return;
      }

      toastr.success('Project deleted successfully');
      $('#projectDeleteModal').modal('hide');
    });
  };

  return (
    <div className="modal fade" id="projectDeleteModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Delete</h5>
            <button type="button" className="close btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="text-danger">Are you sure you want to delete project &apos;<span id="deleteProjectName" className="fw-bold">{deleteProjectName}</span>&apos;?</p>
            <p className="text-muted">This action cannot be undone.</p>
            <input type="hidden" id="deleteProjectId" value={deleteProjectId} readOnly />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-danger" id="confirmDeleteProject" onClick={confirmDelete}>Delete Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}
