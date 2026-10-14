// Helpers of the Document Repository page.

import moment from 'moment';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/* ---------------------------------------------------------------- what kind of file a document is */

export function isPDF(doc) {
  return doc && (doc.type === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf'));
}

export function isWord(doc) {
  if (!doc) return false;
  const wordTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  return wordTypes.includes(doc.type) ||
         doc.name.toLowerCase().match(/\.(doc|docx)$/);
}

export function isExcel(doc) {
  if (!doc) return false;
  const excelTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  return excelTypes.includes(doc.type) ||
         doc.name.toLowerCase().match(/\.(xls|xlsx)$/);
}

export function isImage(doc) {
  if (!doc) return false;
  return doc.type.startsWith('image/') ||
         doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|svg)$/);
}

/* ---------------------------------------------------------------- formatting */

export function formatDate(date) {
  return date ? moment(date).format('MMM DD, YYYY') : 'N/A';
}

export function formatFileSize(bytes) {
  if (!bytes) return 'N/A';

  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);

  return `${size} ${sizes[i]}`;
}

/** The size of a file chosen for upload, e.g. "12.50 KB" or "1.20 MB". */
export function formatSelectedFileSize(file) {
  const fileSize = (file.size / 1024).toFixed(2);
  const sizeUnit = file.size >= 1024 * 1024 ? 'MB' : 'KB';
  const displaySize = file.size >= 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(2) : fileSize;
  return `${displaySize} ${sizeUnit}`;
}

/* ---------------------------------------------------------------- files from the server (base64 "data:" URLs) */

/** Open a file in a new browser tab. */
export function openDataUrlInNewTab(dataUrl) {
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([ab], { type: mimeString });
  const url = URL.createObjectURL(blob);

  window.open(url, '_blank');

  // Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/** Save a file on the user's computer. */
export function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ---------------------------------------------------------------- project dropdowns of the modals (select2) */

/**
 * Turn the project dropdown of a modal into a select2 dropdown and choose a project in it.
 * Called every time the modal is opened, so an existing select2 is destroyed first.
 */
export function showProjectSelect2(selectSelector, modalSelector, placeholder, selectedProjectId) {
  const $projectSelect = $(selectSelector);

  destroyProjectSelect2(selectSelector);

  // Initialize Select2
  $projectSelect.select2({
    dropdownParent: $(modalSelector),
    placeholder: placeholder,
    allowClear: true,
    width: '100%'
  });

  $projectSelect.val(selectedProjectId).trigger('change');
}

/** Destroy existing Select2 if any */
export function destroyProjectSelect2(selectSelector) {
  const $projectSelect = $(selectSelector);
  if ($projectSelect.hasClass('select2-hidden-accessible')) {
    $projectSelect.select2('destroy');
  }
}
