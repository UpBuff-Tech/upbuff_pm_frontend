import { formatCurrency, lineTotal } from './financialUtils';

/**
 * The "Line Items" table of an invoice form, with its "Add Item" button.
 *   <InvoiceItemsEditor lineItems={lineItems} idPrefix="invoice" rowClass="invoice-item-row" classPrefix="" addButtonId="btnAddItem" />
 *   <InvoiceItemsEditor lineItems={lineItems} idPrefix="pi" rowClass="pi-item-row" classPrefix="pi-" addButtonId="btnPiAddItem" />
 * `lineItems` comes from useLineItems().
 */
export default function InvoiceItemsEditor({ lineItems, idPrefix, rowClass, classPrefix, addButtonId }) {
  // A saved item may miss a number: show an empty field then.
  const fieldValue = (value) => (value === undefined || value === null ? '' : value);

  const field = (row, name, type, cssClass, extra) => (
    <input type={type} className={'form-control form-control-sm ' + classPrefix + cssClass} value={fieldValue(row[name])}
      onChange={(event) => lineItems.changeRow(row.key, name, event.target.value)} {...extra} />
  );

  return (
    <>
      <h6 className="fw-bold text-primary mb-2">Line Items</h6>
      <div className="table-responsive mb-3">
        <table className="table table-sm table-bordered" id={idPrefix + 'ItemsTable'}>
          <thead className="table-light">
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '30%' }}>Description <span className="text-danger">*</span></th>
              <th style={{ width: '12%' }}>HSN/SAC</th>
              <th style={{ width: '8%' }}>Qty</th>
              <th style={{ width: '8%' }}>Unit</th>
              <th style={{ width: '12%' }}>Unit Price</th>
              <th style={{ width: '10%' }}>Discount</th>
              <th style={{ width: '12%' }}>Total</th>
              <th style={{ width: '3%' }}></th>
            </tr>
          </thead>
          <tbody id={idPrefix + 'ItemsBody'}>
            {lineItems.rows.map((row, index) => (
              <tr className={rowClass} key={row.key}>
                <td className={'text-center ' + classPrefix + 'item-sl'}>{index + 1}</td>
                <td>{field(row, 'description', 'text', 'item-desc', { required: true })}</td>
                <td>{field(row, 'hsnSac', 'text', 'item-hsn')}</td>
                <td>{field(row, 'quantity', 'number', 'item-qty', { min: '0', step: '1' })}</td>
                <td>{field(row, 'unit', 'text', 'item-unit')}</td>
                <td>{field(row, 'unitPrice', 'number', 'item-price', { min: '0', step: '0.01' })}</td>
                <td>{field(row, 'discount', 'number', 'item-discount', { min: '0', step: '0.01' })}</td>
                <td className={'text-end fw-bold ' + classPrefix + 'item-total'} style={{ verticalAlign: 'middle' }}>
                  {formatCurrency(lineTotal(row))}
                </td>
                <td className="text-center">
                  <button type="button" className={'btn btn-sm btn-outline-danger ' + classPrefix + 'remove-item'} title="Remove"
                    onClick={() => lineItems.removeRow(row.key)}>
                    <i className="bx bx-x"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-sm btn-outline-primary" id={addButtonId} onClick={lineItems.addRow}>
          <i className="bx bx-plus me-1"></i>Add Item
        </button>
      </div>
    </>
  );
}
