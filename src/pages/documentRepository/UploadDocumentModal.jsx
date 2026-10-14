import { useEffect, useState } from 'react';
import api from '../../api/client';
import { destroyProjectSelect2, formatSelectedFileSize, MAX_FILE_SIZE } from './documentHelpers';
import ProjectOptions from './ProjectOptions';

/**
 * Upload Document Modal (#uploadDocumentModal).
 * The page opens it (see handleUploadDocumentClick) and owns the files waiting to be uploaded;
 * onUploaded() is called when every file has been processed.
 */
export default function UploadDocumentModal({
  selectedFolderPath, selectedFolderId, clientProjects, pendingFiles, setPendingFiles, fileInputRef, onUploaded
}) {
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => destroyProjectSelect2('#uploadProjectId');
  }, []);

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setPendingFiles([]);
      return;
    }

    const validFiles = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toastr.warning(`File "${file.name}" exceeds 5MB limit and will be skipped.`);
        return;
      }

      validFiles.push(file);
    });

    // The valid files are also what the "Selected Files" preview shows
    setPendingFiles(validFiles);
  };

  const handleConfirmUpload = (event) => {
    event.preventDefault();

    const files = pendingFiles;
    if (!files || files.length === 0) {
      toastr.error('Please select at least one file to upload.');
      return;
    }

    // Get selected project from dropdown
    const projectId = $('#uploadProjectId').val();
    if (!projectId) {
      toastr.error('Please select a project to upload the document to.');
      return;
    }

    const folderId = selectedFolderId;

    // Disable upload button
    setIsUploading(true);

    let uploadedCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;

    // Check if all files are processed
    const finishWhenAllProcessed = () => {
      if (uploadedCount + errorCount !== totalFiles) return;

      setIsUploading(false);

      if (errorCount > 0) {
        toastr.warning(`${uploadedCount} of ${totalFiles} files uploaded. ${errorCount} failed.`);
      } else {
        toastr.success(`${uploadedCount} file(s) uploaded successfully!`);
      }

      // Close modal and refresh documents
      $('#uploadDocumentModal').modal('hide');
      onUploaded();
    };

    // Upload files one by one
    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = function (e) {
        const attachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
          folderId: folderId || null
        };

        api.call('project.clientAddAttachment', projectId, attachment, (error) => {
          if (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            errorCount++;
          } else {
            uploadedCount++;
          }

          finishWhenAllProcessed();
        });
      };

      reader.onerror = function () {
        errorCount++;
        finishWhenAllProcessed();
      };

      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="modal fade" id="uploadDocumentModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-upload me-2"></i>Upload Document
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form id="uploadDocumentForm">
              {/* Folder Selection */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Upload to Folder</label>
                <div className="alert alert-info py-2 mb-2">
                  <i className="fa fa-folder-open me-1"></i>
                  <span id="uploadFolderPath">{selectedFolderPath}</span>
                </div>
              </div>

              {/* Project Selection (a select2 dropdown: read through jQuery when uploading) */}
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="uploadProjectId">Select Project <span className="text-danger">*</span></label>
                <select className="form-select" id="uploadProjectId" name="uploadProjectId" style={{ width: '100%' }} required>
                  <option value="">-- Select a Project --</option>
                  <ProjectOptions projects={clientProjects} />
                </select>
                <small className="text-muted">Select the project to upload the document to.</small>
              </div>

              {/* File Input */}
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="documentFile">Select File(s)</label>
                <input type="file" className="form-control" id="documentFile" name="documentFile" multiple required
                  ref={fileInputRef} onChange={handleFileChange} />
                <small className="text-muted">Maximum file size: 5MB per file. You can select multiple files.</small>
              </div>

              {/* Selected Files Preview */}
              <div id="selectedFilesPreview" className="mb-3" style={{ display: pendingFiles.length > 0 ? undefined : 'none' }}>
                <label className="form-label fw-semibold">Selected Files</label>
                <div id="filesList" className="list-group">
                  {pendingFiles.map((file, index) => (
                    <div className="list-group-item d-flex justify-content-between align-items-center" key={index}>
                      <div>
                        <i className="fa fa-file me-2"></i>
                        <span>{file.name}</span>
                      </div>
                      <span className="badge bg-secondary">{formatSelectedFileSize(file)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="confirmUpload" disabled={isUploading} onClick={handleConfirmUpload}>
              {isUploading ? (
                <><i className="fa fa-spinner fa-spin me-1"></i>Uploading...</>
              ) : (
                <><i className="fa fa-upload me-1"></i>Upload</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
