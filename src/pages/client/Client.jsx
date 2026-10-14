/**
 * @author Nithin
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import Paginator from '../../components/Paginator';
import SuccessModal from '../../layouts/modals/SuccessModal';
import ErrorModal from '../../layouts/modals/ErrorModal';
import ClientFormModal, { openCreateClientModal, openEditClientModal } from './ClientFormModal';
import ClientCard, { productNamesText } from './ClientCard';
import ClientDetailModal, { buildClientDetail } from './ClientDetailModal';
import ClientDeleteModal from './ClientDeleteModal';
import './client.css';
import { CardGridSkeleton } from '../../components/skeleton/Skeleton';

/** True when the search term appears in the client's name, ID, email, phone or products. */
function clientMatchesSearch(client, searchTerm) {
  const values = [client.clientName, client.clientId, client.email, client.phone, productNamesText(client)];
  return values.some((value) => String(value || '').toLowerCase().includes(searchTerm));
}

export default function Client() {
  const { userCan } = useAuth();

  const pagination = usePagination('client', {
    filters: {},
    sort: { createdAt: -1 },
    fields: {},
    perPage: 20
  });
  const clientList = pagination.getPage();

  // Search box: the ids of the cards the last search filtered out
  const [searchText, setSearchText] = useState('');
  const [hiddenClientIds, setHiddenClientIds] = useState([]);

  // Detail modal
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  // Delete confirmation modal
  const [deleteHeader, setDeleteHeader] = useState('');
  const [deleteClientName, setDeleteClientName] = useState('');
  const [confirmedClientId, setConfirmedClientId] = useState('');

  // Initialize Select2 for client modal dropdowns
  useEffect(() => {
    const modal = $('#clientFormModal');
    const onShown = function () {
      $('.clientModalSelect').each(function () {
        const $el = $(this);
        if ($el.data('select2')) { $el.select2('destroy'); }
        $el.select2({
          placeholder: $el.find('option:first').text() || 'Select...',
          allowClear: true,
          dropdownParent: $el.parent(),
        });
      });
    };
    modal.on('shown.bs.modal', onShown);
    return () => modal.off('shown.bs.modal', onShown);
  }, []);

  /**
   * Create new client - open modal
   */
  const handleCreateClient = (event) => {
    event.preventDefault();
    openCreateClientModal();
  };

  /**
   * Edit client - open modal with data
   */
  const handleEdit = (event, client) => {
    event.preventDefault();
    openEditClientModal(client._id);
  };

  /**
   * Delete client - show confirmation modal
   */
  const handleDeactivate = (event, client) => {
    event.preventDefault();

    setDeleteHeader('Confirm Deletion');
    setDeleteClientName(client.clientName || 'this client');
    setConfirmedClientId(client._id);

    $('#clientDelConfirmation').modal('show');
  };

  /**
   * Confirm client deletion
   */
  const handleClientRemove = (event) => {
    event.preventDefault();
    let _id = confirmedClientId;
    if (_id && $.trim(_id)) {
      api.call('clients.remove', $.trim(_id), (error) => {
        if (error) {
          toastr.error('Error deleting client: ' + error.message);
        } else {
          toastr.success('Client deleted successfully');
          $('#clientDelConfirmation').modal('hide');
        }
      });
    }
  };

  /**
   * View client details - open detail modal
   */
  const handleView = (event, client) => {
    event.preventDefault();
    let id = client._id;

    // Show modal immediately with loader
    setDetailLoading(true);
    $('#clientDetailPage').modal('show');

    // Load users first, then load client details
    api.call('user.getAllForAssignment', (userError, users) => {
      if (userError) {
        console.error('Error loading users:', userError);
      }

      // Create a map for quick user lookup
      const usersMap = {};
      if (users) {
        users.forEach(user => {
          usersMap[user._id] = user;
        });
      }

      api.call('clients.dataFilter', id, (err, res) => {
        if (!err && res) {
          setDetail(buildClientDetail(res, usersMap));
        }
        // Hide loader once data is populated
        setDetailLoading(false);
      });
    });
  };

  /**
   * Search clients - real-time filtering
   */
  const handleSearchKeyUp = (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();

    if (!searchTerm) {
      setHiddenClientIds([]);
      return;
    }

    setHiddenClientIds(
      clientList.filter((client) => !clientMatchesSearch(client, searchTerm)).map((client) => client._id)
    );
  };

  /**
   * Reset search
   */
  const handleResetSearch = () => {
    setSearchText('');
    setHiddenClientIds([]);
  };

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Client Management</h4>
            <p className="text-muted mb-0">Manage client information, products, and support details</p>
          </div>
          {userCan('client_create') && (
            <button type="button" className="btn btn-primary createClient" onClick={handleCreateClient}>
              <i className="fa fa-plus me-1"></i> Add Client
            </button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-10">
                <div className="input-group">
                  <span className="input-group-text"><i className="fa fa-search"></i></span>
                  <input type="text" className="form-control" id="searchClients" placeholder="Search by name, email, phone, client ID, or product..."
                    value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyUp={handleSearchKeyUp} />
                </div>
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-outline-secondary w-100" id="resetSearch" onClick={handleResetSearch}>
                  <i className="fa fa-refresh"></i> Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="content">
          {pagination.ready() ? (
            <>
              {/* Client Cards */}
              <div className="row g-2" id="clientCardsContainer">
                {clientList.map((client) => (
                  <ClientCard key={client._id} client={client} hidden={hiddenClientIds.includes(client._id)}
                    onView={handleView} onEdit={handleEdit} onDelete={handleDeactivate} />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4">
                <Paginator pagination={pagination} limit={12} containerClass="text-center" />
              </div>
            </>
          ) : (
            /* Loading Spinner */
            <CardGridSkeleton count={6} label="Loading clients…" />
          )}

          <SuccessModal id="clientSuccessModal" />
          <ErrorModal id="clientErrorModal" />
        </section>
      </div>

      {/* Client Detail View Modal */}
      <ClientDetailModal loading={detailLoading} detail={detail} />

      {/* Client Delete Confirmation Modal */}
      <ClientDeleteModal header={deleteHeader} clientName={deleteClientName} clientId={confirmedClientId} onConfirm={handleClientRemove} />

      {/* Reusable Client Create/Edit Modal (also included from project.html) */}
      <ClientFormModal />
    </>
  );
}
