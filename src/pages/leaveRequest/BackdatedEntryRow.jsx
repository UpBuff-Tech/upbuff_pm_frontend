import { useRef } from 'react';

/**
 * One row of the backdated entries modal. The fields keep their own values
 * (they are read from the page when the entries are reviewed); `defaults`
 * pre-selects employee / type / day type when the row is added.
 */
export default function BackdatedEntryRow({ rowKey, rowNumber, users, types, maxDate, lockEmployee, defaults = {}, onRemove }) {
  const toDateInput = useRef(null);

  // Keep each row's To date on or after its From date (defaults to a single day)
  const fromDateChanged = (event) => {
    const fromDate = event.currentTarget.value;
    const to = toDateInput.current;
    to.min = fromDate;
    if (!to.value || to.value < fromDate) {
      to.value = fromDate;
    }
  };

  return (
    <tr className="backdated-row" data-key={rowKey}>
      <td className="text-muted">{rowNumber}</td>
      <td>
        {/* Non-approvers only get themselves in the list, pre-selected and locked */}
        <select className="form-select form-select-sm bd-employee" disabled={lockEmployee} defaultValue={defaults.employee}>
          {!lockEmployee && (
            <option value="">Select employee...</option>
          )}
          {users.map((user) => (
            <option key={user._id} value={user._id}>{user.name}</option>
          ))}
        </select>
      </td>
      <td>
        <select className="form-select form-select-sm bd-type" defaultValue={defaults.type}>
          {types.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </td>
      <td>
        <select className="form-select form-select-sm bd-dayType" defaultValue={defaults.dayType}>
          <option value="full">Full Day</option>
          <option value="half">Half Day</option>
        </select>
      </td>
      <td><input type="date" className="form-control form-control-sm bd-from" max={maxDate} onChange={fromDateChanged} /></td>
      <td><input type="date" className="form-control form-control-sm bd-to" max={maxDate} ref={toDateInput} /></td>
      <td><input type="text" className="form-control form-control-sm bd-reason" placeholder="Reason" /></td>
      <td>
        <button type="button" className="btn btn-sm btn-outline-danger bd-remove" title="Remove row" onClick={onRemove}>
          <i className="bx bx-trash"></i>
        </button>
      </td>
    </tr>
  );
}
