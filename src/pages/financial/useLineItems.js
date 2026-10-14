// The rows of the "Line Items" table of an invoice form.

import { useState } from 'react';
import { newItemRow } from './financialUtils';

export function useLineItems() {
  const [rows, setRows] = useState([]);

  /** Start again with one empty row. */
  const resetRows = () => setRows([newItemRow()]);

  /** Show the items of a saved invoice (one empty row when it has none). */
  const showItems = (items) => {
    if (items && items.length > 0) {
      setRows(items.map((item) => newItemRow(item)));
    } else {
      setRows([newItemRow()]);
    }
  };

  const addRow = () => setRows((old) => [...old, newItemRow()]);

  const removeRow = (key) => setRows((old) => old.filter((row) => row.key !== key));

  const changeRow = (key, field, value) => {
    setRows((old) => old.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  };

  return { rows, resetRows, showItems, addRow, removeRow, changeRow };
}
