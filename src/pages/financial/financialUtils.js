// Small helpers shared by the Proforma Invoice and Purchase Invoice parts of the Financial page.

export const PROFORMA_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected', 'Cancelled'];
export const PURCHASE_STATUSES = ['Draft', 'Received', 'Verified', 'Approved', 'Rejected', 'Cancelled'];

export const PROFORMA_STATUS_COLORS = {
  Draft: 'bg-warning', Sent: 'bg-info', Approved: 'bg-success', Rejected: 'bg-danger', Cancelled: 'bg-secondary'
};

export const PURCHASE_STATUS_COLORS = {
  Draft: 'bg-warning', Received: 'bg-info', Verified: 'bg-primary',
  Approved: 'bg-success', Rejected: 'bg-danger', Cancelled: 'bg-secondary'
};

export function formatCurrency(amount) {
  return '₹' + (Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** A date as the value of an <input type="date"> ('' for an empty date). */
export function toDateInputValue(date) {
  return date ? new Date(date).toISOString().split('T')[0] : '';
}

/** Choose a value in a select2 dropdown (only the dropdown changes, no "change" event is sent). */
export function setSelect2Value(selector, value) {
  $(selector).val(value).trigger('change.select2');
}

/* ---------------------------------------------------------------- line items */

let nextRowKey = 1;

/** One row of the "Line Items" table of a form: a new empty row, or a row filled from a saved item. */
export function newItemRow(item) {
  return {
    key: nextRowKey++, // only for React, never sent to the server
    description: item ? (item.description || '') : '',
    hsnSac: item ? (item.hsnSac || '') : '',
    quantity: item ? item.quantity : 1,
    unit: item ? (item.unit || 'Nos') : 'Nos',
    unitPrice: item ? item.unitPrice : 0,
    discount: item ? item.discount : 0
  };
}

/** Text typed in a number field -> number (0 when empty or not a number). */
export function toNumber(value) {
  return parseFloat(value) || 0;
}

/** The rows of the "Line Items" table as the items the server expects. */
export function collectItems(rows) {
  return rows.map((row) => ({
    description: row.description,
    hsnSac: row.hsnSac,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    unitPrice: toNumber(row.unitPrice),
    discount: toNumber(row.discount)
  }));
}

export function lineTotal(row) {
  return (toNumber(row.quantity) * toNumber(row.unitPrice)) - toNumber(row.discount);
}

/** Subtotal, tax amount and grand total of a form. */
export function calculateTotals(rows, discount, taxPercentValue) {
  let subtotal = 0;
  rows.forEach((row) => {
    subtotal += lineTotal(row);
  });

  const discountAmount = toNumber(discount);
  const taxPercent = toNumber(taxPercentValue);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxPercent) / 100;
  const grandTotal = taxableAmount + taxAmount;

  return { subtotal, taxAmount, grandTotal };
}
