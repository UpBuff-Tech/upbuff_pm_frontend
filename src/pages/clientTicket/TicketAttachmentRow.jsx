/**
 * One attachment of the ticket shown in the View Ticket modal, with its Preview and Download buttons.
 *
 *   <TicketAttachmentRow attachment={att} onPreviewImage={(fileName, blobUrl) => ...} />
 */
import { useState } from 'react';
import api from '../../api/client';
import { formatBytes, getClientFileIconClass } from './utils';

export default function TicketAttachmentRow({ attachment, onPreviewImage }) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const filePath = attachment.path;
  const fileName = attachment.name;

  const handlePreview = () => {
    const fileType = attachment.type || '';

    setIsPreviewing(true);

    api.call('fileStorage.download', filePath, (err, result) => {
      setIsPreviewing(false);
      if (err) {
        toastr.error('Failed to load file');
        return;
      }

      const mimeType = fileType || 'application/octet-stream';
      const byteChars = atob(result.data);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      if (fileType.startsWith('image/')) {
        onPreviewImage(fileName, blobUrl);
      } else {
        window.open(blobUrl, '_blank');
      }
    });
  };

  const handleDownload = () => {
    const fileType = attachment.type || 'application/octet-stream';

    setIsDownloading(true);

    api.call('fileStorage.download', filePath, (err, result) => {
      setIsDownloading(false);
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

  const spinner = <span className="spinner-border spinner-border-sm"></span>;

  return (
    <div className="dm-file">
      <span className="dm-file-icon"><i className={getClientFileIconClass({ type: attachment.type, name: attachment.name || '' }).icon}></i></span>
      <span className="dm-file-meta">
        <strong title={attachment.name}>{attachment.name}</strong>
        <small>{formatBytes(attachment.size)}</small>
      </span>
      <div className="tdm-file-actions">
        <button className="btn btn-sm btn-outline-secondary clientPreviewAttachment"
          data-path={attachment.path} data-name={attachment.name} data-type={attachment.type || ''}
          title="Preview" disabled={isPreviewing} onClick={handlePreview}>
          {isPreviewing ? spinner : <i className="bx bx-show"></i>}
        </button>
        <button className="btn btn-sm btn-outline-primary clientDownloadAttachment"
          data-path={attachment.path} data-name={attachment.name} data-type={attachment.type || ''}
          title="Download" disabled={isDownloading} onClick={handleDownload}>
          {isDownloading ? spinner : <i className="bx bx-download"></i>}
        </button>
      </div>
    </div>
  );
}
