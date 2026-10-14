/**
 * Ticket Types Page
 * Master for ticket type codes
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { TableSkeleton } from '../../components/skeleton/Skeleton';

const EMPTY_FORM = { editId: '', code: '', name: '', description: '', status: 'active' };

export default function TicketTypes() {
  const { userCan } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [ticketTypes, setTicketTypes] = useState([]);

  // Add/Edit modal
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalTitle, setModalTitle] = useState('Add Ticket Type');
  const [codeReadOnly, setCodeReadOnly] = useState(false);
  const [showStatusField, setShowStatusField] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation modal
  const [deleteType, setDeleteType] = useState({ id: '', code: '' });
  const [deleting, setDeleting] = useState(false);

  const changeForm = (changes) => setForm((old) => ({ ...old, ...changes }));

  // Load ticket types
  const loadTypes = () => {
    setIsLoading(true);
    api.call('ticketTypes.getList', (error, result) => {
      setIsLoading(false);
      if (error) {
        console.error('Error loading ticket types:', error);
        toastr.error('Failed to load ticket types');
        return;
      }
      setTicketTypes(result || []);
    });
  };

  useEffect(() => {
    loadTypes();
  }, []);

  // Open add modal
  const openAddModal = (event) => {
    event.preventDefault();
    setForm(EMPTY_FORM);
    setCodeReadOnly(false);
    setShowStatusField(false);
    setModalTitle('Add Ticket Type');
    $('#ticketTypeModal').modal('show');
  };

  // Open edit modal
  const openEditModal = (event, typeId) => {
    event.preventDefault();
    const ticketType = ticketTypes.find((t) => t._id === typeId);

    if (ticketType) {
      setForm({
        editId: ticketType._id,
        code: ticketType.code,
        name: ticketType.name,
        description: ticketType.description || '',
        status: ticketType.status
      });
      setCodeReadOnly(true);
      setShowStatusField(true);
      setModalTitle('Edit Ticket Type');
      $('#ticketTypeModal').modal('show');
    }
  };

  // Auto uppercase code
  const handleCodeInput = (event) => {
    changeForm({ code: event.target.value.toUpperCase().replace(/[^A-Z]/g, '') });
  };

  // Save ticket type
  const saveTicketType = (event) => {
    event.preventDefault();

    const editId = form.editId;
    const code = (form.code || '').trim();
    const name = (form.name || '').trim();
    const description = (form.description || '').trim();
    const status = form.status;

    if (!code) {
      toastr.error('Code is required');
      return;
    }

    if (!name) {
      toastr.error('Name is required');
      return;
    }

    if (code.length < 2 || code.length > 10) {
      toastr.error('Code must be 2-10 characters');
      return;
    }

    setSaving(true);

    if (editId) {
      // Update existing
      api.call('ticketTypes.update', editId, { name, description, status }, (error) => {
        setSaving(false);
        if (error) {
          toastr.error(error.reason || 'Failed to update ticket type');
          return;
        }
        toastr.success('Ticket type updated successfully');
        $('#ticketTypeModal').modal('hide');
        loadTypes();
      });
    } else {
      // Create new
      api.call('ticketTypes.create', { code, name, description }, (error) => {
        setSaving(false);
        if (error) {
          toastr.error(error.reason || 'Failed to create ticket type');
          return;
        }
        toastr.success('Ticket type created successfully');
        $('#ticketTypeModal').modal('hide');
        loadTypes();
      });
    }
  };

  // Open delete confirmation
  const openDeleteModal = (event, ticketType) => {
    event.preventDefault();
    setDeleteType({ id: ticketType._id, code: ticketType.code });
    $('#deleteTypeModal').modal('show');
  };

  // Confirm delete
  const confirmDelete = (event) => {
    event.preventDefault();
    const typeId = deleteType.id;

    setDeleting(true);

    api.call('ticketTypes.delete', typeId, (error) => {
      setDeleting(false);
      if (error) {
        toastr.error(error.reason || 'Failed to delete ticket type');
        return;
      }
      toastr.success('Ticket type deleted successfully');
      $('#deleteTypeModal').modal('hide');
      loadTypes();
    });
  };

  const deleteButton = (ticketType) => (
    <button className="btn btn-outline-danger deleteType" data-id={ticketType._id} data-code={ticketType.code}
      onClick={(event) => openDeleteModal(event, ticketType)}>
      <i className="fa fa-trash"></i>
    </button>
  );

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Ticket Types</h4>
            <p className="text-muted mb-0">Manage ticket type codes (CRM, SERVICE, etc.)</p>
          </div>
          {userCan('ticketTypes_create') && (
            <button type="button" className="btn btn-primary" id="addTicketType" onClick={openAddModal}>
              <i className="fa fa-plus me-1"></i> Add Type
            </button>
          )}
        </div>

        {/* Types Table */}
        <div className="card">
          <div className="card-body">
            {isLoading ? (
              <TableSkeleton rows={6} columns={4} label="Loading ticket types…" />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th width="100">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketTypes.map((ticketType) => (
                      <tr key={ticketType._id}>
                        <td><span className="badge bg-primary">{ticketType.code}</span></td>
                        <td>{ticketType.name}</td>
                        <td>{ticketType.description}</td>
                        <td>
                          {ticketType.status === 'active' ? (
                            <span className="badge bg-success">Active</span>
                          ) : (
                            <span className="badge bg-secondary">Inactive</span>
                          )}
                        </td>
                        {userCan('ticketTypes_update') ? (
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-primary editType" data-id={ticketType._id}
                                onClick={(event) => openEditModal(event, ticketType._id)}>
                                <i className="fa fa-pencil"></i>
                              </button>
                              {userCan('ticketTypes_delete') && deleteButton(ticketType)}
                            </div>
                          </td>
                        ) : (
                          userCan('ticketTypes_delete') && (
                            <td>
                              <div className="btn-group btn-group-sm">
                                {deleteButton(ticketType)}
                              </div>
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                    {ticketTypes.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-4">
                          <i className="fa fa-inbox fa-2x mb-2 d-block"></i>
                          No ticket types found. Click &quot;Add Type&quot; to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <div className="modal fade" id="ticketTypeModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="ticketTypeModalTitle">{modalTitle}</h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form id="ticketTypeForm">
                <input type="hidden" id="editTypeId" value={form.editId} readOnly />

                <div className="mb-3">
                  <label className="form-label" htmlFor="typeCode">Code <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="typeCode" placeholder="e.g., CRM, SERVICE" maxLength="10" required
                    value={form.code} readOnly={codeReadOnly} onChange={handleCodeInput} />
                  <small className="text-muted">2-10 uppercase letters only (will be auto-converted)</small>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="typeName">Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="typeName" placeholder="e.g., Customer Relationship" required
                    value={form.name} onChange={(event) => changeForm({ name: event.target.value })} />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="typeDescription">Description</label>
                  <textarea className="form-control" id="typeDescription" rows="2" placeholder="Optional description"
                    value={form.description} onChange={(event) => changeForm({ description: event.target.value })}></textarea>
                </div>

                <div className="mb-3" id="statusField" style={showStatusField ? undefined : { display: 'none' }}>
                  <label className="form-label" htmlFor="typeStatus">Status</label>
                  <select className="form-select" id="typeStatus"
                    value={form.status} onChange={(event) => changeForm({ status: event.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" id="saveTicketType" disabled={saving} onClick={saveTicketType}>
                {saving ? <><i className="fa fa-spinner fa-spin"></i> Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="deleteTypeModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Delete Ticket Type</h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete ticket type <strong id="deleteTypeCode">{deleteType.code}</strong>?</p>
              <p className="text-warning"><i className="fa fa-exclamation-triangle me-1"></i> This may affect existing tickets using this type.</p>
              <input type="hidden" id="deleteTypeId" value={deleteType.id} readOnly />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-danger" id="confirmDeleteType" disabled={deleting} onClick={confirmDelete}>
                {deleting ? <><i className="fa fa-spinner fa-spin"></i> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
