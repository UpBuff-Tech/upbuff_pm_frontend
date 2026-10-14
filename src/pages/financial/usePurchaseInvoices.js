// The Purchase Invoice half of the Financial page (see useInvoices.js for what it returns).

import { toDateInputValue, toNumber } from './financialUtils';
import { useInvoices } from './useInvoices';

const METHODS = {
  getList: 'purchaseInvoice.getList',
  getStats: 'purchaseInvoice.getStats',
  getById: 'purchaseInvoice.getById',
  create: 'purchaseInvoice.create',
  update: 'purchaseInvoice.update',
  remove: 'purchaseInvoice.delete'
};

const TEXTS = {
  listError: 'Failed to load purchase invoices',
  loadError: 'Failed to load purchase invoice',
  createTitle: 'Create Purchase Invoice',
  editTitle: 'Edit Purchase Invoice - ',
  createError: 'Failed to create purchase invoice',
  created: 'Purchase invoice created: ',
  updateError: 'Failed to update purchase invoice',
  updated: 'Purchase invoice updated successfully',
  deleteConfirm: 'Are you sure you want to delete purchase invoice ',
  deleted: 'Purchase invoice deleted'
};

const emptyForm = () => ({
  editId: '',
  vendorName: '',
  vendorInvoiceNumber: '',
  invoiceDate: new Date().toISOString().split('T')[0], // today
  dueDate: '',
  notes: '',
  discount: 0,
  taxPercent: 0
});

const formFromInvoice = (inv) => ({
  editId: inv._id,
  vendorName: inv.vendorName || '',
  vendorInvoiceNumber: inv.vendorInvoiceNumber || '',
  invoiceDate: toDateInputValue(inv.invoiceDate),
  dueDate: toDateInputValue(inv.dueDate),
  notes: inv.notes || '',
  discount: inv.discount || 0,
  taxPercent: inv.taxPercent || 0
});

const validate = (form) => {
  if (!form.vendorName || !form.vendorName.trim()) {
    return 'Please enter vendor name';
  }
  return null;
};

const buildData = (form, items, status) => ({
  vendorName: form.vendorName,
  vendorInvoiceNumber: form.vendorInvoiceNumber || '',
  invoiceDate: form.invoiceDate || null,
  dueDate: form.dueDate || null,
  items,
  notes: form.notes,
  discount: toNumber(form.discount),
  tax: toNumber(form.taxPercent),
  status
});

export function usePurchaseInvoices() {
  return useInvoices({
    methods: METHODS,
    idPrefix: 'pi',
    viewModalId: 'piViewModal',
    texts: TEXTS,
    emptyForm,
    formFromInvoice,
    validate,
    buildData
  });
}
