/**
 * Documents tab of the project form (#project-documents): the folder tree, the upload field
 * and the documents of the selected folder as cards.
 */
import { useState } from 'react';
import FolderTree from '../../components/folderTree/FolderTree';
import { downloadExistingAttachment, formatFileSize, getAttachmentId, getFileIcon } from './projectHelpers';

/**
 * One document card with download, move and remove buttons
 */
function AttachmentCard({ attachment, projectId, onMove, onRemove }) {
  // Determine visibility (default to private for legacy documents without visibility flag)
  const visibility = attachment.visibility || 'private';
  const isPublic = visibility === 'public';

  // Get attachment ID (use name as fallback if no id)
  const attachmentId = getAttachmentId(attachment);

  return (
    <div className="col-md-4 col-lg-3" data-attachment-id={attachmentId}>
      <div className="card h-100 shadow-sm">
        <div className="card-body d-flex flex-column">
          <div className="text-center mb-2">
            <i className={getFileIcon(attachment.type)} style={{ fontSize: '3rem', color: '#4f46e5' }}></i>
          </div>
          <div className="flex-grow-1">
            <h6 className="card-title text-truncate mb-1" title={attachment.name}>{attachment.name}</h6>
            <p className="card-text mb-2">
              <small className="text-muted">
                <i className="fa fa-hdd-o me-1"></i>{formatFileSize(attachment.size)}
              </small>
            </p>
            <div className="mb-2">
              {isPublic
                ? <span className="badge bg-success"><i className="fa fa-globe me-1"></i>Public</span>
                : <span className="badge bg-secondary"><i className="fa fa-lock me-1"></i>Private</span>}
            </div>
          </div>
          <div className="d-flex gap-2 mt-2">
            {/* New uploads have base64 data; saved attachments have a path and need a server call to download */}
            {attachment.data ? (
              <a href={attachment.data} download={attachment.name} target="_blank" className="btn btn-sm btn-primary" title="Download">
                <i className="fa fa-download"></i>
              </a>
            ) : (
              <button type="button" className="btn btn-sm btn-primary download-existing-attachment"
                data-attachment-id={attachmentId}
                data-project-id={String(projectId)}
                title="Download"
                onClick={(event) => downloadExistingAttachment(event, projectId, attachmentId)}>
                <i className="fa fa-download"></i>
              </button>
            )}
            <button type="button" className="btn btn-sm btn-outline-info move-attachment-to-folder"
              data-filename={attachment.name}
              data-current-folder={attachment.folderId || ''}
              title="Move to Folder"
              onClick={(event) => onMove(event, attachment)}>
              <i className="fa fa-folder"></i>
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger remove-attachment"
              data-attachment-id={attachmentId}
              data-project-id={projectId || ''}
              data-filename={attachment.name} title="Remove"
              onClick={(event) => onRemove(event, attachment)}>
              <i className="fa fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDocumentsTab({
  editingProjectId,
  selectedFolderPath,
  onFolderSelected,
  onFilesChosen,
  attachments,
  existingVisible,
  noDocumentsVisible,
  noDocumentsText,
  onMoveAttachment,
  onRemoveAttachment
}) {
  const [visibility, setVisibility] = useState('private');

  /**
   * Handle project attachment file selection
   */
  const chooseFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    onFilesChosen(files, visibility || 'private');

    // Clear input
    event.target.value = '';
  };

  return (
    <div className="tab-pane fade" id="project-documents" role="tabpanel">
      <div className="card">
        <div className="card-body">
          <h6 className="card-title mb-3">
            <i className="fa fa-folder-open me-2"></i>Project Documents
          </h6>

          <div className="row">
            {/* Folder Tree Sidebar */}
            <div className="col-lg-3 col-md-4 mb-3">
              <div className="border rounded p-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <FolderTree context="project" projectId={editingProjectId} onFolderSelected={onFolderSelected} />
              </div>
            </div>

            {/* Upload and Documents Section */}
            <div className="col-lg-9 col-md-8">
              {/* Upload New Documents */}
              <div className="mb-4">
                <label className="form-label fw-bold" htmlFor="projectAttachments">
                  <i className="fa fa-upload me-1"></i>Upload Documents
                </label>

                {/* Selected Folder Display */}
                <div className="alert alert-info d-flex align-items-center mb-3 py-2">
                  <i className="fa fa-folder-open me-2"></i>
                  <strong>Upload to:</strong>&nbsp;<span id="selectedFolderPath">{selectedFolderPath}</span>
                </div>

                <input type="file" className="form-control mb-3" id="projectAttachments" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                  onChange={chooseFiles} />

                {/* Document Visibility */}
                <div className="mb-2">
                  <label className="form-label fw-semibold">Document Visibility</label>
                  <div className="d-flex gap-4">
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="documentVisibility" id="visibilityPrivate" value="private"
                        checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                      <label className="form-check-label" htmlFor="visibilityPrivate">
                        <i className="fa fa-lock me-1"></i>Private
                        <small className="text-muted d-block">Only visible to project team</small>
                      </label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="documentVisibility" id="visibilityPublic" value="public"
                        checked={visibility === 'public'} onChange={() => setVisibility('public')} />
                      <label className="form-check-label" htmlFor="visibilityPublic">
                        <i className="fa fa-globe me-1"></i>Public
                        <small className="text-muted d-block">Visible to client in Document Repository</small>
                      </label>
                    </div>
                  </div>
                </div>

                <small className="text-muted">
                  <i className="fa fa-info-circle me-1"></i>
                  Supported formats: PDF, Word, Excel, Images (JPG, PNG), ZIP (Max 10MB per file)
                </small>
              </div>

              {/* Display Existing Documents */}
              <div id="existingAttachmentsSection" style={{ display: existingVisible ? 'block' : 'none' }}>
                <label className="form-label fw-bold mb-3">
                  <i className="fa fa-files-o me-1"></i>Current Documents
                </label>
                <div id="existingAttachmentsList" className="row g-3">
                  {attachments.map((attachment, index) => (
                    <AttachmentCard key={`${getAttachmentId(attachment)}-${index}`} attachment={attachment} projectId={editingProjectId}
                      onMove={onMoveAttachment} onRemove={onRemoveAttachment} />
                  ))}
                </div>
              </div>

              {/* Empty State */}
              <div id="noDocumentsMessage" className="text-center text-muted py-5" style={noDocumentsVisible ? undefined : { display: 'none' }}>
                <i className="fa fa-folder-open-o" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
                <p className="mt-3">{noDocumentsText}</p>
                <small>Upload documents using the form above</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
