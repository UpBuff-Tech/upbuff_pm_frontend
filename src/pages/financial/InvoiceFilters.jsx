import { useEffect } from 'react';
import { initializeSelect2 } from '../../lib/customFunctions';
import { destroySelect2 } from '../../lib/destroySelect2';

/**
 * Filters of a tab: search box, status dropdown (select2) and the Reset button.
 *   <InvoiceFilters list={list} searchId="invoiceSearch" searchPlaceholder="Search by invoice no. or client..."
 *                   statusId="invoiceStatusFilter" statuses={PROFORMA_STATUSES} resetId="btnResetFilters" />
 * `list` comes from useInvoiceList().
 */
export default function InvoiceFilters({ list, searchId, searchPlaceholder, statusId, statuses, resetId }) {
  // Initialize select2 on the status dropdown. select2 announces a choice through jQuery only.
  useEffect(() => {
    initializeSelect2([{ id: statusId, placeholder: 'All Status' }]);

    const select = $(list.statusSelect.current);
    const onStatusChange = () => list.loadList();
    select.on('change', onStatusChange);

    return () => {
      select.off('change', onStatusChange);
      destroySelect2(select);
    };
  }, []);

  return (
    <div className="card mb-4">
      <div className="card-body py-2">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <input type="text" className="form-control form-control-sm" id={searchId} placeholder={searchPlaceholder}
            style={{ width: '250px' }} ref={list.searchInput} onChange={() => list.loadList()} />
          <div style={{ width: '180px' }}>
            <select className="form-select form-select-sm" id={statusId} style={{ width: '100%' }} ref={list.statusSelect}>
              <option value="">All Status</option>
              {statuses.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-sm btn-outline-secondary" id={resetId} onClick={list.resetFilters}>
            <i className="bx bx-reset me-1"></i>Reset
          </button>
        </div>
      </div>
    </div>
  );
}
