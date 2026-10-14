import { useAuth } from '../../auth/AuthContext';
import { formatCurrency, formatDate, PROFORMA_STATUSES, PROFORMA_STATUS_COLORS } from './financialUtils';
import InvoiceFilters from './InvoiceFilters';
import InvoiceListCard from './InvoiceListCard';
import InvoiceRowActions from './InvoiceRowActions';
import InvoiceStatCards from './InvoiceStatCards';
import InvoiceStatusBadge from './InvoiceStatusBadge';

const COLUMNS = ['Invoice No.', 'Client', 'Date', 'Valid Until', 'Items', 'Amount', 'Status', 'Actions'];

/** PROFORMA INVOICE TAB. `proforma` comes from useProformaInvoices(). */
export default function ProformaInvoiceTab({ proforma }) {
  const { userCan } = useAuth();
  const list = proforma.list;

  return (
    <div className="tab-pane fade show active" id="tabProformaInvoice" role="tabpanel">

      {/* Create Button */}
      <div className="d-flex justify-content-end mb-3">
        {userCan('financial_create') && (
          <button className="btn btn-primary" id="btnCreateInvoice" onClick={proforma.openCreate}>
            <i className="bx bx-plus me-1"></i>Create Proforma Invoice
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <InvoiceStatCards idPrefix="stat" stats={list.stats} />

      {/* Filters */}
      <InvoiceFilters list={list} searchId="invoiceSearch" searchPlaceholder="Search by invoice no. or client..."
        statusId="invoiceStatusFilter" statuses={PROFORMA_STATUSES} resetId="btnResetFilters" />

      {/* Invoice List Table */}
      <InvoiceListCard idPrefix="invoice" list={list} columns={COLUMNS} emptyMessage="No invoices found">
        {list.invoices.map((inv) => (
          <tr key={inv._id}>
            <td><strong style={{ fontSize: '13px' }}>{inv.invoiceNumber}</strong></td>
            <td style={{ fontSize: '13px' }}>{inv.clientName || 'N/A'}</td>
            <td style={{ fontSize: '12px' }}>{formatDate(inv.createdAt)}</td>
            <td style={{ fontSize: '12px' }}>{formatDate(inv.validUntil)}</td>
            <td style={{ fontSize: '13px' }}>{inv.items ? inv.items.length : 0}</td>
            <td style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(inv.grandTotal)}</td>
            <td><InvoiceStatusBadge status={inv.status} colors={PROFORMA_STATUS_COLORS} /></td>
            <InvoiceRowActions invoice={inv} classPrefix="" onView={proforma.view} onEdit={proforma.openEdit} onDelete={proforma.remove} />
          </tr>
        ))}
      </InvoiceListCard>

    </div>
  );
}
