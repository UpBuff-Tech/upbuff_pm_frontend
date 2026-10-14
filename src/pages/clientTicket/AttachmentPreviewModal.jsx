/**
 * Attachment Preview Modal (#clientAttachmentPreviewModal): shows an image attachment of a ticket.
 *
 *   <AttachmentPreviewModal preview={{ fileName, blobUrl }} />     // nothing until the first preview
 */
export default function AttachmentPreviewModal({ preview }) {
  return (
    <div className="modal fade" id="clientAttachmentPreviewModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header py-2">
            <h6 className="modal-title d-flex align-items-center gap-2">
              <i className="bx bx-show text-secondary"></i>
              <span id="clientPreviewFileName" className="text-truncate" style={{ maxWidth: '500px' }}>{preview ? preview.fileName : ''}</span>
            </h6>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body p-3" id="clientPreviewContent">
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
