import { formatCurrency } from './financialUtils';

function StatCard({ label, id, value, background, icon }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between">
            <div>
              <span className="text-muted d-block mb-1">{label}</span>
              <h3 className="mb-0" id={id}>{value}</h3>
            </div>
            <span className="avatar-initial rounded" style={{ backgroundColor: background, padding: '8px' }}>
              <i className={icon} style={{ fontSize: '1.5rem' }}></i>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stats Cards of a tab.
 *   <InvoiceStatCards idPrefix="stat" stats={stats} />      -> #statTotal, #statDraft, #statApproved, #statAmount
 *   <InvoiceStatCards idPrefix="piStat" stats={stats} />    -> #piStatTotal, ...
 * `stats` is null until the server has answered.
 */
export default function InvoiceStatCards({ idPrefix, stats }) {
  return (
    <div className="row g-3 mb-4">
      <StatCard label="Total Invoices" id={idPrefix + 'Total'} value={stats ? stats.total : '0'}
        background="#696cff20" icon="bx bx-file text-primary" />
      <StatCard label="Draft" id={idPrefix + 'Draft'} value={stats ? stats.draft : '0'}
        background="#ffc10720" icon="bx bx-edit text-warning" />
      <StatCard label="Approved" id={idPrefix + 'Approved'} value={stats ? stats.approved : '0'}
        background="#71dd3720" icon="bx bx-check-circle text-success" />
      <StatCard label="Total Amount" id={idPrefix + 'Amount'} value={stats ? formatCurrency(stats.totalAmount) : '₹0'}
        background="#03c3ec20" icon="bx bx-rupee text-info" />
    </div>
  );
}
