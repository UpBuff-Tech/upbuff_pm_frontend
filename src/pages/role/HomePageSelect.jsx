/**
 * @author Nithin
 */

// The "Home Page" dropdown of a role form. It becomes a select2 dropdown as soon as
// `select2Options` is given ({ placeholder, allowClear, dropdownParent: '<selector>', ... }).

import { useEffect, useRef } from 'react';
import { AVAILABLE_PAGES } from './permissions';
import { destroySelect2 } from '../../lib/destroySelect2';

export default function HomePageSelect({ id, className, name, value, onChange, select2Options }) {
  const selectRef = useRef(null);
  const isSelect2 = !!select2Options;

  // Initialize Select2 for home page dropdown
  useEffect(() => {
    if (!select2Options) return undefined;
    const select = $(selectRef.current);
    select.select2({ ...select2Options, dropdownParent: $(select2Options.dropdownParent) });

    // select2 announces a choice through jQuery only
    const onSelect2Change = (event) => onChange(event.target.value);
    select.on('change', onSelect2Change);

    return () => {
      select.off('change', onSelect2Change);
      destroySelect2(select);
    };
  }, [isSelect2]);

  // Let select2 show the value when it was changed from outside (form emptied, role loaded)
  useEffect(() => {
    if (isSelect2) $(selectRef.current).trigger('change.select2');
  }, [value, isSelect2]);

  return (
    <select ref={selectRef} className={className} style={{ width: '100%' }} name={name} id={id} required
      value={value} onChange={(event) => onChange(event.target.value)}>
      <option disabled value="">Select Home Page</option>
      {AVAILABLE_PAGES.map((page) => (
        <option key={page.url} value={page.url}>{page.name}</option>
      ))}
    </select>
  );
}
