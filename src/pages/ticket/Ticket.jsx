/**
 * Ticket Management Page
 */
import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import TableExportModal from '../../components/exportButtons/TableExportModal';
import { describeActiveFilters, TICKET_DATE_FIELDS } from '../../lib/tableExport';
import AttachmentPreviewModal from './AttachmentPreviewModal';
import CommentEmailConfirmModal from './CommentEmailConfirmModal';
import CreateTaskModal from './CreateTaskModal';
import DeleteTicketModal, { openDeleteTicketModal } from './DeleteTicketModal';
import StaffSendEmailModal, { openStaffSendEmailModal } from './StaffSendEmailModal';
import TicketCards from './TicketCards';
import TicketDetailModal, { clearTicketComment, openTicketDetailModal } from './TicketDetailModal';
import TicketFilters from './TicketFilters';
import TicketFormModal, { openCreateTicketModal, openEditTicketModal } from './TicketFormModal';
import TicketPagination from './TicketPagination';
import TicketStats from './TicketStats';
import TicketStyles from './TicketStyles';
import TicketTable from './TicketTable';
import {
  EMPTY_FILTERS,
  EXPORT_COLUMNS,
  EXPORT_PAGE_SIZE,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS
} from './ticketHelpers';

const PER_PAGE = 20;

export default function Ticket() {
  const { userCan } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchText, setSearchText] = useState('');
  const [clientReloadKey, setClientReloadKey] = useState(0);
  const searchTimer = useRef(null);

  // The page and filters the list is showing. loadTickets() is also called later on (after a
  // save in a modal, for example), and from here it always reads the latest ones.
  const listQuery = useRef({ page: 1, filters: EMPTY_FILTERS });

  // View mode (table or card)
  const [viewMode, setViewMode] = useState('table'); // the table opens first; Cards switches

  // Projects (for task creation)
  const [projects, setProjects] = useState([]);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    inReview: 0,
    byStatus: {},
    loaded: false
  });

  // Load tickets
  const loadTickets = () => {
    setIsLoading(true);
    const activeFilters = listQuery.current.filters;

    const options = {
      page: listQuery.current.page,
      perPage: PER_PAGE,
      search: activeFilters.search,
      clientId: activeFilters.clientId,
      typeId: activeFilters.typeId,
      requestType: activeFilters.requestType,
      status: activeFilters.status,
      priority: activeFilters.priority
    };

    api.call('tickets.getList', options, (error, result) => {
      setIsLoading(false);
      if (error) {
        console.error('Error loading tickets:', error);
        toastr.error('Failed to load tickets');
        return;
      }
      setTickets(result.data || []);
      setTotalPages(result.totalPages || 1);
    });
  };

  // Load statistics
  const loadStats = () => {
    api.call('tickets.getStats', {}, (error, result) => {
      if (error) {
        console.error('Error loading stats:', error);
        return;
      }
      if (result) {
        setStats({
          total: result.total || 0,
          open: result.byStatus?.open || 0,
          inProgress: result.byStatus?.in_progress || 0,
          inReview: result.byStatus?.in_review || 0,
          byStatus: result.byStatus || {},
          loaded: true
        });
      }
    });
  };

  const loadTicketsAndStats = () => {
    loadTickets();
    loadStats();
  };

  /** Show another page and/or other filters of the list. */
  const showList = (page, newFilters) => {
    listQuery.current = { page, filters: newFilters };
    setCurrentPage(page);
    setFilters(newFilters);
    loadTickets();
  };

  useEffect(() => {
    // Load clients
    api.call('clients.getList', {}, (error, result) => {
      if (!error && result) {
        setClients(result.data || []);
      }
    });

    // Load ticket types
    api.call('ticketTypes.getActive', (error, result) => {
      if (!error && result) {
        setTicketTypes(result || []);
      }
    });

    // Load assignable users
    api.call('tickets.getAssignableUsers', (error, result) => {
      if (!error && result) {
        setAssignableUsers(result || []);
      }
    });

    // Load projects (for task creation from ticket)
    api.call('project.getList', { page: 1, perPage: 1000 }, (error, result) => {
      if (!error && result) {
        setProjects(result.data || result || []);
      }
    });

    // Initial load
    loadTickets();
    loadStats();

    // Refresh progress bars every 60 seconds for live time tracking
    const progressInterval = setInterval(() => {
      // Draw the cards again (a new array with the same tickets)
      setTickets((currentTickets) => {
        const hasInProgress = currentTickets.some((t) => t.status === 'in_progress' && t.inProgressSince);
        return hasInProgress ? [...currentTickets] : currentTickets;
      });
    }, 60000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(searchTimer.current);
    };
  }, []);

  /* ---------------------------------------------------------------- export */

  /**
   * Every ticket matching the active filters — the list is paginated server-side,
   * so the export refetches instead of exporting only the visible page.
   */
  const getTicketsForExport = () => {
    const options = Object.assign({}, listQuery.current.filters, {
      page: 1,
      perPage: EXPORT_PAGE_SIZE
    });

    return new Promise((resolve, reject) => {
      api.call('tickets.getList', options, (error, result) => {
        if (error) reject(error);
        else resolve((result && result.data) || []);
      });
    });
  };

  /**
   * Label the active filters so the PDF states which slice of tickets it covers.
   */
  const getTicketExportSubtitle = () => {
    const activeFilters = listQuery.current.filters;
    const client = clients.find((c) => c._id === activeFilters.clientId);
    const type = ticketTypes.find((t) => t._id === activeFilters.typeId);

    return describeActiveFilters([
      { label: 'Search', value: activeFilters.search },
      { label: 'Client', value: client ? client.name : '' },
      { label: 'Type', value: type ? type.name : '' },
      { label: 'Request Type', value: activeFilters.requestType },
      { label: 'Status', value: TICKET_STATUS_LABELS[activeFilters.status] || '' },
      { label: 'Priority', value: TICKET_PRIORITY_LABELS[activeFilters.priority] || '' }
    ], 'All Tickets');
  };

  const ticketExport = {
    scope: 'ticket',
    columns: EXPORT_COLUMNS,
    rows: getTicketsForExport,
    fileName: 'tickets',
    sheetName: 'Tickets',
    title: 'Tickets',
    subtitle: getTicketExportSubtitle,
    emptyMessage: 'No tickets to export',
    dateFilter: { fields: TICKET_DATE_FIELDS }
  };

  /* ---------------------------------------------------------------- events */

  // Search input with debounce
  const handleSearchInput = (event) => {
    const input = event.currentTarget;
    setSearchText(input.value);

    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      showList(1, { ...listQuery.current.filters, search: input.value });
    }, 300);
  };

  // Filter changes
  const handleFilterChange = (field, value) => {
    showList(1, { ...listQuery.current.filters, [field]: value });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchText('');
    setClientReloadKey((key) => key + 1); // empties the client dropdown
    showList(1, EMPTY_FILTERS);
  };

  // Pagination
  const handlePageClick = (page) => {
    if (page && page > 0 && page <= totalPages) {
      showList(page, listQuery.current.filters);
    }
  };

  // Create ticket
  const handleCreateTicket = (event) => {
    event.preventDefault();
    openCreateTicketModal();
  };

  // View ticket
  const handleViewTicket = (event, ticketId) => {
    event.preventDefault();
    openTicketDetailModal(ticketId);
  };

  // Edit ticket
  const handleEditTicket = (event, ticketId) => {
    event.preventDefault();
    event.stopPropagation();
    openEditTicketModal(ticketId);
  };

  // Delete ticket
  const handleDeleteTicket = (event, ticketId) => {
    event.preventDefault();
    event.stopPropagation();
    const ticket = tickets.find((t) => t._id === ticketId);

    if (ticket) {
      openDeleteTicketModal(ticket);
    }
  };

  // Open Send Email modal from dropdown row action
  const handleSendEmail = (event, ticketId) => {
    event.preventDefault();
    api.call('tickets.getById', ticketId, (err, ticket) => {
      if (err || !ticket) { toastr.error('Failed to load ticket'); return; }
      openStaffSendEmailModal(ticket);
    });
  };

  // A comment was added from the detail modal: empty the box and show the ticket again
  const handleCommentAdded = (ticketId) => {
    clearTicketComment();
    openTicketDetailModal(ticketId);
  };

  // A task was created from the detail modal: refresh it to show the linked task
  const handleTaskCreated = (ticketId) => {
    openTicketDetailModal(ticketId);
    loadTickets();
  };

  const isTableView = viewMode === 'table';
  const isCardView = viewMode === 'card';

  return (
    <>
      <div className="container-xxl flex-grow-1 container-p-y">
        {/* Page Header */}
        <div className="tk-header">
          <div>
            <h4 className="fw-bold mb-1">Tickets</h4>
            <p className="text-muted mb-0">Track and resolve client support and service requests</p>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <div className="fx-view-toggle" role="group" aria-label="View">
              <button type="button" className={isTableView ? 'active' : ''} id="viewTable" title="Table view"
                aria-pressed={isTableView} onClick={() => setViewMode('table')}>
                <i className="bx bx-list-ul"></i>Table
              </button>
              <button type="button" className={isCardView ? 'active' : ''} id="viewCard" title="Card view"
                aria-pressed={isCardView} onClick={() => setViewMode('card')}>
                <i className="bx bx-grid-alt"></i>Cards
              </button>
            </div>
            {userCan('ticket_create') && (
              <button type="button" className="btn btn-primary" id="createTicket" onClick={handleCreateTicket}>
                <i className="bx bx-plus me-1"></i> Create Ticket
              </button>
            )}
          </div>
        </div>

        {/* Status overview: clicking a status filters the list */}
        <TicketStats stats={stats} activeStatus={filters.status}
          onSelectStatus={(status) => handleFilterChange('status', status)} />

        {/* Filters */}
        <TicketFilters
          searchText={searchText}
          filters={filters}
          clients={clients}
          ticketTypes={ticketTypes}
          clientReloadKey={clientReloadKey}
          exportConfig={ticketExport}
          onSearchInput={handleSearchInput}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {isLoading ? (
          <div className="card tk-loading" role="status" aria-label="Loading tickets">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="tk-skeleton-row" key={i}>
                <span className="tk-sk tk-sk-id"></span>
                <span className="tk-sk tk-sk-subject"></span>
                <span className="tk-sk tk-sk-pill"></span>
                <span className="tk-sk tk-sk-pill"></span>
                <span className="tk-sk tk-sk-avatar"></span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Table View */}
            {isTableView && (
              <TicketTable
                tickets={tickets}
                onView={handleViewTicket}
                onEdit={handleEditTicket}
                onSendEmail={handleSendEmail}
                onDelete={handleDeleteTicket}
              />
            )}

            {/* Card View */}
            {isCardView && <TicketCards tickets={tickets} onView={handleViewTicket} />}

            {/* Pagination */}
            <TicketPagination currentPage={currentPage} totalPages={totalPages} onPageClick={handlePageClick} />
          </>
        )}
      </div>

      {/* Create/Edit Ticket Modal */}
      <TicketFormModal
        clients={clients}
        ticketTypes={ticketTypes}
        assignableUsers={assignableUsers}
        onTicketSaved={loadTicketsAndStats}
      />

      {/* View Ticket Modal */}
      <TicketDetailModal
        currentTicket={currentTicket}
        setCurrentTicket={setCurrentTicket}
        assignableUsers={assignableUsers}
        onStatusChanged={loadTicketsAndStats}
        onAssignmentChanged={loadTickets}
      />

      {/* Create Task from Ticket Modal */}
      <CreateTaskModal projects={projects} assignableUsers={assignableUsers} onTaskCreated={handleTaskCreated} />

      {/* Delete Confirmation Modal */}
      <DeleteTicketModal onTicketDeleted={loadTicketsAndStats} />

      <TicketStyles />

      {/* Send Email Modal */}
      <StaffSendEmailModal currentTicket={currentTicket} />

      {/* Comment Email Confirmation Modal */}
      <CommentEmailConfirmModal onCommentAdded={handleCommentAdded} />

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal />

      <TableExportModal scope="ticket" dateFields="ticket" config={ticketExport} />
    </>
  );
}
