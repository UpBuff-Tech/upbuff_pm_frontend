import { formatDate, PURCHASE_STATUSES, PURCHASE_STATUS_COLORS } from './financialUtils';
import InvoiceFormModal, { InvoiceStatusSelect } from './InvoiceFormModal';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import InvoiceViewModal from './InvoiceViewModal';

/** PURCHASE INVOICE MODALS: Create/Edit and View. `purchase` comes from usePurchaseInvoices(). */
export default function PurchaseInvoiceModals({ purchase }) {
  const { form, changeForm } = purchase;
  const inv = purchase.viewedInvoice;

  return (
    <>
      {/* Create/Edit Purchase Invoice Modal */}
      <InvoiceFormModal idPrefix="pi" saveButtonId="btnSavePurchaseInvoice" itemRowClass="pi-item-row" itemClassPrefix="pi-"
        addItemButtonId="btnPiAddItem" invoices={purchase}>
        <div className="col-md-3">
          <label className="form-label">Vendor Name <span className="text-danger">*</span></label>
          <input type="text" className="form-control" id="piVendorName" placeholder="Enter vendor name" required
            value={form.vendorName} onChange={(event) => changeForm({ vendorName: event.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Vendor Invoice No.</label>
          <input type="text" className="form-control" id="piVendorInvoiceNumber" placeholder="Vendor's invoice number"
            value={form.vendorInvoiceNumber} onChange={(event) => changeForm({ vendorInvoiceNumber: event.target.value })} />
        </div>
        <div className="col-md-2">
          <label className="form-label">Invoice Date</label>
          <input type="date" className="form-control" id="piInvoiceDate"
            value={form.invoiceDate} onChange={(event) => changeForm({ invoiceDate: event.target.value })} />
        </div>
        <div className="col-md-2">
          <label className="form-label">Due Date</label>
          <input type="date" className="form-control" id="piDueDate"
            value={form.dueDate} onChange={(event) => changeForm({ dueDate: event.target.value })} />
        </div>
        <div className="col-md-2">
          <label className="form-label">Status</label>
          <InvoiceStatusSelect id="piStatus" statuses={PURCHASE_STATUSES} />
        </div>
      </InvoiceFormModal>

      {/* View Purchase Invoice Modal */}
      <InvoiceViewModal modalId="piViewModal" titleId="viewPiTitle" bodyId="viewPiBody"
        title={inv ? 'Purchase Invoice - ' + inv.invoiceNumber : 'Purchase Invoice Details'}
        invoice={inv}
        infoRows={inv ? [
          { label: 'Invoice No:', value: inv.invoiceNumber, bold: true },
          { label: 'Vendor:', value: inv.vendorName, bold: true },
          { label: 'Vendor Inv. No:', value: inv.vendorInvoiceNumber || '-' },
          { label: 'Status:', value: <InvoiceStatusBadge status={inv.status} colors={PURCHASE_STATUS_COLORS} /> }
        ] : []}
        dateRows={inv ? [
          { label: 'Invoice Date:', value: formatDate(inv.invoiceDate) },
          { label: 'Due Date:', value: formatDate(inv.dueDate) },
          { label: 'Created By:', value: inv.createdByName || 'N/A' },
          { label: 'Created:', value: formatDate(inv.createdAt) }
        ] : []} />
    </>
  );
}
