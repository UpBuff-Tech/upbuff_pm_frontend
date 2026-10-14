/**
 * Attachment Preview Modal (#attachmentPreviewModal): shows an image attachment.
 *
 *   openAttachmentPreview(fileName, blobUrl);
 */
import { useState } from 'react';
import { createModalHandle, useModalHandle } from './modalHandle';

const modal = createModalHandle();

export function openAttachmentPreview(fileName, blobUrl) {
  modal.call('open', fileName, blobUrl);
}

export default function AttachmentPreviewModal() {
  const [preview, setPreview] = useState(null); // { fileName, blobUrl }

  const open = (fileName, blobUrl) => {
    // Show image inside the preview modal
    setPreview({ fileName, blobUrl });
    $('#attachmentPreviewModal').modal('show');
  };

  useModalHandle(modal, { open });

  return (
    <div className="modal fade" id="attachmentPreviewModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header py-2">
            <h6 className="modal-title d-flex align-items-center gap-2">
              <i className="fa fa-eye text-secondary"></i>
              <span id="previewFileName" className="text-truncate" style={{ maxWidth: '500px' }}>{preview && preview.fileName}</span>
            </h6>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body p-3" id="previewContent">
            {preview && (
              <div className="text-center">
                <img src={preview.blobUrl} className="img-fluid" style={{ maxHeight: '70vh' }} alt={preview.fileName} />
              </div>
            )}
          </div>
          <div className="modal-footer py-2">
            <button type="button" className="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
