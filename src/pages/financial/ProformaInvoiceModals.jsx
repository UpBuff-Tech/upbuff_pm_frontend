import { formatDate, PROFORMA_STATUSES, PROFORMA_STATUS_COLORS } from './financialUtils';
import InvoiceFormModal, { InvoiceStatusSelect } from './InvoiceFormModal';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import InvoiceViewModal from './InvoiceViewModal';

/** PROFORMA INVOICE MODALS: Create/Edit and View. `proforma` comes from useProformaInvoices(). */
export default function ProformaInvoiceModals({ proforma }) {
  const { form, changeForm, clients } = proforma;
  const inv = proforma.viewedInvoice;

  return (
    <>
      {/* Create/Edit Proforma Invoice Modal */}
      <InvoiceFormModal idPrefix="invoice" saveButtonId="btnSaveInvoice" itemRowClass="invoice-item-row" itemClassPrefix=""
        addItemButtonId="btnAddItem" invoices={proforma}>
        <div className="col-md-4">
          <label className="form-label">Client <span className="text-danger">*</span></label>
          <select className="form-select" id="invoiceClient" required
            value={form.clientId} onChange={(event) => changeForm({ clientId: event.target.value })}>
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option value={client._id} key={client._id}>{client.name} ({client.clientId || ''})</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Valid Until</label>
          <input type="date" className="form-control" id="invoiceValidUntil"
            value={form.validUntil} onChange={(event) => changeForm({ validUntil: event.target.value })} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Status</label>
          <InvoiceStatusSelect id="invoiceStatus" statuses={PROFORMA_STATUSES} />
        </div>
      </InvoiceFormModal>

      {/* View Proforma Invoice Modal */}
      <InvoiceViewModal modalId="invoiceViewModal" titleId="viewInvoiceTitle" bodyId="viewInvoiceBody"
        title={inv ? 'Invoice - ' + inv.invoiceNumber : 'Invoice Details'}
        invoice={inv}
        infoRows={inv ? [
          { label: 'Invoice No:', value: inv.invoiceNumber, bold: true },
          { label: 'Client:', value: inv.clientName, bold: true },
          { label: 'Status:', value: <InvoiceStatusBadge status={inv.status} colors={PROFORMA_STATUS_COLORS} /> }
        ] : []}
        dateRows={inv ? [
          { label: 'Created:', value: formatDate(inv.createdAt) },
          { label: 'Valid Until:', value: formatDate(inv.validUntil) },
          { label: 'Created By:', value: inv.createdByName || 'N/A' }
        ] : []} />
    </>
  );
}
