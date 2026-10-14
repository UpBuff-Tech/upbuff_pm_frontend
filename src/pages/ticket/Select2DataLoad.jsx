/**
 * A <select> filled by select2DataLoad(): a searchable select2 dropdown that shows a long
 * list (clients, users, projects) 20 rows at a time.
 *
 *   <Select2DataLoad className="form-select" id="ticketClient" style={{ width: '100%' }}
 *     items={clients} type="Client" reloadKey={openCount} onChange={(value) => ...}>
 *     <option value="">Select Client</option>
 *   </Select2DataLoad>
 *
 * The dropdown is built again, with nothing selected, whenever `items` or `reloadKey` changes
 * (the old page rebuilt it every time the modal was opened). To start with a row selected,
 * pass `selectedOption={{ id, text }}`. `onChange(value)` is called when the user picks or
 * clears a row. With `skipWhenEmpty` the <select> stays a plain one until there are items.
 */
import { useEffect, useRef } from 'react';
import { select2DataLoad } from '../../lib/select2DataLoad';
import { destroySelect2 } from './ticketHelpers';

export default function Select2DataLoad({
  id, items, type, reloadKey, selectedOption, skipWhenEmpty, onChange, children, ...selectProps
}) {
  const selectRef = useRef(null);

  useEffect(() => {
    if (skipWhenEmpty && (!items || !items.length)) return;
    const select = $(selectRef.current);

    destroySelect2(select);

    // Only the first option ("Select ...") is ours; select2 adds one for every row that gets chosen
    select.find('option:not(:first)').remove();
    if (selectedOption) {
      // Pre-add the selected <option> so select2 can render its text
      select.append(new Option(selectedOption.text, selectedOption.id, true, true));
    }

    select2DataLoad(items || [], type, `#${id}`);
  }, [id, items, type, reloadKey]);

  // select2 announces a choice through jQuery only, so listen there
  useEffect(() => {
    const select = $(selectRef.current);
    const handleChange = () => onChange(select.val() || '');
    select.on('change', handleChange);
    return () => select.off('change', handleChange);
  });

  // Back to a plain <select> when it leaves the page
  useEffect(() => {
    const select = $(selectRef.current);
    return () => destroySelect2(select);
  }, []);

  return (
    <select id={id} ref={selectRef} {...selectProps}>
      {children}
    </select>
  );
}
