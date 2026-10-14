import api from '../../api/client';

/** Template Delete Confirmation Modal (#templateDeleteModal). `target` = { templateId, templateName }. */
export default function TemplateDeleteModal({ target }) {
  const handleConfirmDelete = (event) => {
    event.preventDefault();
    const templateId = target.templateId;

    api.call('templates.remove', templateId, (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to delete template');
        return;
      }

      toastr.success('Template deleted successfully');

      // Close modal (the list reloads by itself after the call)
      $('#templateDeleteModal').modal('hide');
    });
  };

  return (
    <div className="modal fade" id="templateDeleteModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="fa fa-exclamation-triangle me-2"></i>Confirm Delete
            </h5>
            <button type="button" className="btn-close btn-close-white" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="text-danger">Are you sure you want to delete template '<span id="deleteTemplateName" className="fw-bold">{target.templateName}</span>'?</p>
            <p className="text-muted">This action cannot be undone. This will permanently delete the template and all its task configurations.</p>
            <input type="hidden" id="deleteTemplateId" value={target.templateId} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-danger" id="confirmDeleteTemplate" onClick={handleConfirmDelete}>
              <i className="fa fa-trash me-1"></i>Delete Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
