import { useAuth } from '../../auth/AuthContext';
import { formatCurrency, formatDate, PURCHASE_STATUSES, PURCHASE_STATUS_COLORS } from './financialUtils';
import InvoiceFilters from './InvoiceFilters';
import InvoiceListCard from './InvoiceListCard';
import InvoiceRowActions from './InvoiceRowActions';
import InvoiceStatCards from './InvoiceStatCards';
import InvoiceStatusBadge from './InvoiceStatusBadge';

const COLUMNS = ['Invoice No.', 'Vendor', 'Vendor Inv. No.', 'Invoice Date', 'Due Date', 'Items', 'Amount', 'Status', 'Actions'];

/** PURCHASE INVOICE TAB. `purchase` comes from usePurchaseInvoices(). */
export default function PurchaseInvoiceTab({ purchase }) {
  const { userCan } = useAuth();
  const list = purchase.list;

  return (
    <div className={'tab-pane fade' + (userCan('financial_view') ? '' : ' show active')} id="tabPurchaseInvoice" role="tabpanel">

      {/* Create Button */}
      <div className="d-flex justify-content-end mb-3">
        {userCan('purchaseCreate') && (
          <button className="btn btn-primary" id="btnCreatePurchaseInvoice" onClick={purchase.openCreate}>
            <i className="bx bx-plus me-1"></i>Create Purchase Invoice
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <InvoiceStatCards idPrefix="piStat" stats={list.stats} />

      {/* Filters */}
      <InvoiceFilters list={list} searchId="piSearch" searchPlaceholder="Search by invoice no., vendor..."
        statusId="piStatusFilter" statuses={PURCHASE_STATUSES} resetId="btnPiResetFilters" />

      {/* Purchase Invoice List Table */}
      <InvoiceListCard idPrefix="pi" list={list} columns={COLUMNS} emptyMessage="No purchase invoices found">
        {list.invoices.map((inv) => (
          <tr key={inv._id}>
            <td><strong style={{ fontSize: '13px' }}>{inv.invoiceNumber}</strong></td>
            <td style={{ fontSize: '13px' }}>{inv.vendorName || 'N/A'}</td>
            <td style={{ fontSize: '12px' }}>{inv.vendorInvoiceNumber || '-'}</td>
            <td style={{ fontSize: '12px' }}>{formatDate(inv.invoiceDate)}</td>
            <td style={{ fontSize: '12px' }}>{formatDate(inv.dueDate)}</td>
            <td style={{ fontSize: '13px' }}>{inv.items ? inv.items.length : 0}</td>
            <td style={{ fontSize: '13px', fontWeight: 600 }}>{formatCurrency(inv.grandTotal)}</td>
            <td><InvoiceStatusBadge status={inv.status} colors={PURCHASE_STATUS_COLORS} /></td>
            <InvoiceRowActions invoice={inv} classPrefix="pi" onView={purchase.view} onEdit={purchase.openEdit} onDelete={purchase.remove} />
          </tr>
        ))}
      </InvoiceListCard>

    </div>
  );
}
