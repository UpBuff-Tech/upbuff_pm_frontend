/**
 * Create Ticket Modal (#createTicketModal) of the client ticket page.
 *
 *   <CreateTicketModal ticketTypes={ticketTypes} onTicketCreated={loadTickets} />
 *
 * The page opens it with $('#createTicketModal').modal('show'); the form is cleared every time
 * the modal is shown.
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { destroySelect2, formatBytes, getClientFileIconClass } from './utils';

export default function CreateTicketModal({ ticketTypes, onTicketCreated }) {
  const formRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Every time the modal opens: empty form, no files, fresh select2 dropdowns.
  useEffect(() => {
    const modal = $('#createTicketModal');

    const onShow = () => {
      formRef.current.reset();
      setSelectedFiles([]);

      // Destroy existing Select2 instances before reinitializing
      modal.find('select').each(function () {
        destroySelect2($(this));
      });

      ['ticketType', 'ticketPriority'].forEach(id => {
        $(`#${id}`).select2({
          placeholder: id === 'ticketType' ? 'Select Type' : 'Select Priority',
          allowClear: true,
          width: '100%',
          dropdownParent: modal
        });
      });
    };

    modal.on('show.bs.modal', onShow);
    return () => modal.off('show.bs.modal', onShow);
  }, []);

  /** Adds the files that are not in the list yet (same name and size = same file). */
  const addFiles = (newFiles) => {
    setSelectedFiles((current) => {
      const files = current.slice();
      newFiles.forEach(f => {
        const duplicate = files.some(x => x.name === f.name && x.size === f.size);
        if (!duplicate) files.push(f);
      });
      return files;
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const handleBrowseFiles = (event) => {
    event.preventDefault();
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleFilesChosen = (event) => {
    addFiles(Array.from(event.currentTarget.files));
    event.currentTarget.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles((current) => current.filter((file, i) => i !== index));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // The two dropdowns are select2 dropdowns, so the form is read through jQuery.
    const typeId = $('#ticketType').val();
    const subject = $('#ticketSubject').val().trim();
    const description = $('#ticketDescription').val().trim();
    const priority = $('#ticketPriority').val();
    const contactPerson = $('#contactPerson').val().trim();
    const contactEmail = $('#contactEmail').val().trim();
    const contactNumber = $('#contactNumber').val().trim();
    const files = selectedFiles.slice();

    if (!typeId) {
      toastr.error('Please select a ticket type');
      return;
    }

    if (!subject) {
      toastr.error('Please enter a subject');
      return;
    }

    if (!contactPerson) {
      toastr.error('Please enter a contact person');
      return;
    }

    if (!contactEmail) {
      toastr.error('Please enter a contact email');
      return;
    }

    if (!contactNumber) {
      toastr.error('Please enter a contact number');
      return;
    }

    setIsSubmitting(true);

    api.call('tickets.createFromClient', {
      typeId: typeId,
      subject: subject,
      description: description,
      priority: priority,
      contactPerson: contactPerson,
      contactEmail: contactEmail,
      contactNumber: contactNumber
    }, (error, result) => {
      if (error) {
        setIsSubmitting(false);
        console.error('Error creating ticket:', error);
        toastr.error(error.reason || 'Failed to create ticket');
        return;
      }

      const ticketMongoId = result._id;
      const uploadQueue = Array.from(files);

      // Upload the attachments one after another, then finish.
      const uploadNext = (index) => {
        if (index >= uploadQueue.length) {
          setIsSubmitting(false);
          toastr.success('Ticket created successfully! Ticket ID: ' + result.ticketId);
          $('#createTicketModal').modal('hide');
          onTicketCreated();
          return;
        }

        const file = uploadQueue[index];
        const reader = new FileReader();
        reader.onload = (e) => {
          api.call('tickets.addAttachment', ticketMongoId, {
            name: file.name,
            size: file.size,
            type: file.type,
            data: e.target.result
          }, (err) => {
            if (err) {
              toastr.warning(`Failed to upload ${file.name}: ${err.reason}`);
            }
            uploadNext(index + 1);
          });
        };
        reader.readAsDataURL(file);
      };

      uploadNext(0);
    });
  };

  return (
    <div className="modal fade" id="createTicketModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bx bx-plus-circle me-2"></i>Create New Ticket
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <form id="createTicketForm" ref={formRef} onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold" htmlFor="ticketType">Ticket Type <span className="text-danger">*</span></label>
                  <select className="form-select" id="ticketType" required>
                    <option value="">Select Type</option>
                    {ticketTypes.map((type) => (
                      <option key={type._id} value={type._id}>{type.name} ({type.code})</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold" htmlFor="ticketPriority">Priority</label>
                  <select className="form-select" id="ticketPriority" defaultValue="medium">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold" htmlFor="ticketSubject">Subject <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="ticketSubject" placeholder="Brief description of the issue" required />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold" htmlFor="ticketDescription">Description</label>
                  <textarea className="form-control" id="ticketDescription" rows="5" placeholder="Provide detailed information about your issue..."></textarea>
                </div>
                <div className="col-12 mb-2">
                  <h6 className="fw-bold text-muted">Contact Details</h6>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-bold" htmlFor="contactPerson">Contact Person <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="contactPerson" placeholder="Full name" required />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-bold" htmlFor="contactEmail">Email <span className="text-danger">*</span></label>
                  <input type="email" className="form-control" id="contactEmail" placeholder="email@example.com" required />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-bold" htmlFor="contactNumber">Contact Number <span className="text-danger">*</span></label>
                  <input type="tel" className="form-control" id="contactNumber" placeholder="Enter Valid Number" required />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold">Attachments</label>
                  <div className={'attachment-dropzone' + (isDragOver ? ' drag-over' : '')} id="attachmentDropZone"
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    <i className="bx bx-cloud-upload attachment-dropzone-icon"></i>
                    <div className="attachment-dropzone-text">Drag &amp; drop files here or</div>
                    <button type="button" className="btn btn-primary btn-sm mt-1" id="addAttachmentBtn" onClick={handleBrowseFiles}>
                      <i className="bx bx-plus me-1"></i>Browse Files
                    </button>
                    <div className="attachment-dropzone-hint">Supports images, PDF, Word, Excel, ZIP · Max 10MB each</div>
                  </div>
                  <input type="file" id="ticketAttachments" ref={fileInputRef} multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    style={{ display: 'none' }} onChange={handleFilesChosen} />
                  <div id="attachmentFileList" className="mt-2">
                    {selectedFiles.map((file, index) => {
                      const { cls, icon } = getClientFileIconClass(file);
                      return (
                        <div className="attachment-file-item" key={index}>
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <div className={`attachment-file-icon ${cls}`}>
                              <i className={icon}></i>
                            </div>
                            <div className="text-truncate">
                              <div className="text-truncate" style={{ fontSize: '0.85rem', fontWeight: 500 }}>{file.name}</div>
                              <div style={{ fontSize: '0.75rem' }} className="text-muted">{formatBytes(file.size)}</div>
                            </div>
                          </div>
                          <button type="button" className="btn btn-sm btn-link text-danger p-0 ms-2 flex-shrink-0 removeAttachmentFile"
                            data-index={index} title="Remove" onClick={() => removeFile(index)}>
                            <i className="bx bx-trash"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="submit" className="btn btn-primary" id="submitTicketBtn" disabled={isSubmitting}>
                <span className={'spinner-border spinner-border-sm me-1' + (isSubmitting ? '' : ' d-none')} id="submitSpinner"></span>
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
