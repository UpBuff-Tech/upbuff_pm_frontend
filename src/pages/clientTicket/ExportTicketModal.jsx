/**
 * Export Tickets Modal (#exportTicketModal) of the client ticket page.
 *
 *   <ExportTicketModal allTickets={allTickets} />
 *
 * The page opens it with $('#exportTicketModal').modal('show') when no ticket is ticked in the list.
 */
import { useEffect, useState } from 'react';
import { destroySelect2, exportTicketsToExcel, filterTicketsByDateRange } from './utils';

export default function ExportTicketModal({ allTickets }) {
  // The "Select Tickets" dropdown is only shown for the range "Selected Tickets".
  const [showTicketSelect, setShowTicketSelect] = useState(false);

  useEffect(() => {
    const modal = $('#exportTicketModal');
    const rangeSelect = $('#exportRangeSelect');
    const ticketSelect = $('#exportTicketSelect');

    // Every time the modal opens: range "All Tickets", no ticket chosen, fresh select2 dropdowns.
    const onShow = () => {
      setShowTicketSelect(false);

      destroySelect2(rangeSelect);
      rangeSelect.val('all').select2({
        placeholder: 'Select export range',
        allowClear: false,
        width: '100%',
        dropdownParent: modal
      });

      destroySelect2(ticketSelect);
      ticketSelect.val(null).select2({
        multiple: true,
        placeholder: 'Select tickets to export...',
        allowClear: true,
        width: '100%',
        dropdownParent: modal
      });
    };

    const onHidden = () => {
      destroySelect2(rangeSelect);
      destroySelect2(ticketSelect);
    };

    // select2 announces a choice through jQuery only.
    const onRangeChange = (event) => {
      setShowTicketSelect(event.currentTarget.value === 'selected');
    };

    modal.on('show.bs.modal', onShow);
    modal.on('hidden.bs.modal', onHidden);
    rangeSelect.on('change', onRangeChange);
    return () => {
      modal.off('show.bs.modal', onShow);
      modal.off('hidden.bs.modal', onHidden);
      rangeSelect.off('change', onRangeChange);
    };
  }, []);

  const handleConfirmExport = (event) => {
    event.preventDefault();
    const range = $('#exportRangeSelect').val();
    let toExport;

    if (range === 'selected') {
      const selectedIds = $('#exportTicketSelect').val() || [];
      if (!selectedIds.length) {
        toastr.warning('Please select at least one ticket');
        return;
      }
      toExport = allTickets.filter(t => selectedIds.includes(t._id));
    } else {
      toExport = filterTicketsByDateRange(allTickets, range);
    }

    if (!toExport.length) {
      toastr.warning('No tickets found for the selected range');
      return;
    }

    exportTicketsToExcel(toExport);
    $('#exportTicketModal').modal('hide');
  };

  return (
    <div className="modal fade" id="exportTicketModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bx bx-export me-2"></i>Export Tickets to Excel
            </h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
              <i className="bx bx-info-circle flex-shrink-0"></i>
              <span>You can also select specific tickets directly from the ticket list using the checkboxes, then click <strong>Export Excel</strong> to export them instantly.</span>
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold" htmlFor="exportRangeSelect">Export Range</label>
              <select className="form-select" id="exportRangeSelect">
                <option value="all">All Tickets</option>
                <option value="this_month">This Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="selected">Selected Tickets</option>
              </select>
            </div>
            <div className={'mb-3' + (showTicketSelect ? '' : ' d-none')} id="exportTicketSelectWrap">
              <label className="form-label fw-bold" htmlFor="exportTicketSelect">Select Tickets</label>
              <select className="form-select" id="exportTicketSelect" multiple>
                {allTickets.map((ticket) => (
                  <option key={ticket._id} value={ticket._id}>{`${ticket.ticketId} - ${(ticket.subject || '').substring(0, 50)}`}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-success" id="confirmExportBtn" onClick={handleConfirmExport}>
              <i className="bx bx-download me-1"></i>Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
