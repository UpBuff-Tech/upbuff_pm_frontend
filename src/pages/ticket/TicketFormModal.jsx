/**
 * Create/Edit Ticket Modal (#ticketFormModal).
 *
 *   openCreateTicketModal();
 *   openEditTicketModal(ticketId);     // loads the ticket and fills the form
 */
import { useRef, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { TASK_REQUEST_TYPES, DEFAULT_REQUEST_TYPE } from '../../lib/taskRequestType';
import { TicketPriority, TicketStatus } from '../../lib/shared/tickets';
import Select2 from './Select2';
import Select2DataLoad from './Select2DataLoad';
import { createModalHandle, useModalHandle } from './modalHandle';
import {
  addNewFiles,
  clientOptionText,
  formatBytes,
  getFileIconClass,
  getTicketTypesForClient,
  knownValue,
  userFullName
} from './ticketHelpers';

const modal = createModalHandle();

export function openCreateTicketModal() {
  modal.call('openCreate');
}

export function openEditTicketModal(ticketId) {
  modal.call('openEdit', ticketId);
}

const FULL_WIDTH = { width: '100%' };
const HIDDEN = { display: 'none' };

const EMPTY_FORM = {
  editTicketId: '',
  clientId: '',
  typeId: '',
  requestType: '',
  subject: '',
  description: '',
  contactPerson: '',
  contactEmail: '',
  contactNumber: '',
  priority: 'medium',
  assignedTo: '',
  dueDate: '',
  status: 'open',
  holdReason: '',
  estimatedHours: '',
  loggedHours: ''
};

export default function TicketFormModal({ clients, ticketTypes, assignableUsers, onTicketSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [title, setTitle] = useState('Create Ticket');
  const [showStatusField, setShowStatusField] = useState(false);
  const [showHoldReason, setShowHoldReason] = useState(false);
  const [showAttachmentsField, setShowAttachmentsField] = useState(false);
  const [saving, setSaving] = useState(false);

  // Options of the Type dropdown. null = every ticket type, as long as no client was chosen yet.
  const [clientTicketTypes, setClientTicketTypes] = useState(null);

  // The client / assignee dropdowns are built again every time the modal opens
  const [openCount, setOpenCount] = useState(0);
  const [selectedClientOption, setSelectedClientOption] = useState(null);
  const [selectedAssigneeOption, setSelectedAssigneeOption] = useState(null);

  // Attachments (create only)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const changeForm = (changes) => setForm((old) => ({ ...old, ...changes }));
  const fieldChange = (field) => (event) => changeForm({ [field]: event.target.value });

  const typeOptions = clientTicketTypes || ticketTypes || [];
  const isEdit = !!form.editTicketId;

  /**
   * Rebuild the ticket type dropdown filtered by the selected client's purchased products.
   * Shows all types if the client has no productsPurchased defined.
   */
  const rebuildTicketTypeDropdown = (clientId) => {
    setClientTicketTypes(getTicketTypesForClient(ticketTypes || [], clients, clientId));
    changeForm({ typeId: '' });
  };

  /* ---------------------------------------------------------------- opening the modal */

  // Create ticket
  const openCreate = () => {
    setForm({ ...EMPTY_FORM, requestType: DEFAULT_REQUEST_TYPE });
    setShowStatusField(false);
    setShowAttachmentsField(true);
    setTitle('Create Ticket');
    $('#ticketFormModal').modal('show');

    // Reset client/assignee options
    setSelectedClientOption(null);
    setSelectedAssigneeOption(null);
    setOpenCount((count) => count + 1);

    // Reset selected files
    setSelectedFiles([]);

    // Reset ticket type options to full list (filtered once client is chosen)
    rebuildTicketTypeDropdown('');
  };

  /**
   * Open edit modal for a ticket
   */
  const openEdit = (ticketId) => {
    api.call('tickets.getById', ticketId, (error, ticket) => {
      if (error || !ticket) {
        toastr.error('Failed to load ticket');
        return;
      }

      // Pre-add the selected client / assignee <option>s so select2 can render their text
      const selectedClient = (clients || []).find((c) => c._id === ticket.clientId);
      const selectedUser = ticket.assignedTo
        ? (assignableUsers || []).find((u) => u._id === ticket.assignedTo)
        : null;

      setForm({
        editTicketId: ticket._id,
        clientId: selectedClient ? ticket.clientId : '',
        typeId: ticket.typeId,
        requestType: knownValue(ticket.requestType || '', TASK_REQUEST_TYPES),
        subject: ticket.subject || '',
        description: ticket.description || '',
        contactPerson: ticket.contactPerson || '',
        contactEmail: ticket.contactEmail || '',
        contactNumber: ticket.contactNumber || '',
        priority: knownValue(ticket.priority, Object.values(TicketPriority)),
        assignedTo: selectedUser ? ticket.assignedTo : '',
        dueDate: ticket.dueDate ? moment(ticket.dueDate).format('YYYY-MM-DD') : '',
        status: knownValue(ticket.status, Object.values(TicketStatus)),
        holdReason: ticket.holdReason || '',
        estimatedHours: ticket.estimatedHours || 0,
        loggedHours: ticket.loggedHours || 0
      });

      // Show/hide hold reason
      setShowHoldReason(ticket.status === 'on_hold');
      setShowStatusField(true);
      setShowAttachmentsField(false);
      setTitle('Edit Ticket: ' + ticket.ticketId);
      $('#ticketFormModal').modal('show');

      setSelectedClientOption(selectedClient
        ? { id: ticket.clientId, text: clientOptionText(selectedClient) }
        : null);
      setSelectedAssigneeOption(selectedUser
        ? { id: ticket.assignedTo, text: userFullName(selectedUser) || ticket.assignedToName || ticket.assignedTo }
        : null);
      setOpenCount((count) => count + 1);
    });
  };

  useModalHandle(modal, { openCreate, openEdit });

  /* ---------------------------------------------------------------- events */

  // Filter ticket types by selected client's purchased products
  const handleClientChange = (clientId) => {
    changeForm({ clientId });
    rebuildTicketTypeDropdown(clientId);
  };

  // Show/hide hold reason field when status changes in edit form
  const handleStatusChange = (status) => {
    changeForm({ status });
    setShowHoldReason(status === 'on_hold');
  };

  // Attachment picker
  const handleAddAttachmentClick = (event) => {
    event.preventDefault();
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleAttachmentsChange = (event) => {
    const newFiles = Array.from(event.currentTarget.files);
    setSelectedFiles((files) => addNewFiles(files, newFiles));
    event.currentTarget.value = '';
  };

  const removeAttachmentFile = (index) => {
    setSelectedFiles((files) => files.filter((file, i) => i !== index));
  };

  // Drag-and-drop on the attachment dropzone
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    setSelectedFiles((files) => addNewFiles(files, droppedFiles));
  };

  /** Uploads the files one after another (as base64 data URLs), then calls done(). */
  const uploadAttachments = (ticketMongoId, files, done) => {
    const uploadNext = (index) => {
      if (index >= files.length) {
        done();
        return;
      }

      const file = files[index];
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
  };

  // Save ticket
  const saveTicket = (event) => {
    event.preventDefault();

    const editId = form.editTicketId;
    const clientId = form.clientId;
    const typeId = form.typeId;
    const requestType = form.requestType || null;
    const subject = form.subject.trim();
    const description = form.description.trim();
    const priority = form.priority || null;
    const assignedTo = form.assignedTo || null;
    const dueDate = form.dueDate || null;
    const status = form.status || null;
    const contactPerson = form.contactPerson.trim();
    const contactEmail = form.contactEmail.trim();
    const contactNumber = form.contactNumber.trim();

    if (!clientId) {
      toastr.error('Please select a client');
      return;
    }

    if (!typeId) {
      toastr.error('Please select a ticket type');
      return;
    }

    // Required for new tickets; one created before the field existed can
    // still be edited without being forced to pick.
    if (!requestType && !editId) {
      toastr.error('Please select a request type');
      return;
    }

    if (!subject) {
      toastr.error('Subject is required');
      return;
    }

    if (!contactPerson) {
      toastr.error('Contact person is required');
      return;
    }

    if (!contactEmail) {
      toastr.error('Contact email is required');
      return;
    }

    if (!contactNumber) {
      toastr.error('Contact number is required');
      return;
    }

    setSaving(true);

    const estimatedHours = parseFloat(form.estimatedHours) || 0;
    const loggedHours = parseFloat(form.loggedHours) || 0;
    const holdReason = form.holdReason.trim();

    if (editId) {
      // Update existing
      const ticketData = {
        requestType,
        subject,
        description,
        priority,
        assignedTo,
        dueDate,
        status,
        estimatedHours,
        loggedHours,
        holdReason,
        contactPerson,
        contactEmail,
        contactNumber
      };

      api.call('tickets.update', editId, ticketData, (error) => {
        setSaving(false);
        if (error) {
          toastr.error(error.reason || 'Failed to update ticket');
          return;
        }
        toastr.success('Ticket updated successfully');
        $('#ticketFormModal').modal('hide');
        onTicketSaved();
      });
    } else {
      // Create new
      const ticketData = {
        clientId,
        typeId,
        requestType,
        subject,
        description,
        priority,
        assignedTo,
        dueDate,
        estimatedHours,
        loggedHours,
        contactPerson,
        contactEmail,
        contactNumber
      };

      const files = selectedFiles.slice();

      api.call('tickets.create', ticketData, (error, result) => {
        if (error) {
          setSaving(false);
          toastr.error(error.reason || 'Failed to create ticket');
          return;
        }

        uploadAttachments(result._id, files, () => {
          setSaving(false);
          toastr.success(`Ticket created: ${result.ticketId}`);
          $('#ticketFormModal').modal('hide');
          onTicketSaved();
        });
      });
    }
  };

  /* ---------------------------------------------------------------- markup */

  return (
    <div className="modal fade" id="ticketFormModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="ticketFormTitle">{title}</h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form id="ticketForm">
              <input type="hidden" id="editTicketId" value={form.editTicketId} readOnly />

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketClient">Client <span className="text-danger">*</span></label>
                  {/* Client and type are immutable after creation */}
                  <Select2DataLoad className="form-select" id="ticketClient" style={FULL_WIDTH} required disabled={isEdit}
                    items={clients} type="Client" reloadKey={openCount} selectedOption={selectedClientOption}
                    onChange={handleClientChange}>
                    <option value="">Select Client</option>
                  </Select2DataLoad>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketType">Type <span className="text-danger">*</span></label>
                  <Select2 className="form-select" id="ticketType" style={FULL_WIDTH} required disabled={isEdit}
                    placeholder="Select Type" value={form.typeId} onChange={(value) => changeForm({ typeId: value })}>
                    <option value="">Select Type</option>
                    {typeOptions.map((type) => (
                      <option key={type._id} value={type._id}>{type.name} ({type.code})</option>
                    ))}
                  </Select2>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketRequestType">Request Type <span className="text-danger">*</span></label>
                  <Select2 className="form-select" id="ticketRequestType" style={FULL_WIDTH}
                    placeholder="Select Request Type" value={form.requestType} onChange={(value) => changeForm({ requestType: value })}>
                    <option value="">Select Request Type</option>
                    {TASK_REQUEST_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select2>
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="ticketSubject">Subject <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="ticketSubject" placeholder="Brief description of the issue" required
                    value={form.subject} onChange={fieldChange('subject')} />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="ticketDescription">Description</label>
                  <textarea className="form-control" id="ticketDescription" rows="4" placeholder="Detailed description..."
                    value={form.description} onChange={fieldChange('description')}></textarea>
                </div>

                {/* Contact Details */}
                <div className="col-12 mb-1">
                  <h6 className="fw-bold text-muted mb-2">Contact Details</h6>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketContactPerson">Contact Person <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="ticketContactPerson" placeholder="Full name" required
                    value={form.contactPerson} onChange={fieldChange('contactPerson')} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketContactEmail">Email <span className="text-danger">*</span></label>
                  <input type="email" className="form-control" id="ticketContactEmail" placeholder="email@example.com" required
                    value={form.contactEmail} onChange={fieldChange('contactEmail')} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketContactNumber">Contact Number <span className="text-danger">*</span></label>
                  <input type="tel" className="form-control" id="ticketContactNumber" placeholder="Enter Valid Number" required
                    value={form.contactNumber} onChange={fieldChange('contactNumber')} />
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketPriority">Priority</label>
                  <Select2 className="form-select" id="ticketPriority" style={FULL_WIDTH}
                    placeholder="Select Priority" value={form.priority} onChange={(value) => changeForm({ priority: value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </Select2>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketAssignee">Assign To</label>
                  <Select2DataLoad className="form-select" id="ticketAssignee" style={FULL_WIDTH}
                    items={assignableUsers} type="User" reloadKey={openCount} selectedOption={selectedAssigneeOption}
                    onChange={(value) => changeForm({ assignedTo: value })}>
                    <option value="">Unassigned</option>
                  </Select2DataLoad>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="ticketDueDate">Due Date</label>
                  <input type="date" className="form-control" id="ticketDueDate"
                    value={form.dueDate} onChange={fieldChange('dueDate')} />
                </div>

                {/* Status (only shown when editing) */}
                <div className="col-md-6 mb-3" id="statusFieldContainer" style={showStatusField ? undefined : HIDDEN}>
                  <label className="form-label" htmlFor="ticketStatus">Status</label>
                  <Select2 className="form-select" id="ticketStatus" style={FULL_WIDTH}
                    placeholder="Select Status" value={form.status} onChange={handleStatusChange}>
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="in_review">In Review</option>
                    <option value="closed">Closed</option>
                  </Select2>
                </div>

                {/* Hold Reason (only shown when On Hold) */}
                <div className="col-md-6 mb-3" id="holdReasonContainer" style={showHoldReason ? undefined : HIDDEN}>
                  <label className="form-label" htmlFor="ticketHoldReason">Hold Reason</label>
                  <input type="text" className="form-control" id="ticketHoldReason" placeholder="Reason for putting on hold"
                    value={form.holdReason} onChange={fieldChange('holdReason')} />
                </div>

                {/* Estimated Hours */}
                <div className="col-md-3 mb-3">
                  <label className="form-label" htmlFor="ticketEstimatedHours">Estimated Hours</label>
                  <input type="number" className="form-control" id="ticketEstimatedHours" min="0" step="0.5" placeholder="0"
                    value={form.estimatedHours} onChange={fieldChange('estimatedHours')} />
                </div>

                {/* Logged Hours */}
                <div className="col-md-3 mb-3">
                  <label className="form-label" htmlFor="ticketLoggedHours">Logged Hours</label>
                  <input type="number" className="form-control" id="ticketLoggedHours" min="0" step="0.5" placeholder="0"
                    value={form.loggedHours} onChange={fieldChange('loggedHours')} />
                </div>

                {/* Attachments (create only) */}
                <div className="col-md-12 mb-3" id="ticketAttachmentsField" style={showAttachmentsField ? undefined : HIDDEN}>
                  <label className="form-label">Attachments</label>
                  <div className={`attachment-dropzone ${dragOver ? 'drag-over' : ''}`} id="attachmentDropZone"
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    <i className="fa fa-cloud-upload attachment-dropzone-icon"></i>
                    <div className="attachment-dropzone-text">Drag &amp; drop files here or</div>
                    <button type="button" className="btn btn-primary btn-sm mt-1" id="addAttachmentBtn" onClick={handleAddAttachmentClick}>
                      <i className="fa fa-plus me-1"></i>Browse Files
                    </button>
                    <div className="attachment-dropzone-hint">Supports images, PDF, Word, Excel, ZIP · Max 10MB each</div>
                  </div>
                  <input type="file" id="ticketAttachments" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" style={HIDDEN}
                    ref={fileInputRef} onChange={handleAttachmentsChange} />
                  <div id="attachmentFileList" className="mt-2">
                    {selectedFiles.map((file, index) => {
                      const { cls, icon } = getFileIconClass(file);
                      return (
                        <div className="attachment-file-item" key={`${file.name}-${file.size}`}>
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <div className={`attachment-file-icon ${cls}`}>
                              <i className={`fa ${icon}`}></i>
                            </div>
                            <div className="text-truncate">
                              <div className="text-truncate" style={{ fontSize: '0.85rem', fontWeight: 500 }}>{file.name}</div>
                              <div style={{ fontSize: '0.75rem' }} className="text-muted">{formatBytes(file.size)}</div>
                            </div>
                          </div>
                          <button type="button" className="btn btn-sm btn-link text-danger p-0 ms-2 flex-shrink-0 removeAttachmentFile"
                            data-index={index} title="Remove" onClick={() => removeAttachmentFile(index)}>
                            <i className="fa fa-trash-o"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id="saveTicket" disabled={saving} onClick={saveTicket}>
              {saving ? <><i className="fa fa-spinner fa-spin"></i> Saving...</> : 'Save Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
