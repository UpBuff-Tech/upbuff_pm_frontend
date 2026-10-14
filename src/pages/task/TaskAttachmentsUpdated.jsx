/**
 * Attachments widget for the task detail modal.
 *
 *   <TaskAttachmentsUpdated board={board} />
 *
 * Owns the upload-target folder (selected via the FolderTree component),
 * uploads files as base64 via projectTasks.addAttachment, and serves
 * view/download through projectTasks.downloadAttachment (attachments live in
 * external file storage — only metadata is on the task doc).
 *
 * From `board` it reads detailTask / detailFullTask / detailLoading (the task
 * open in the detail modal) and refreshes them after an upload.
 */
import { useEffect, useRef, useState } from 'react';
import moment from 'moment';

import api from '../../api/client';
import FolderTree from '../../components/folderTree/FolderTree';
import { EmptyState } from '../../components/detailModal/DetailModal';
import { ListSkeleton } from '../../components/skeleton/Skeleton';
import { refreshTaskDetail } from './updatedTaskUtils';

function attachmentSize(attachment) {
  return attachment && attachment.size ? (attachment.size / 1024).toFixed(2) : '0.00';
}

function attachmentUploader(attachment) {
  return (attachment && attachment.uploadedByName) || 'Unknown';
}

function attachmentDate(attachment) {
  return attachment && attachment.uploadedAt ? moment(attachment.uploadedAt).format('MMM DD, YYYY') : 'Unknown';
}

export default function TaskAttachmentsUpdated({ board }) {
  const fileInputRef = useRef(null);

  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState('Root (No Folder)');

  /** The task currently open in the detail modal. */
  const task = board ? (board.detailFullTask || board.detailTask) : null;
  const taskId = task ? task._id : null;
  const fullTask = board && board.detailFullTask;
  const loadingFull = board ? board.detailLoading : false;

  // Reset the folder selection whenever a different task is opened
  useEffect(() => {
    setSelectedFolderId(null);
    setSelectedFolderPath('Root (No Folder)');
  }, [taskId]);

  /**
   * Attachments of the SELECTED folder only (root = attachments without a
   * folder). Selecting a folder in the tree filters the list to its files.
   */
  const allAttachments = (fullTask && fullTask.attachments) || [];
  const attachments = allAttachments.filter(attachment => (attachment.folderId || null) === (selectedFolderId || null));

  // The FolderTree component announces selections through this callback
  const handleFolderSelected = (folderId, folderName) => {
    setSelectedFolderId(folderId);
    setSelectedFolderPath(folderName || 'Root (No Folder)');
  };

  /**
   * The folder modals (rendered by FolderTree INSIDE this widget, i.e. nested
   * in the task detail modal's DOM) use legacy data-dismiss buttons. Close
   * only the folder modal and stop the click here — otherwise it bubbles up
   * to the detail modal's element and global dismiss shims, closing both.
   */
  const handleWidgetClick = (event) => {
    const dismissButton = event.target.closest('[data-dismiss="modal"]');
    if (!dismissButton) return;
    event.preventDefault();
    event.stopPropagation();
    $(dismissButton).closest('.modal').modal('hide');
  };

  const handleUploadClick = (event) => {
    event.preventDefault();

    if (!board || !task) return;

    const fileInput = fileInputRef.current;
    const files = fileInput ? fileInput.files : null;
    if (!files || files.length === 0) {
      toastr.error('Please select files to upload');
      return;
    }

    const folderId = selectedFolderId;
    const folderPath = selectedFolderPath;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        api.call('projectTasks.addAttachment', task._id, {
          name: file.name,
          size: file.size,
          type: file.type,
          data: loadEvent.target.result,
          folderId: folderId || null
        }, (error) => {
          if (error) {
            toastr.error(`Failed to upload ${file.name}: ${error.reason}`);
            return;
          }
          toastr.success(`${file.name} uploaded successfully${folderId ? ` to ${folderPath}` : ''}`);
          refreshTaskDetail(board, task._id);
        });
      };
      reader.readAsDataURL(file);
    });

    fileInput.value = '';
  };

  const handleViewAttachment = (event, attachmentId) => {
    event.preventDefault();
    if (!task) return;

    api.call('projectTasks.downloadAttachment', task._id, attachmentId, (error, fileData) => {
      if (error || !fileData || !fileData.data) {
        toastr.error((error && error.reason) || 'Failed to load attachment');
        return;
      }
      // fileData.data is a data: URL — a blob URL is needed for window.open
      fetch(fileData.data)
        .then(response => response.blob())
        .then(blob => window.open(URL.createObjectURL(blob), '_blank'))
        .catch(() => toastr.error('Failed to open attachment'));
    });
  };

  const handleDownloadAttachment = (event, attachmentId) => {
    event.preventDefault();
    if (!task) return;

    const attachment = allAttachments.find(a => a.id === attachmentId);

    api.call('projectTasks.downloadAttachment', task._id, attachmentId, (error, fileData) => {
      if (error || !fileData || !fileData.data) {
        toastr.error((error && error.reason) || 'Failed to download file');
        return;
      }
      const link = document.createElement('a');
      link.href = fileData.data;
      link.download = (attachment && attachment.name) || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="row g-3 td-attachments" onClick={handleWidgetClick}>
      {/* Folder Tree Sidebar */}
      <div className="col-lg-4 col-md-5">
        <section className="dm-section td-folder-tree" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <FolderTree context="task" taskId={taskId} onFolderSelected={handleFolderSelected} />
        </section>
      </div>

      {/* Upload and Attachments Section */}
      <div className="col-lg-8 col-md-7">
        <div className="td-stack">
          <section className="dm-section">
            <div className="dm-section-head">
              <h6 className="dm-section-title"><i className="bx bx-upload"></i>Upload Attachment</h6>
            </div>
            {/* Selected Folder Display */}
            <div className="dm-callout dm-tone-cyan td-upload-target">
              <i className="bx bx-folder-open"></i>
              <strong>Upload to:</strong>&nbsp;<span>{selectedFolderPath}</span>
            </div>
            <input type="file" className="form-control" id="taskAttachment" multiple ref={fileInputRef} aria-label="Upload Attachment" />
            <small className="td-muted">You can upload multiple files</small>
            <div className="td-form-actions">
              <button type="button" className="btn btn-primary" id="uploadAttachment" onClick={handleUploadClick}>
                <i className="fa fa-upload me-1"></i>Upload Files
              </button>
            </div>
          </section>

          <section className="dm-section">
            <div className="dm-section-head">
              <h6 className="dm-section-title">
                <i className="bx bx-paperclip"></i>Files
                {!loadingFull && <span className="dm-count">{attachments.length}</span>}
              </h6>
            </div>
            <div id="attachmentsList">
              {loadingFull ? (
                <ListSkeleton rows={3} label="Loading attachments…" />
              ) : attachments.length > 0 ? (
                <div className="dm-files td-files">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="dm-file">
                      <span className="dm-file-icon"><i className="bx bx-file"></i></span>
                      <span className="dm-file-meta">
                        <strong title={attachment.name}>{attachment.name}</strong>
                        <small>{attachmentSize(attachment)} KB · Uploaded by {attachmentUploader(attachment)} on {attachmentDate(attachment)}</small>
                      </span>
                      <span className="td-file-actions">
                        <button type="button" className="td-icon-btn view-attachment"
                          data-attachment-id={attachment.id} title="View"
                          onClick={(event) => handleViewAttachment(event, attachment.id)}>
                          <i className="bx bx-show"></i>
                        </button>
                        <button type="button" className="td-icon-btn download-attachment"
                          data-attachment-id={attachment.id} title="Download"
                          onClick={(event) => handleDownloadAttachment(event, attachment.id)}>
                          <i className="bx bx-download"></i>
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="bx-file-blank">No attachments yet</EmptyState>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
