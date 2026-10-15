import { useEffect } from 'react';
import { initializeSelect2 } from '../../lib/customFunctions';
import InvoiceItemsEditor from './InvoiceItemsEditor';
import InvoiceTotalsEditor from './InvoiceTotalsEditor';
import { destroySelect2 } from '../../lib/destroySelect2';

/**
 * The frame of a Create/Edit invoice modal. The fields at the top (client or vendor, dates, status)
 * are different for each kind of invoice and are given as children.
 *
 *   <InvoiceFormModal idPrefix="invoice" saveButtonId="btnSaveInvoice" itemRowClass="invoice-item-row"
 *                     itemClassPrefix="" addItemButtonId="btnAddItem" invoices={proforma}> ...fields... </InvoiceFormModal>
 *
 * idPrefix "invoice" gives #invoiceFormModal, #invoiceFormTitle, #invoiceEditId, #invoiceStatus (select2).
 * `invoices` comes from useProformaInvoices() / usePurchaseInvoices().
 */
export default function InvoiceFormModal({ idPrefix, saveButtonId, itemRowClass, itemClassPrefix, addItemButtonId, invoices, children }) {
  // Initialize select2 on the status dropdown of the form
  useEffect(() => {
    initializeSelect2([{ id: idPrefix + 'Status', placeholder: 'Select Status' }]);
    return () => destroySelect2('#' + idPrefix + 'Status');
  }, []);

  return (
    <div className="modal fade" id={idPrefix + 'FormModal'} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-xl" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id={idPrefix + 'FormTitle'}>{invoices.formTitle}</h5>
            <button type="button" className="btn-close" data-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <input type="hidden" id={idPrefix + 'EditId'} value={invoices.form.editId} />

            <div className="row mb-3">
              {children}
            </div>

            {/* Line Items */}
            <InvoiceItemsEditor lineItems={invoices.lineItems} idPrefix={idPrefix} rowClass={itemRowClass}
              classPrefix={itemClassPrefix} addButtonId={addItemButtonId} />

            {/* Totals */}
            <InvoiceTotalsEditor idPrefix={idPrefix} rows={invoices.lineItems.rows} form={invoices.form} onChange={invoices.changeForm} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" className="btn btn-primary" id={saveButtonId} disabled={invoices.isSaving} onClick={invoices.save}>
              {invoices.isSaving ? (
                <><i className="bx bx-loader-alt bx-spin me-1"></i>Saving...</>
              ) : (
                <><i className="bx bx-check me-1"></i>Save Invoice</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The status dropdown at the top of an invoice form (#invoiceStatus / #piStatus). */
export function InvoiceStatusSelect({ id, statuses }) {
  return (
    <select className="form-select" id={id} style={{ width: '100%' }}>
      {statuses.map((status) => (
        <option value={status} key={status}>{status}</option>
      ))}
    </select>
  );
}
