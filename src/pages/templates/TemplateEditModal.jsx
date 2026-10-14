import { useRef } from 'react';
import api from '../../api/client';
import { readFirstSheetRows, rowsToTasks, templateDataFromFile } from './templateExcel';

/**
 * Template Edit Modal (#templateEditModal).
 * `form` = { templateId, name, description, currentFile }, changed with onChange({ name: '...' }).
 */
export default function TemplateEditModal({ form, onChange }) {
  const fileInput = useRef(null);

  const updateTemplate = (templateId, templateData) => {
    api.call('templates.update', templateId, templateData, (error) => {
      if (error) {
        toastr.error(error.reason || 'Failed to update template');
        return;
      }

      toastr.success('Template updated successfully!');

      // Close modal
      $('#templateEditModal').modal('hide');

      // Reset form (the hidden template id is outside the form and stays)
      onChange({ name: '', description: '' });
      fileInput.current.value = '';
    });
  };

  const handleSave = (event) => {
    event.preventDefault();

    const templateId = form.templateId;
    const templateName = form.name.trim();
    const templateDescription = form.description.trim();

    if (!templateName) {
      toastr.error('Please enter a template name');
      return;
    }

    // Check if a new file was uploaded
    const files = fileInput.current.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();

      toastr.info('Processing Excel file...');

      reader.onload = function (e) {
        try {
          const tasks = rowsToTasks(readFirstSheetRows(e.target.result));

          // Update template with new file
          updateTemplate(templateId, templateDataFromFile(templateName, templateDescription, file, e.target.result, tasks));
        } catch (error) {
          console.error('Error processing Excel file:', error);
          toastr.error('Failed to process Excel file. Please check the format.');
        }
      };

      reader.readAsArrayBuffer(file);
    } else {
      // Update without file change
      updateTemplate(templateId, {
        name: templateName,
        description: templateDescription
      });
    }
  };

  return (
    <div className="modal fade" id="templateEditModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header bg-warning">
            <h5 className="modal-title">
              <i className="fa fa-pencil me-2"></i>Edit Template
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id="editTemplateId" value={form.templateId} />
            <form id="templateEditForm">
              <div className="row">
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="editTemplateName">Template Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="editTemplateName" name="editTemplateName" required
                    value={form.name} onChange={(event) => onChange({ name: event.target.value })} />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="editTemplateDescription">Description</label>
                  <textarea className="form-control" id="editTemplateDescription" name="editTemplateDescription" rows="3"
                    value={form.description} onChange={(event) => onChange({ description: event.target.value })}></textarea>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Current File:</label>
                  <p className="text-muted mb-0"><i className="fa fa-file-excel-o me-1"></i><span id="editTemplateCurrentFile">{form.currentFile}</span></p>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="editTemplateFile">Replace Excel File (Optional)</label>
                  <input type="file" className="form-control" id="editTemplateFile" name="editTemplateFile" accept=".xlsx,.xls" ref={fileInput} />
                  <small className="text-muted">Leave empty to keep current file</small>
                </div>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-warning" id="saveTemplateEdit" onClick={handleSave}>
              <i className="fa fa-save me-1"></i>Update Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
