/**
 * One attachment of the ticket shown in the detail modal, with its Preview and Download buttons.
 */
import { useState } from 'react';
import api from '../../api/client';
import { openAttachmentPreview } from './AttachmentPreviewModal';
import { base64ToBlobUrl, formatFileSize, getFileIcon } from './ticketHelpers';

const SPINNER = <i className="fa fa-spinner fa-spin"></i>;

export default function TicketAttachmentRow({ attachment }) {
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const filePath = attachment.path;
  const fileName = attachment.name;

  // Preview attachment
  const previewAttachment = () => {
    const fileType = attachment.type || '';

    setPreviewing(true);

    api.call('fileStorage.download', filePath, (err, result) => {
      setPreviewing(false);
      if (err) {
        toastr.error('Failed to load file');
        return;
      }

      const mimeType = fileType || 'application/octet-stream';
      const blobUrl = base64ToBlobUrl(result.data, mimeType);

      if (fileType.startsWith('image/')) {
        // Show image inside the preview modal
        openAttachmentPreview(fileName, blobUrl);
      } else {
        // Open all other types (PDF, Word, text, etc.) in a new browser tab
        window.open(blobUrl, '_blank');
      }
    });
  };

  // Download attachment
  const downloadAttachment = () => {
    const fileType = attachment.type || 'application/octet-stream';

    setDownloading(true);

    api.call('fileStorage.download', filePath, (err, result) => {
      setDownloading(false);
      if (err) {
        toastr.error('Failed to download file');
        return;
      }
      const link = document.createElement('a');
      link.href = `data:${fileType};base64,${result.data}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="dm-file">
      <span className="dm-file-icon"><i className={`fa ${getFileIcon(attachment.type)}`}></i></span>
      <span className="dm-file-meta">
        <strong title={attachment.name}>{attachment.name}</strong>
        <small>{formatFileSize(attachment.size)}</small>
      </span>
      <div className="tdm-file-actions">
        <button className="btn btn-sm btn-outline-secondary previewAttachment"
          data-path={attachment.path}
          data-name={attachment.name}
          data-type={attachment.type || ''}
          title="Preview" disabled={previewing} onClick={previewAttachment}>
          {previewing ? SPINNER : <i className="fa fa-eye"></i>}
        </button>
        <button className="btn btn-sm btn-outline-primary downloadAttachment"
          data-path={attachment.path}
          data-name={attachment.name}
          data-type={attachment.type || ''}
          title="Download" disabled={downloading} onClick={downloadAttachment}>
          {downloading ? SPINNER : <i className="fa fa-download"></i>}
        </button>
      </div>
    </div>
  );
}
