/**
 * A <select> shown as a select2 dropdown (what the old page did with initializeSelect2()).
 *
 *   <Select2 className="form-select" id="filterStatus" style={{ width: '100%' }}
 *     placeholder="All Status" value={status} onChange={(value) => setStatus(value)}>
 *     <option value="">All Status</option>
 *     <option value="open">Open</option>
 *   </Select2>
 *
 * The options are rendered by React. The chosen value lives in the page's state: `value` is
 * what is selected, `onChange(value)` is called when the user picks (or clears) an option.
 */
import { useEffect, useRef } from 'react';
import { initializeSelect2 } from '../../lib/customFunctions';
import { destroySelect2 } from './ticketHelpers';

export default function Select2({ id, placeholder, value, onChange, children, ...selectProps }) {
  const selectRef = useRef(null);

  // Turn the <select> into a select2 dropdown, and back when it leaves the page
  useEffect(() => {
    const select = $(selectRef.current);
    initializeSelect2([{ id, placeholder }]);
    return () => destroySelect2(select);
  }, [id, placeholder]);

  // After every render: select the option of `value` and let select2 redraw its box.
  // ('change.select2' reaches select2 only, so onChange is not called for it.)
  useEffect(() => {
    $(selectRef.current).val(value == null ? '' : value).trigger('change.select2');
  });

  // select2 announces a choice through jQuery only, so listen there
  useEffect(() => {
    const select = $(selectRef.current);
    const handleChange = () => onChange(select.val() || '');
    select.on('change', handleChange);
    return () => select.off('change', handleChange);
  });

  return (
    <select id={id} ref={selectRef} {...selectProps}>
      {children}
    </select>
  );
}
