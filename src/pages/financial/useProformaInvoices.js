// The Proforma Invoice half of the Financial page (see useInvoices.js for what it returns).

import { useState } from 'react';
import api from '../../api/client';
import { toDateInputValue, toNumber } from './financialUtils';
import { useInvoices } from './useInvoices';

const METHODS = {
  getList: 'proformaInvoice.getList',
  getStats: 'proformaInvoice.getStats',
  getById: 'proformaInvoice.getById',
  create: 'proformaInvoice.create',
  update: 'proformaInvoice.update',
  remove: 'proformaInvoice.delete'
};

const TEXTS = {
  listError: 'Failed to load invoices',
  loadError: 'Failed to load invoice',
  createTitle: 'Create Proforma Invoice',
  editTitle: 'Edit Invoice - ',
  createError: 'Failed to create invoice',
  created: 'Invoice created: ',
  updateError: 'Failed to update invoice',
  updated: 'Invoice updated successfully',
  deleteConfirm: 'Are you sure you want to delete invoice ',
  deleted: 'Invoice deleted'
};

const emptyForm = () => ({
  editId: '',
  clientId: '',
  validUntil: '',
  notes: '',
  discount: 0,
  taxPercent: 0
});

const formFromInvoice = (inv) => ({
  editId: inv._id,
  clientId: inv.clientId || '',
  validUntil: toDateInputValue(inv.validUntil),
  notes: inv.notes || '',
  discount: inv.discount || 0,
  taxPercent: inv.taxPercent || 0
});

const buildData = (form, items, status) => ({
  clientId: form.clientId,
  items,
  notes: form.notes,
  validUntil: form.validUntil || null,
  discount: toNumber(form.discount),
  tax: toNumber(form.taxPercent),
  status
});

export function useProformaInvoices() {
  const [clients, setClients] = useState([]);

  const loadClients = () => {
    api.call('clients.list', (err, result) => {
      if (!err && result) {
        setClients(result);
      }
    });
  };

  const validate = (form) => {
    // The client of an old invoice may no longer be in the dropdown: nothing is selected then.
    const isClientSelected = clients.some((client) => client._id === form.clientId);
    return isClientSelected ? null : 'Please select a client';
  };

  const invoices = useInvoices({
    methods: METHODS,
    idPrefix: 'invoice',
    viewModalId: 'invoiceViewModal',
    texts: TEXTS,
    emptyForm,
    formFromInvoice,
    validate,
    buildData
  });

  return { ...invoices, clients, loadClients };
}
