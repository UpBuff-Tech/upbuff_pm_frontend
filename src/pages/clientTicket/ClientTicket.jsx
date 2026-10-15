/**
 * Client Ticket Page
 * Allows clients to create and view their support tickets
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import CreateTicketModal from './CreateTicketModal';
import ViewTicketModal from './ViewTicketModal';
import ExportTicketModal from './ExportTicketModal';
import AttachmentPreviewModal from './AttachmentPreviewModal';
import {
  exportTicketsToExcel,
  formatTicketDate,
  formatTicketPriority,
  formatTicketStatus,
  ticketPriorityBadgeClass,
  ticketStatusBadgeClass,
  truncate
} from './utils';
import { TableSkeleton } from '../../components/skeleton/Skeleton';
import { destroySelect2 } from '../../lib/destroySelect2';

/** One of the four statistics cards at the top of the page. */
function StatCard({ label, value, colorClass, icon }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between">
            <div className="content-left">
              <span className="text-muted d-block mb-1">{label}</span>
              <h3 className="mb-0">{value}</h3>
            </div>
            <div className="avatar">
              <span className={`avatar-initial rounded ${colorClass}`}>
                <i className={icon}></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The header checkbox of the list. The checkboxes are plain (uncontrolled) checkboxes, as before:
 * a reloaded list always starts unticked.
 */
function setSelectAllBox(checked, indeterminate) {
  $('#selectAllTickets').prop('indeterminate', indeterminate).prop('checked', checked);
}

export default function ClientTicket() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0
  });

  // The statuses chosen in "Filter by Status" (only used when loading, never shown).
  const statusFilterRef = useRef([]);

  // The View Ticket modal
  const [viewedTicket, setViewedTicket] = useState(null);
  const [newComment, setNewComment] = useState('');
  // The image shown in the Attachment Preview modal: { fileName, blobUrl }
  const [preview, setPreview] = useState(null);

  // Load ticket types filtered to only those in the client's purchased products
  const loadTicketTypes = () => {
    api.call('clients.getMyInfo', (clientError, client) => {
      const purchasedTypeIds = (client && client.productsPurchased)
        ? client.productsPurchased.map(p => p.ticketTypeId).filter(Boolean)
        : [];

      api.call('ticketTypes.getActive', (error, result) => {
        if (!error && result) {
          const filtered = purchasedTypeIds.length > 0
            ? result.filter(t => purchasedTypeIds.includes(t._id))
            : [];
          setTicketTypes(filtered);
        }
      });
    });
  };

  // Load tickets
  const loadTickets = () => {
    setIsLoading(true);

    const options = {};
    const statusFilter = statusFilterRef.current;
    if (statusFilter && statusFilter.length > 0) {
      options.statuses = statusFilter;
    }

    api.call('tickets.getClientTickets', options, (error, result) => {
      setIsLoading(false);
      setIsReady(true);

      if (error) {
        console.error('Error loading tickets:', error);
        toastr.error('Failed to load tickets');
        return;
      }

      if (result && result.data) {
        setTickets(result.data);

        // Calculate stats from all tickets (without filter)
        api.call('tickets.getClientTickets', {}, (err, allResult) => {
          if (!err && allResult && allResult.data) {
            setAllTickets(allResult.data);
            const newStats = {
              total: allResult.data.length,
              open: 0,
              inProgress: 0,
              closed: 0
            };

            allResult.data.forEach(ticket => {
              if (ticket.status === 'open' || ticket.status === 'assigned') {
                newStats.open++;
              } else if (ticket.status === 'in_progress' || ticket.status === 'in_review') {
                newStats.inProgress++;
              } else if (ticket.status === 'closed') {
                newStats.closed++;
              }
            });

            setStats(newStats);
          }
        });
      }
    });
  };

  // Initial load
  useEffect(() => {
    loadTicketTypes();
    loadTickets();
  }, []);

  // Close buttons of the modals
  useEffect(() => {
    $(document).on('click.clientTicket', '[data-dismiss="modal"]', function () {
      $(this).closest('.modal').modal('hide');
    });
    return () => $(document).off('click.clientTicket');
  }, []);

  // The status filter is a select2 dropdown; it exists once the page is ready.
  useEffect(() => {
    if (!isReady) return undefined;

    const select = $('#statusFilter');
    select.select2({
      multiple: true,
      placeholder: 'All Status',
      allowClear: true,
      width: '100%'
    });

    const onChange = () => {
      statusFilterRef.current = select.val() || [];
      setSelectedTicketIds([]);
      setSelectAllBox(false, false);
      loadTickets();
    };

    select.on('change', onChange);
    return () => {
      select.off('change', onChange);
      destroySelect2(select);
    };
  }, [isReady]);

  const hasTickets = tickets.length > 0;

  /* ---------------------------------------------------------------- events */

  const handleCreateTicket = (event) => {
    event.preventDefault();
    // The modal clears its form and files when it is shown (see CreateTicketModal).
    $('#createTicketModal').modal('show');
  };

  const handleSelectAll = (event) => {
    const checked = event.currentTarget.checked;
    const ids = checked ? tickets.map(t => t._id) : [];
    setSelectedTicketIds(ids);
    $('.ticketCheckbox').prop('checked', checked);
  };

  const handleTicketChecked = (event, id) => {
    let selected = selectedTicketIds.slice();
    if (event.currentTarget.checked) {
      if (!selected.includes(id)) selected.push(id);
    } else {
      selected = selected.filter(s => s !== id);
    }
    setSelectedTicketIds(selected);
    const total = tickets.length;
    setSelectAllBox(total > 0 && selected.length === total, selected.length > 0 && selected.length < total);
  };

  const handleExport = (event) => {
    event.preventDefault();
    const selected = selectedTicketIds;
    if (selected.length > 0) {
      const toExport = allTickets.filter(t => selected.includes(t._id));
      exportTicketsToExcel(toExport);
      return;
    }
    // No selection — open modal (it resets itself when it is shown, see ExportTicketModal)
    $('#exportTicketModal').modal('show');
  };

  const handleViewTicket = (event, ticketId) => {
    event.preventDefault();
    const ticket = tickets.find(t => t._id === ticketId);

    if (ticket) {
      setViewedTicket(ticket);
      setNewComment('');
      $('#viewTicketModal').modal('show');
    }
  };

  const showImagePreview = (fileName, blobUrl) => {
    setPreview({ fileName, blobUrl });
    $('#clientAttachmentPreviewModal').modal('show');
  };

  /* ---------------------------------------------------------------- page */

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-1">My Tickets</h4>
                <p className="text-muted mb-0">Create and track your support tickets</p>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-success" id="exportTicketsBtn" onClick={handleExport}>
                  <i className="bx bx-export me-1"></i>Export Excel
                </button>
                <button type="button" className="btn btn-primary" id="createTicketBtn" onClick={handleCreateTicket}>
                  <i className="bx bx-plus me-1"></i>Create Ticket
                </button>
              </div>
            </div>
          </div>
        </div>

        {isReady ? (
          <>
            {/* Statistics Cards */}
            <div className="row g-3 mb-4">
              <StatCard label="Total Tickets" value={stats.total} colorClass="bg-label-primary" icon="bx bx-support" />
              <StatCard label="Open" value={stats.open} colorClass="bg-label-info" icon="bx bx-folder-open" />
              <StatCard label="In Progress" value={stats.inProgress} colorClass="bg-label-warning" icon="bx bx-loader-circle" />
              <StatCard label="Closed" value={stats.closed} colorClass="bg-label-success" icon="bx bx-check-circle" />
            </div>

            {/* Filter */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Filter by Status</label>
                    <select className="form-select" id="statusFilter" multiple>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="in_review">In Review</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tickets List */}
            <div className="card">
              <div className="card-body">
                {isLoading ? (
                  <TableSkeleton rows={6} columns={6} label="Loading tickets…" />
                ) : hasTickets ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input type="checkbox" className="form-check-input" id="selectAllTickets" onChange={handleSelectAll} />
                          </th>
                          <th>Ticket ID</th>
                          <th>Subject</th>
                          <th>Type</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((ticket) => (
                          <tr key={ticket._id}>
                            <td>
                              <input type="checkbox" className="form-check-input ticketCheckbox" data-id={ticket._id}
                                onChange={(event) => handleTicketChecked(event, ticket._id)} />
                            </td>
                            <td>
                              <span className="badge bg-label-secondary">{ticket.ticketId}</span>
                            </td>
                            <td>
                              <strong>{truncate(ticket.subject, 40)}</strong>
                            </td>
                            <td>
                              <span className="badge bg-label-info">{ticket.typeName}</span>
                            </td>
                            <td>
                              <span className={'badge ' + ticketPriorityBadgeClass(ticket.priority)}>{formatTicketPriority(ticket.priority, 'Low')}</span>
                            </td>
                            <td>
                              <span className={'badge ' + ticketStatusBadgeClass(ticket.status)}>{formatTicketStatus(ticket.status)}</span>
                            </td>
                            <td>{ticket.createdAt ? formatTicketDate(ticket.createdAt) : '-'}</td>
                            <td>
                              <button className="btn btn-sm btn-outline-primary viewTicketBtn" data-id={ticket._id}
                                onClick={(event) => handleViewTicket(event, ticket._id)}>
                                <i className="bx bx-show"></i> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="bx bx-support text-muted" style={{ fontSize: '48px' }}></i>
                    <p className="text-muted mt-3">No tickets found</p>
                    <button type="button" className="btn btn-primary" id="createTicketBtnEmpty" onClick={handleCreateTicket}>
                      <i className="bx bx-plus me-1"></i>Create Your First Ticket
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="card">
            <div className="card-body">
              <TableSkeleton rows={6} columns={6} />
            </div>
          </div>
        )}
      </div>

      <CreateTicketModal ticketTypes={ticketTypes} onTicketCreated={loadTickets} />

      <ViewTicketModal ticket={viewedTicket} newComment={newComment} onNewCommentChange={setNewComment}
        onTicketChanged={loadTickets} onPreviewImage={showImagePreview} />

      <ExportTicketModal allTickets={allTickets} />

      <AttachmentPreviewModal preview={preview} />
    </>
  );
}
