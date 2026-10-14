/**
 * @author Visakh
 * Templates Management Page
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import api from '../../api/client';
import Paginator from '../../components/Paginator';
import { usePagination } from '../../hooks/usePagination';
import ErrorModal from '../../layouts/modals/ErrorModal';
import SuccessModal from '../../layouts/modals/SuccessModal';
import TemplateDeleteModal from './TemplateDeleteModal';
import TemplateEditModal from './TemplateEditModal';
import TemplateViewModal from './TemplateViewModal';
import { readFirstSheetRows, rowsToTasks, templateDataFromFile } from './templateExcel';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const EMPTY_EDIT_FORM = { templateId: '', name: '', description: '', currentFile: '' };
const NO_TEMPLATE = { templateId: '', templateName: '' };

function formatDate(date) {
  if (!date) return 'N/A';
  return moment(date).format('MMM DD, YYYY');
}

export default function Templates() {
  const navigate = useNavigate();
  const formCard = useRef(null);
  const creationForm = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewedTemplate, setViewedTemplate] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [deleteTarget, setDeleteTarget] = useState(NO_TEMPLATE);

  const pagination = usePagination('templates', {
    filters: { isDeleted: { $ne: true } },
    sort: { createdAt: -1 },
    perPage: 20
  });

  // Initialize tooltips
  useEffect(() => {
    if ($.fn.tooltip) $('[title]').tooltip();
  }, []);

  const isReady = pagination.ready();
  const pageTemplates = pagination.getPage();
  const hasTemplates = pageTemplates && pageTemplates.length > 0;
  const templateCount = pagination.totalItems() || 0;

  // Client-side filtering for search
  const templateList = searchQuery
    ? pageTemplates.filter((template) => {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = template.name && template.name.toLowerCase().includes(searchLower);
      const descMatch = template.description && template.description.toLowerCase().includes(searchLower);
      return nameMatch || descMatch;
    })
    : pageTemplates;

  const handlePageClick = (e, clickedPage) => {
    e.preventDefault();
    pagination.currentPage(clickedPage);
  };

  /* ---------------------------------------------------------------- new template form (slides open / closed) */

  const handleToggleForm = (event) => {
    event.preventDefault();
    $(formCard.current).slideToggle();
  };

  const handleCancelForm = (event) => {
    event.preventDefault();
    $(formCard.current).slideUp();
    creationForm.current.reset();
  };

  /** Create new template from Excel file */
  const handleCreateSubmit = (event) => {
    event.preventDefault();

    const fields = creationForm.current.elements;
    const templateName = fields.templateName.value.trim();
    const templateDescription = fields.templateDescription.value.trim();
    const fileInput = fields.templateFile;

    if (!templateName) {
      toastr.error('Please enter a template name');
      return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
      toastr.error('Please select an Excel file');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    // Show loading indicator
    toastr.info('Processing Excel file...');

    reader.onload = function (e) {
      try {
        const jsonData = readFirstSheetRows(e.target.result);

        if (!jsonData || jsonData.length === 0) {
          toastr.error('Excel file is empty or invalid');
          return;
        }

        const tasks = rowsToTasks(jsonData);
        const templateData = templateDataFromFile(templateName, templateDescription, file, e.target.result, tasks);

        // Save template (the list reloads by itself after the call)
        api.call('templates.create', templateData, (error) => {
          if (error) {
            toastr.error(error.reason || 'Failed to create template');
            return;
          }

          toastr.success(`Template created successfully with ${tasks.length} tasks!`);

          // Reset form and hide
          creationForm.current.reset();
          $(formCard.current).slideUp();
        });

      } catch (error) {
        console.error('Error processing Excel file:', error);
        toastr.error('Failed to process Excel file. Please check the format.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /* ---------------------------------------------------------------- row buttons */

  const handleView = (event, templateId) => {
    event.preventDefault();

    api.call('templates.getById', templateId, (error, template) => {
      if (error) {
        toastr.error(error.reason || 'Failed to load template');
        return;
      }

      setViewedTemplate(template);

      // Show modal
      $('#templateViewModal').modal('show');
    });
  };

  const handleEdit = (event, templateId) => {
    event.preventDefault();

    api.call('templates.getById', templateId, (error, template) => {
      if (error) {
        toastr.error(error.reason || 'Failed to load template');
        return;
      }

      // Populate edit form
      setEditForm({
        templateId: template._id,
        name: template.name || '',
        description: template.description || '',
        currentFile: template.fileName
      });

      // Show modal
      $('#templateEditModal').modal('show');
    });
  };

  const handleDelete = (event, template) => {
    event.preventDefault();

    setDeleteTarget({ templateId: template._id, templateName: String(template.name || '').trim() });
    $('#templateDeleteModal').modal('show');
  };

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">
              <i className="fa fa-file-text-o me-2"></i>Templates Management
            </h4>
            <p className="text-muted mb-0">Create and manage project templates with Excel import</p>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary backToProjects"
              onClick={(event) => { event.preventDefault(); navigate('/project/list'); }}>
              <i className="fa fa-arrow-left me-1"></i> Back to Projects
            </button>
            <button type="button" className="btn btn-primary" id="toggleTemplateForm" onClick={handleToggleForm}>
              <i className="fa fa-plus me-1"></i> New Template
            </button>
          </div>
        </div>

        {/* Create New Template Section */}
        <div className="card mb-4" id="newTemplateFormCard" style={{ display: 'none' }} ref={formCard}>
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0 " style={{ color: '#fff' }}>
              <i className="fa fa-plus-circle me-2"></i>Create New Template
            </h6>
          </div>
          <div className="card-body mt-3">
            <form id="templateCreationForm" ref={creationForm} onSubmit={handleCreateSubmit}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="templateName">Template Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="templateName" name="templateName" placeholder="e.g., SAP B1 Implementation Template" required />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="templateFile">Upload Excel Template <span className="text-danger">*</span></label>
                  <input type="file" className="form-control" id="templateFile" name="templateFile" accept=".xlsx,.xls" required />
                  <small className="text-muted">Upload Excel file with project tasks</small>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">&nbsp;</label>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-secondary w-50" id="cancelTemplateForm" onClick={handleCancelForm}>
                      <i className="fa fa-times me-1"></i>Cancel
                    </button>
                    <button type="submit" className="btn btn-success w-50">
                      <i className="fa fa-save me-1"></i>Save Template
                    </button>
                  </div>
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="templateDescription">Description</label>
                  <textarea className="form-control" id="templateDescription" name="templateDescription" rows="2" placeholder="Brief description of this template"></textarea>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Templates List Section */}
        {isReady ? (
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  <i className="fa fa-list me-2"></i>Available Templates ({templateCount})
                </h6>
                <div className="input-group" style={{ maxWidth: '300px' }}>
                  <span className="input-group-text"><i className="fa fa-search"></i></span>
                  <input type="text" className="form-control" id="searchTemplates" placeholder="Search templates..."
                    onChange={(event) => setSearchQuery(event.target.value.trim())} />
                </div>
              </div>
            </div>
            <div className="card-body">
              {hasTemplates ? (
                <div className="table-responsive">
                  <table className="table table-hover table-bordered align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th style={{ minWidth: '250px' }}>Template Name</th>
                        <th style={{ minWidth: '300px' }}>Description</th>
                        <th style={{ width: '120px' }} className="text-center">Tasks Count</th>
                        <th style={{ width: '180px' }}>File Name</th>
                        <th style={{ width: '150px' }}>Created Date</th>
                        <th style={{ width: '200px' }} className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="templatesListBody">
                      {templateList.map((template, index) => (
                        <tr data-template-id={template._id} className="template-row" key={template._id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong className="text-primary">{template.name}</strong>
                          </td>
                          <td>
                            <small className="text-muted">{template.description}</small>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-primary">{template.taskCount}</span>
                          </td>
                          <td>
                            <small className="text-muted"><i className="fa fa-file-excel-o me-1"></i>{template.fileName}</small>
                          </td>
                          <td>
                            <small>{formatDate(template.createdAt)}</small>
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" role="group">
                              <button type="button" className="btn btn-outline-info viewTemplate" data-id={template._id} title="View Tasks"
                                onClick={(event) => handleView(event, template._id)}>
                                <i className="fa fa-eye"></i> View
                              </button>
                              <button type="button" className="btn btn-outline-warning editTemplate" data-id={template._id} title="Edit"
                                onClick={(event) => handleEdit(event, template._id)}>
                                <i className="fa fa-pencil"></i> Edit
                              </button>
                              <button type="button" className="btn btn-outline-danger deleteTemplate" data-id={template._id} title="Delete"
                                onClick={(event) => handleDelete(event, template)}>
                                <i className="fa fa-trash"></i> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fa fa-file-text-o" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
                  <h5 className="mt-3">No templates available</h5>
                  <p>Create your first template by clicking the &quot;New Template&quot; button above</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {hasTemplates && (
              <div className="card-footer">
                <div className="mt-2">
                  <Paginator pagination={pagination} limit={20} containerClass="text-center" onClick={handlePageClick} />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Loading Spinner */
          <div className="card">
            <div className="card-body">
              <TableSkeleton rows={6} columns={5} label="Loading templates…" />
            </div>
          </div>
        )}

        <SuccessModal id="templateSuccessModal" />
        <ErrorModal id="templateErrorModal" />
      </div>

      {/* Template View Modal */}
      <TemplateViewModal template={viewedTemplate} />

      {/* Template Edit Modal */}
      <TemplateEditModal form={editForm} onChange={(changes) => setEditForm((old) => ({ ...old, ...changes }))} />

      {/* Template Delete Confirmation Modal */}
      <TemplateDeleteModal target={deleteTarget} />

      {/* Custom Styles */}
      <style>{`
    .template-row {
      transition: background-color 0.2s;
    }

    .template-row:hover {
      background-color: #f8f9fa;
    }
  `}</style>
    </>
  );
}
