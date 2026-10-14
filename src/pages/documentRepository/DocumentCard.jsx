import { formatDate, formatFileSize, isExcel, isImage, isPDF, isWord } from './documentHelpers';

/** Document Icon: depends on the kind of file. */
function DocumentIcon({ doc }) {
  if (isPDF(doc)) return <i className="fa fa-file-pdf-o" style={{ fontSize: '3rem', color: '#dc3545' }}></i>;
  if (isWord(doc)) return <i className="fa fa-file-word-o" style={{ fontSize: '3rem', color: '#2b5797' }}></i>;
  if (isExcel(doc)) return <i className="fa fa-file-excel-o" style={{ fontSize: '3rem', color: '#217346' }}></i>;
  if (isImage(doc)) return <i className="fa fa-file-image-o" style={{ fontSize: '3rem', color: '#0d6efd' }}></i>;
  return <i className="fa fa-file-o" style={{ fontSize: '3rem', color: '#6c757d' }}></i>;
}

/**
 * One document of the grid.
 * `entry` = { projectId, projectName, document: { id, name, type, size, uploadedAt, folderId } }
 * The on... props are called with (projectId, attachmentId, documentName, currentFolderId).
 */
export default function DocumentCard({ entry, onView, onDownload, onMove, onUpdate, onDelete }) {
  const projectId = entry.projectId;
  const doc = entry.document || {};

  // Every button carries the same document
  const run = (action) => (event) => {
    event.preventDefault();
    action(projectId, doc.id, doc.name, doc.folderId);
  };

  return (
    <div className="col-md-6 col-lg-4 mb-4">
      <div className="card h-100 border-0 shadow-sm">
        <div className="card-body">
          {/* Document Icon */}
          <div className="mb-3 text-center">
            <DocumentIcon doc={entry.document} />
          </div>

          {/* Document Name */}
          <h6 className="card-title text-center mb-3 text-truncate" title={doc.name}>
            {doc.name}
          </h6>

          {/* Project Name */}
          <div className="mb-2">
            <small className="text-muted">
              <i className="fa fa-folder me-1"></i>
              {entry.projectName}
            </small>
          </div>

          {/* Upload Date */}
          <div className="mb-3">
            <small className="text-muted">
              <i className="fa fa-calendar me-1"></i>
              {formatDate(doc.uploadedAt)}
            </small>
          </div>

          {/* File Size */}
          <div className="mb-3">
            <small className="text-muted">
              <i className="fa fa-database me-1"></i>
              {formatFileSize(doc.size)}
            </small>
          </div>

          {/* Actions */}
          <div className="d-grid gap-2">
            <div className="btn-group" role="group">
              <button type="button" className="btn btn-sm btn-primary view-document" data-project-id={projectId}
                data-attachment-id={doc.id} title="View" onClick={run(onView)}>
                <i className="fa fa-eye"></i>
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary download-document" data-project-id={projectId}
                data-attachment-id={doc.id} title="Download" onClick={run(onDownload)}>
                <i className="fa fa-download"></i>
              </button>
              <button type="button" className="btn btn-sm btn-outline-info move-to-folder" data-project-id={projectId}
                data-attachment-id={doc.id} data-document-name={doc.name} data-current-folder={doc.folderId}
                title="Move to Folder" onClick={run(onMove)}>
                <i className="fa fa-folder"></i>
              </button>
              <button type="button" className="btn btn-sm btn-outline-warning update-document" data-project-id={projectId}
                data-attachment-id={doc.id} data-document-name={doc.name} title="Update" onClick={run(onUpdate)}>
                <i className="fa fa-pencil"></i>
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger delete-document" data-project-id={projectId}
                data-attachment-id={doc.id} data-document-name={doc.name} title="Delete" onClick={run(onDelete)}>
                <i className="fa fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
