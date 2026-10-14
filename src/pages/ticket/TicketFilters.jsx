/**
 * Filters of the ticket page: search box, the five dropdowns, Reset and the export buttons.
 *
 *   onSearchInput(event)          typing in the search box
 *   onFilterChange(field, value)  a dropdown changed; field = clientId | typeId | requestType | status | priority
 *   onReset()                     the Reset button
 *   clientReloadKey               changes when the client dropdown must be emptied (Reset)
 */
import TableExportButtons from '../../components/exportButtons/TableExportButtons';
import { TASK_REQUEST_TYPES } from '../../lib/taskRequestType';
import Select2 from './Select2';
import Select2DataLoad from './Select2DataLoad';

const FULL_WIDTH = { width: '100%' };

export default function TicketFilters({
  searchText, filters, clients, ticketTypes, clientReloadKey, exportConfig,
  onSearchInput, onFilterChange, onReset
}) {
  const activeCount = ['clientId', 'typeId', 'requestType', 'status', 'priority']
    .filter((key) => filters[key]).length + (searchText ? 1 : 0);

  return (
    <div className="card tk-filters">
      <div className="tk-filters-top">
        <div className="tk-search">
          <i className="bx bx-search"></i>
          <input type="text" className="form-control" id="searchTickets" placeholder="Search by ticket ID or subject…"
            value={searchText} onChange={onSearchInput} aria-label="Search tickets" />
        </div>
        <div className="tk-filters-actions">
          {activeCount > 0 && (
            <button type="button" className="btn btn-sm tk-clear reset-filters-btn" id="resetFilters" title="Reset all filters"
              onClick={onReset}>
              <i className="bx bx-x"></i>Clear filters<span className="tk-clear-count">{activeCount}</span>
            </button>
          )}
          <TableExportButtons scope="ticket" size="btn-sm" config={exportConfig} />
        </div>
      </div>

      <div className="tk-filter-grid">
        <div className="tk-filter">
          <span className="tk-filter-label">Client</span>
          {/* Becomes a select2 dropdown once the clients are loaded */}
          <Select2DataLoad className="form-select" id="filterClient" style={FULL_WIDTH}
            items={clients} type="Client" reloadKey={clientReloadKey} skipWhenEmpty
            onChange={(value) => onFilterChange('clientId', value)}>
            <option value="">All Clients</option>
          </Select2DataLoad>
        </div>
        <div className="tk-filter">
          <span className="tk-filter-label">Type</span>
          <Select2 className="form-select" id="filterType" style={FULL_WIDTH} placeholder="All Types"
            value={filters.typeId} onChange={(value) => onFilterChange('typeId', value)}>
            <option value="">All Types</option>
            {ticketTypes.map((type) => (
              <option key={type._id} value={type._id}>{type.name} ({type.code})</option>
            ))}
          </Select2>
        </div>
        <div className="tk-filter">
          <span className="tk-filter-label">Request type</span>
          <Select2 className="form-select" id="filterRequestType" style={FULL_WIDTH} placeholder="All Request Types"
            value={filters.requestType} onChange={(value) => onFilterChange('requestType', value)}>
            <option value="">All Request Types</option>
            {TASK_REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select2>
        </div>
        <div className="tk-filter">
          <span className="tk-filter-label">Status</span>
          <Select2 className="form-select" id="filterStatus" style={FULL_WIDTH} placeholder="All Status"
            value={filters.status} onChange={(value) => onFilterChange('status', value)}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="in_review">In Review</option>
            <option value="closed">Closed</option>
          </Select2>
        </div>
        <div className="tk-filter">
          <span className="tk-filter-label">Priority</span>
          <Select2 className="form-select" id="filterPriority" style={FULL_WIDTH} placeholder="All Priority"
            value={filters.priority} onChange={(value) => onFilterChange('priority', value)}>
            <option value="">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select2>
        </div>
      </div>
    </div>
  );
}
