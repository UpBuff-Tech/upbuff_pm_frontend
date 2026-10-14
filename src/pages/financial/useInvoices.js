// Everything one kind of invoice (Proforma or Purchase) does on the Financial page: its list and
// stats, its Create/Edit form, its View modal and deleting. The two kinds work the same way; what
// differs (method names, texts, the fields at the top of the form) is passed in.
// See useProformaInvoices.js and usePurchaseInvoices.js.

import { useState } from 'react';
import api from '../../api/client';
import { collectItems, setSelect2Value } from './financialUtils';
import { useInvoiceList } from './useInvoiceList';
import { useLineItems } from './useLineItems';
import { fxConfirm } from '../../components/dialog/dialog';

export function useInvoices({ methods, idPrefix, viewModalId, texts, emptyForm, formFromInvoice, validate, buildData }) {
  const list = useInvoiceList({
    listMethod: methods.getList,
    statsMethod: methods.getStats,
    listErrorMessage: texts.listError
  });
  const lineItems = useLineItems();

  const [form, setForm] = useState(emptyForm);
  const [formTitle, setFormTitle] = useState(texts.createTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [viewedInvoice, setViewedInvoice] = useState(null);

  const formModal = '#' + idPrefix + 'FormModal';
  const statusSelect = '#' + idPrefix + 'Status'; // a select2 dropdown: set and read through jQuery

  /** changeForm({ notes: '...' }) changes one (or more) of the form fields. */
  const changeForm = (changes) => setForm((old) => ({ ...old, ...changes }));

  const resetForm = () => {
    setForm(emptyForm());
    setSelect2Value(statusSelect, 'Draft');
    lineItems.resetRows();
  };

  const openCreate = () => {
    resetForm();
    setFormTitle(texts.createTitle);
    $(formModal).modal('show');
  };

  const openEdit = (id) => {
    api.call(methods.getById, id, (err, inv) => {
      if (err || !inv) {
        toastr.error(texts.loadError);
        return;
      }

      setFormTitle(texts.editTitle + inv.invoiceNumber);
      setForm(formFromInvoice(inv));
      setSelect2Value(statusSelect, inv.status || 'Draft');
      lineItems.showItems(inv.items);

      $(formModal).modal('show');
    });
  };

  const save = () => {
    const invalidMessage = validate(form);
    if (invalidMessage) {
      toastr.error(invalidMessage);
      return;
    }

    const items = collectItems(lineItems.rows);
    if (items.length === 0 || !items[0].description) {
      toastr.error('Please add at least one item with a description');
      return;
    }

    setIsSaving(true);

    const data = buildData(form, items, $(statusSelect).val());
    const editId = form.editId;

    if (editId) {
      api.call(methods.update, editId, data, (err) => {
        setIsSaving(false);
        if (err) {
          toastr.error(err.reason || texts.updateError);
          return;
        }
        toastr.success(texts.updated);
        $(formModal).modal('hide');
        list.reload();
      });
    } else {
      api.call(methods.create, data, (err, result) => {
        setIsSaving(false);
        if (err) {
          toastr.error(err.reason || texts.createError);
          return;
        }
        toastr.success(texts.created + result.invoiceNumber);
        $(formModal).modal('hide');
        list.reload();
      });
    }
  };

  const view = (id) => {
    api.call(methods.getById, id, (err, inv) => {
      if (err || !inv) {
        toastr.error(texts.loadError);
        return;
      }

      setViewedInvoice(inv);
      $('#' + viewModalId).modal('show');
    });
  };

  const remove = async (id, number) => {
    if (await fxConfirm(texts.deleteConfirm + number + '?', { tone: 'danger', title: 'Delete invoice?', confirmText: 'Delete' })) {
      api.call(methods.remove, id, (err) => {
        if (err) {
          toastr.error(err.reason || 'Failed to delete');
          return;
        }
        toastr.success(texts.deleted);
        list.reload();
      });
    }
  };

  return { list, lineItems, form, changeForm, formTitle, isSaving, viewedInvoice, openCreate, openEdit, save, view, remove };
}
