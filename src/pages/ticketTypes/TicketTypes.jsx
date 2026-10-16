/**
 * Ticket Types Page
 * Master for ticket type codes
 */
import { useEffect, useState } from 'react';
import moment from 'moment';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { CardGridSkeleton } from '../../components/skeleton/Skeleton';
import './ticketTypes.css';

const EMPTY_FORM = { editId: '', code: '', name: '', description: '', status: 'active' };

const FILTERS = [
  { key: 'all', label: 'All types', icon: 'bx-purchase-tag-alt', tone: 'indigo' },
  { key: 'active', label: 'Active', icon: 'bx-check-circle', tone: 'green' },
  { key: 'inactive', label: 'Inactive', icon: 'bx-pause-circle', tone: 'slate' },
];

/** A colour for the code chip that stays the same for a code. */
const hueOf = (code) => {
  let sum = 0;
  for (let i = 0; i < (code || '').length; i++) sum += code.charCodeAt(i);
  return 'hue-' + (sum % 6);
};

const StatusPill = ({ status }) => (
  status === 'active'
    ? <span className="tt-status tone-green">Active</span>
    : <span className="tt-status tone-slate">Inactive</span>
);

export default function TicketTypes() {
  const { userCan } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

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

  const canCreate = userCan('ticketTypes_create');
  const canUpdate = userCan('ticketTypes_update');
  const canDelete = userCan('ticketTypes_delete');

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

  const counts = {
    all: ticketTypes.length,
    active: ticketTypes.filter((t) => t.status === 'active').length,
  };
  counts.inactive = counts.all - counts.active;

  const needle = search.trim().toLowerCase();
  const shown = ticketTypes.filter((t) => (filter === 'all' || (filter === 'active') === (t.status === 'active'))
    && (!needle || [t.code, t.name, t.description].some((value) => (value || '').toLowerCase().includes(needle))));

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

  const renderEmpty = () => {
    if (ticketTypes.length === 0) {
      return (
        <div className="tt-empty">
          <i className="bx bx-purchase-tag-alt"></i>
          <strong>No ticket types yet</strong>
          <span>Ticket types group tickets by kind, e.g. CRM or SERVICE.</span>
          {canCreate && (
            <button type="button" className="btn btn-sm btn-primary mt-2" onClick={openAddModal}>
              <i className="bx bx-plus me-1"></i> Add the first type
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="tt-empty">
        <i className="bx bx-search-alt"></i>
        <strong>No matching ticket types</strong>
        <span>{needle ? `Nothing matches “${search.trim()}”.` : 'No ticket types with this status.'}</span>
        <button type="button" className="btn btn-sm btn-outline-secondary mt-2"
          onClick={() => { setSearch(''); setFilter('all'); }}>
          Clear filters
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y tt-page">
        {/* Page Header */}
        <div className="tt-header">
          <div>
            <h4 className="fw-bold mb-1">Ticket Types</h4>
            <p className="text-muted mb-0">Manage ticket type codes (CRM, SERVICE, etc.)</p>
          </div>
          {canCreate && (
            <button type="button" className="btn btn-primary" id="addTicketType" onClick={openAddModal}>
              <i className="bx bx-plus me-1"></i> Add Type
            </button>
          )}
        </div>

        {/* Summary: each tile also filters the list */}
        <div className="tt-summary">
          {FILTERS.map((item) => (
            <button type="button" key={item.key}
              className={'tt-tile tone-' + item.tone + (filter === item.key ? ' active' : '')}
              aria-pressed={filter === item.key}
              onClick={() => setFilter(filter === item.key ? 'all' : item.key)}>
              <span className="tt-tile-icon"><i className={'bx ' + item.icon}></i></span>
              <span className="tt-tile-text"><strong>{isLoading ? '–' : counts[item.key]}</strong><small>{item.label}</small></span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="tt-toolbar">
          <div className="tt-search">
            <i className="bx bx-search"></i>
            <input type="text" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by code, name or description" aria-label="Search ticket types" />
            {search && (
              <button type="button" className="tt-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <i className="bx bx-x"></i>
              </button>
            )}
          </div>
          {!isLoading && ticketTypes.length > 0 && (
            <span className="tt-count">Showing {shown.length} of {ticketTypes.length}</span>
          )}
        </div>

        {/* Types */}
        {isLoading ? (
          <CardGridSkeleton count={6} label="Loading ticket types…" />
        ) : shown.length === 0 ? (
          renderEmpty()
        ) : (
          <div className="tt-grid">
            {shown.map((ticketType) => (
              <div key={ticketType._id}
                className={'tt-card ' + hueOf(ticketType.code) + (ticketType.status === 'active' ? '' : ' is-inactive')}>
                <div className="tt-card-head">
                  <span className="tt-code"><i className="bx bx-purchase-tag"></i>{ticketType.code}</span>
                  {(canUpdate || canDelete) && (
                    <div className="tt-actions">
                      {canUpdate && (
                        <button type="button" className="tt-action editType" data-id={ticketType._id}
                          title="Edit" aria-label={'Edit ' + ticketType.code}
                          onClick={(event) => openEditModal(event, ticketType._id)}>
                          <i className="bx bx-edit-alt"></i>
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" className="tt-action is-danger deleteType" data-id={ticketType._id}
                          data-code={ticketType.code} title="Delete" aria-label={'Delete ' + ticketType.code}
                          onClick={(event) => openDeleteModal(event, ticketType)}>
                          <i className="bx bx-trash"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h6 className="tt-name">{ticketType.name}</h6>
                  <p className={'tt-desc' + (ticketType.description ? '' : ' is-empty')} title={ticketType.description || undefined}>
                    {ticketType.description || 'No description'}
                  </p>
                </div>
                <div className="tt-card-foot">
                  <StatusPill status={ticketType.status} />
                  {(ticketType.updatedAt || ticketType.createdAt) && (
                    <span className="tt-updated">Updated {moment(ticketType.updatedAt || ticketType.createdAt).format('DD MMM YYYY')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <div className="modal fade tt-page" id="ticketTypeModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center" id="ticketTypeModalTitle">
                <span className="tt-modal-icon"><i className={'bx ' + (form.editId ? 'bx-edit-alt' : 'bx-purchase-tag-alt')}></i></span>
                {modalTitle}
              </h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {/* Live preview of the type */}
              <div className={'tt-preview ' + hueOf(form.code)}>
                <span className="tt-code"><i className="bx bx-purchase-tag"></i>{form.code || 'CODE'}</span>
                <span className="tt-name">{form.name.trim() || 'Ticket type name'}</span>
              </div>

              <form id="ticketTypeForm">
                <input type="hidden" id="editTypeId" value={form.editId} readOnly />

                <div className="mb-3">
                  <label className="form-label" htmlFor="typeCode">Code <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="typeCode" placeholder="e.g., CRM, SERVICE" maxLength="10" required
                    value={form.code} readOnly={codeReadOnly} onChange={handleCodeInput} />
                  <div className="tt-field-hint">
                    <span>{codeReadOnly ? 'The code cannot be changed once created' : '2-10 letters, auto-converted to uppercase'}</span>
                    <span>{form.code.length}/10</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="typeName">Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" id="typeName" placeholder="e.g., Customer Relationship" required
                    value={form.name} onChange={(event) => changeForm({ name: event.target.value })} />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="typeDescription">Description</label>
                  <textarea className="form-control" id="typeDescription" rows="3" placeholder="Optional description"
                    value={form.description} onChange={(event) => changeForm({ description: event.target.value })}></textarea>
                </div>

                {showStatusField && (
                  <div className="mb-1" id="statusField">
                    <label className="form-label">Status</label>
                    <div className="tt-status-switch" role="radiogroup" aria-label="Status">
                      <button type="button" role="radio" aria-checked={form.status === 'active'}
                        className={'tone-green' + (form.status === 'active' ? ' active' : '')}
                        onClick={() => changeForm({ status: 'active' })}>
                        <i className="bx bx-check-circle"></i> Active
                      </button>
                      <button type="button" role="radio" aria-checked={form.status !== 'active'}
                        className={'tone-slate' + (form.status !== 'active' ? ' active' : '')}
                        onClick={() => changeForm({ status: 'inactive' })}>
                        <i className="bx bx-pause-circle"></i> Inactive
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" id="saveTicketType" disabled={saving} onClick={saveTicketType}>
                {saving ? <><i className="fa fa-spinner fa-spin"></i> Saving...</> : (form.editId ? 'Save changes' : 'Create type')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="deleteTypeModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Delete Ticket Type</h5>
              <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete ticket type <strong id="deleteTypeCode">{deleteType.code}</strong>?</p>
              <p className="text-warning mb-0"><i className="bx bx-error me-1"></i> This may affect existing tickets using this type.</p>
              <input type="hidden" id="deleteTypeId" value={deleteType.id} readOnly />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-dismiss="modal">Cancel</button>
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
