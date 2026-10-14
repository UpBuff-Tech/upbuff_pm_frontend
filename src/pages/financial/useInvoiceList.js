// The list, the filters and the stats cards of one tab of the Financial page.
//
//   const list = useInvoiceList({ listMethod: 'proformaInvoice.getList', statsMethod: 'proformaInvoice.getStats',
//                                 listErrorMessage: 'Failed to load invoices' });
//
// The search box and the status dropdown are read at the moment the list is loaded (through
// list.searchInput / list.statusSelect), exactly as the old page read them from the screen.

import { useRef, useState } from 'react';
import api from '../../api/client';
import { setSelect2Value } from './financialUtils';

// The old page had no way to go to another page: it always asked for the first 20 invoices.
const CURRENT_PAGE = 1;
const PER_PAGE = 20;

export function useInvoiceList({ listMethod, statsMethod, listErrorMessage }) {
  const searchInput = useRef(null);
  const statusSelect = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const [stats, setStats] = useState(null);

  const loadList = () => {
    // The tab (and its filters) is not on screen when the user may not see it.
    const search = (searchInput.current && searchInput.current.value) || '';
    const status = (statusSelect.current && statusSelect.current.value) || '';

    setIsLoading(true);

    api.call(listMethod, { search, status, page: CURRENT_PAGE, perPage: PER_PAGE }, (err, result) => {
      setIsLoading(false);

      if (err) {
        toastr.error(err.reason || listErrorMessage);
        return;
      }

      if (!result.data || result.data.length === 0) {
        setInvoices([]);
        setIsEmpty(true);
        return;
      }

      setIsEmpty(false);
      setInvoices(result.data);
    });
  };

  const loadStats = () => {
    api.call(statsMethod, (err, result) => {
      if (!err && result) {
        setStats(result);
      }
    });
  };

  /** After a change: reload the list and the stats cards. */
  const reload = () => {
    loadList();
    loadStats();
  };

  const resetFilters = () => {
    searchInput.current.value = '';
    setSelect2Value(statusSelect.current, '');
    loadList();
  };

  return { searchInput, statusSelect, isLoading, invoices, isEmpty, stats, loadList, loadStats, reload, resetFilters };
}
