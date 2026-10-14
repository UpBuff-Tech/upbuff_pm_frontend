import { calculateTotals, formatCurrency } from './financialUtils';

/**
 * The bottom of an invoice form: notes on the left, the totals on the right.
 *   <InvoiceTotalsEditor idPrefix="invoice" rows={lineItems.rows} form={form} onChange={changeForm} />
 * idPrefix "invoice" gives #invoiceNotes, #invoiceSubtotal, #invoiceDiscount, #invoiceTaxPercent, #invoiceTaxAmount, #invoiceGrandTotal.
 * `form` holds notes, discount and taxPercent; onChange({ notes: '...' }) changes one of them.
 */
export default function InvoiceTotalsEditor({ idPrefix, rows, form, onChange }) {
  const totals = calculateTotals(rows, form.discount, form.taxPercent);

  return (
    <div className="row">
      <div className="col-md-6">
        <label className="form-label">Notes / Remarks</label>
        <textarea className="form-control" id={idPrefix + 'Notes'} rows="3" placeholder="Terms, conditions, notes..."
          value={form.notes} onChange={(event) => onChange({ notes: event.target.value })}></textarea>
      </div>
      <div className="col-md-6">
        <table className="table table-sm table-borderless" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td className="text-muted text-end">Subtotal:</td>
              <td className="text-end fw-bold" id={idPrefix + 'Subtotal'}>{formatCurrency(totals.subtotal)}</td>
            </tr>
            <tr>
              <td className="text-end">
                <label className="text-muted mb-0">Discount (₹):</label>
              </td>
              <td>
                <input type="number" className="form-control form-control-sm text-end" id={idPrefix + 'Discount'} min="0" step="0.01"
                  value={form.discount} onChange={(event) => onChange({ discount: event.target.value })} />
              </td>
            </tr>
            <tr>
              <td className="text-end">
                <label className="text-muted mb-0">Tax (%):</label>
              </td>
              <td>
                <input type="number" className="form-control form-control-sm text-end" id={idPrefix + 'TaxPercent'} min="0" step="0.01"
                  value={form.taxPercent} onChange={(event) => onChange({ taxPercent: event.target.value })} />
              </td>
            </tr>
            <tr>
              <td className="text-muted text-end">Tax Amount:</td>
              <td className="text-end" id={idPrefix + 'TaxAmount'}>{formatCurrency(totals.taxAmount)}</td>
            </tr>
            <tr className="border-top">
              <td className="text-end fw-bold" style={{ fontSize: '16px' }}>Grand Total:</td>
              <td className="text-end fw-bold text-primary" style={{ fontSize: '16px' }} id={idPrefix + 'GrandTotal'}>
                {formatCurrency(totals.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
