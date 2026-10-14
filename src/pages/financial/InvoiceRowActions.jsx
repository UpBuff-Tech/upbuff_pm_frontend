/**
 * The View / Edit / Delete buttons of a list row.
 *   <InvoiceRowActions invoice={invoice} classPrefix="" ... />      -> .view-invoice .edit-invoice .delete-invoice
 *   <InvoiceRowActions invoice={invoice} classPrefix="pi" ... />    -> .pi-view .pi-edit .pi-delete
 */
export default function InvoiceRowActions({ invoice, classPrefix, onView, onEdit, onDelete }) {
  const buttonClass = (action) => (classPrefix ? classPrefix + '-' + action : action + '-invoice');

  return (
    <td>
      <button className={'btn btn-sm btn-outline-primary ' + buttonClass('view') + ' me-1'} data-id={invoice._id} title="View"
        onClick={() => onView(invoice._id)}>
        <i className="bx bx-show"></i>
      </button>
      <button className={'btn btn-sm btn-outline-info ' + buttonClass('edit') + ' me-1'} data-id={invoice._id} title="Edit"
        onClick={() => onEdit(invoice._id)}>
        <i className="bx bx-edit-alt"></i>
      </button>
      <button className={'btn btn-sm btn-outline-danger ' + buttonClass('delete')} data-id={invoice._id}
        data-number={invoice.invoiceNumber} title="Delete" onClick={() => onDelete(invoice._id, invoice.invoiceNumber)}>
        <i className="bx bx-trash"></i>
      </button>
    </td>
  );
}
